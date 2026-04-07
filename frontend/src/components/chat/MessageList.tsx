import { MessageItem } from './MessageItem';
import { StreamingMessage } from './StreamingMessage';

interface MessageListProps {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
  }>;
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="animate-pulse space-y-3 w-full max-w-xl">
          <div className="h-4 bg-slate-800/60 rounded w-1/2" />
          <div className="h-4 bg-slate-800/60 rounded w-2/3" />
          <div className="h-4 bg-slate-800/60 rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
        <div className="text-slate-300 font-semibold mb-2">
          Ask anything.
        </div>
        <div className="text-slate-400 text-sm max-w-md">
          This UI is styled like DeepSeek/Kimi. Messages will stream from your backend via SSE.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        message.isStreaming ? (
          <StreamingMessage key={message.id} message={message} />
        ) : (
          <MessageItem key={message.id} message={message} />
        )
      ))}
    </div>
  );
}