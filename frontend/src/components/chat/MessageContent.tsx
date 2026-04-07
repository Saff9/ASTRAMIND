import { useMemo } from 'react';

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'code'; lang?: string; code: string };

function parseParts(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const fenceRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;

  for (;;) {
    const match = fenceRegex.exec(content);
    if (!match) break;

    const matchIndex = match.index;
    const before = content.slice(lastIndex, matchIndex);
    if (before) parts.push({ type: 'text', text: before });

    const lang = match[1]?.trim() || undefined;
    const code = match[2] ?? '';
    parts.push({ type: 'code', lang, code });

    lastIndex = matchIndex + match[0].length;
  }

  const tail = content.slice(lastIndex);
  if (tail) parts.push({ type: 'text', text: tail });

  return parts;
}

function renderInlineCode(text: string) {
  const tokens = text.split(/(`[^`]+`)/g).filter(Boolean);
  return tokens.map((t, idx) => {
    const isInline = t.startsWith('`') && t.endsWith('`') && t.length >= 2;
    if (isInline) {
      const inner = t.slice(1, -1);
      return (
        <code
          key={`${idx}-${inner.slice(0, 10)}`}
          className="font-mono text-[13px] px-1 rounded bg-slate-800/60 border border-slate-700/60"
        >
          {inner}
        </code>
      );
    }
    return (
      <span key={idx} className="whitespace-pre-wrap break-words">
        {t}
      </span>
    );
  });
}

export function MessageContent({ content }: { content: string }) {
  const parts = useMemo(() => parseParts(content), [content]);

  return (
    <div className="space-y-2">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return (
            <pre
              key={idx}
              className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-x-auto p-3"
            >
              <div className="flex items-center justify-between mb-2">
                {part.lang ? (
                  <span className="text-xs text-slate-400 font-medium">
                    {part.lang}
                  </span>
                ) : (
                  <span />
                )}
                {/* reserved for future: copy code button */}
                <span />
              </div>
              <code className="font-mono text-[13px] whitespace-pre break-spaces text-slate-100">
                {part.code}
              </code>
            </pre>
          );
        }

        return (
          <div
            key={idx}
            className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words"
          >
            {renderInlineCode(part.text)}
          </div>
        );
      })}
    </div>
  );
}

