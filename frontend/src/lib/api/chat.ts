const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export interface ChatRequest {
  prompt: string;
  model?: 'fast' | 'balanced' | 'smart';
  stream?: boolean;
}

export async function sendChatMessage(
  request: ChatRequest,
  onMessageChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: any) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    const res = await fetch(`${API_BASE_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(request),
      signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try {
        const data = await res.json();
        detail = JSON.stringify(data);
      } catch {
        // ignore
      }
      throw new Error(detail);
    }

    if (!res.body) throw new Error('No response body for streaming');

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    const extractContent = (data: string): string | null => {
      if (!data) return null;
      if (data === '[DONE]') return null;

      // Backend chunks are usually OpenAI-compatible SSE `data: {...}` where
      // we need delta.message extraction.
      try {
        const parsed = JSON.parse(data);
        const content =
          parsed?.content ??
          parsed?.choices?.[0]?.delta?.content ??
          parsed?.choices?.[0]?.message?.content ??
          parsed?.choices?.[0]?.text ??
          parsed?.delta?.content;

        if (typeof content === 'string' && content.length > 0) return content;
      } catch {
        // Not JSON => treat as plain text chunk.
      }
      return data;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const data = line.slice('data:'.length).trim();
        if (!data) continue;

        const content = extractContent(data);
        if (content) onMessageChunk(content);
      }
    }

    onComplete();
  } catch (error: any) {
    onError(error);
  }
}