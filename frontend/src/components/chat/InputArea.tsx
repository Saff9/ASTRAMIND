import { useState, useRef } from 'react';

interface InputAreaProps {
  onSend: (message: string) => void | Promise<void>;
  isDisabled?: boolean;
  onStop?: () => void;
}

export function InputArea({ onSend, isDisabled = false, onStop }: InputAreaProps) {
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (input.trim()) {
      void Promise.resolve(onSend(input)).finally(() => setInput(''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Handle file uploads for multi-modal support
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      // In a real implementation, you would upload files to backend here
      // For now, we'll simulate and reset after a delay
      setTimeout(() => {
        setIsUploading(false);
        e.target.value = ''; // Reset file input
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 border-t border-slate-800 bg-slate-950/20 backdrop-blur">
      <form onSubmit={handleSubmit} className="flex-1">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDisabled ? 'Generating…' : 'Type a message...'}
            className="w-full min-h-[56px] max-h-52 px-4 py-3 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/20 resize-none text-sm bg-slate-900/40 text-slate-100"
            rows={1}
            disabled={isDisabled || isUploading}
          />
          <div className="absolute bottom-2 right-4 text-[12px] text-slate-400/70">
            Shift+Enter for newline
          </div>
        </div>
      </form>
      
      {/* File upload button */}
      <label
        htmlFor="file-upload"
        className={`relative inline-flex items-center justify-center sm:justify-start px-3 py-2 border border-slate-800 rounded-xl text-sm font-medium min-w-24 ${
          isUploading
            ? 'bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15 border-cyan-300/20'
            : 'bg-slate-900/40 text-slate-100 hover:bg-slate-900/60'
        }`}
      >
        <input
          id="file-upload"
          type="file"
          accept="image/*,.pdf,.csv,.txt,.doc,.docx"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16v4a2 2 0 002 2h8a2 2 0 002-2v-4M11 8l5-5M11 8l-5 5m8 8V4a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2"
          />
        </svg>
        <span className="hidden sm:inline">Upload</span>
        <span className="sm:hidden">File</span>
      </label>
      
      {/* Send button */}
      <button
        onClick={handleSubmit}
        disabled={!input.trim() || isUploading || isDisabled}
        className={`w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-xl ${
          !input.trim() || isUploading || isDisabled
            ? 'bg-slate-800/60 text-slate-400 cursor-not-allowed'
            : 'bg-cyan-500/90 text-slate-950 hover:bg-cyan-500'
        }`}
      >
        {isUploading ? 'Uploading…' : isDisabled ? 'Sending…' : 'Send'}
      </button>

      {onStop && isDisabled && (
        <button
          type="button"
          onClick={onStop}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800/60 text-slate-100 border border-slate-700 hover:bg-slate-800"
        >
          Stop
        </button>
      )}
    </div>
  );
}