"use client";
import { useState } from 'react';

interface ContextManagerProps {
  contextUsage: number; // Percentage 0-100
  onClearContext: () => void;
  onSummarizeContext: () => void;
}

export function ContextManager({ 
  contextUsage, 
  onClearContext, 
  onSummarizeContext 
}: ContextManagerProps) {
  const [isSummarizing, setIsSummarizing] = useState(false);

  return (
    <div className="mb-4 p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-200">
          Context Window Usage
        </h3>
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-300/80">{contextUsage}%</span>
          <button
            onClick={onClearContext}
            className="px-2 py-1 bg-red-500/10 text-red-200 text-xs rounded hover:bg-red-500/15 border border-red-500/20"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-800">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${
            contextUsage > 80
              ? 'bg-red-500'
              : contextUsage > 60
                ? 'bg-yellow-500'
                : 'bg-cyan-500'
          }`}
          style={{ width: `${contextUsage}%` }}
        ></div>
      </div>
      {contextUsage > 80 && (
        <div className="mt-2 flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1 text-yellow-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>High usage - consider summarizing</span>
          </div>
          <button
            onClick={onSummarizeContext}
            disabled={isSummarizing}
            className={`px-2 py-1 bg-cyan-500/10 text-cyan-200 text-xs rounded hover:bg-cyan-500/15 border border-cyan-500/20 ${
              isSummarizing ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {isSummarizing ? 'Summarizing...' : 'Summarize'}
          </button>
        </div>
      )}
    </div>
  );
}