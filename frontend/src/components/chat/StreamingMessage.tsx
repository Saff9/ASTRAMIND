import { motion } from 'framer-motion';
import { MessageContent } from './MessageContent';

interface StreamingMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
  };
}

export function StreamingMessage({ message }: StreamingMessageProps) {
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
          {message.role === 'assistant' && (
            <div className="flex items-center mt-3 text-xs text-slate-300/80">
              <span className="inline-flex items-center justify-center w-5 h-5 mr-2 rounded-full bg-slate-800/60 border border-slate-700/60">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
              </span>
              <span className="animate-pulse">Thinking...</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}