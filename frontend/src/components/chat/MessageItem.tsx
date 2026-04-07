import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageContent } from './MessageContent';

interface MessageItemProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
  };
}

export function MessageItem({ message }: MessageItemProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-3 w-full`}
    >
      <div
        className={`flex flex-col max-w-[95%] sm:max-w-[88%] lg:max-w-[78%] ${
          message.role === 'user' ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`inline-block px-4 py-3 rounded-2xl border shadow-sm ${
            message.role === 'user'
              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-500/60'
              : 'bg-slate-900/50 text-slate-100 border-slate-800/60'
          }`}
        >
          <MessageContent content={message.content} />
          <div
            className={`flex items-center mt-3 text-xs ${
              message.role === 'user' ? 'text-white/80' : 'text-slate-300/80'
            }`}
          >
            <button
              onClick={handleCopy}
              className={`hover:opacity-100 mr-3 ${
                message.role === 'user' ? 'text-white/90' : 'text-slate-200/90'
              }`}
              title="Copy message"
            >
              {isCopied ? 'Copied!' : 'Copy'}
            </button>
            <span>
              {new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}