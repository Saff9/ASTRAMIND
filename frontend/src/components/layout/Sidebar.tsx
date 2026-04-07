import { useState } from 'react';

interface SidebarProps {
  activeBranch: string;
  onBranchSelect: (branchId: string) => void;
  onNewBranch: () => void;
  className?: string;
  onItemSelected?: () => void;
}

export function Sidebar({ 
  activeBranch, 
  onBranchSelect, 
  onNewBranch,
  className = '',
  onItemSelected,
}: SidebarProps) {
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const branches = [
    { id: 'main', name: 'Main Conversation' },
    { id: 'branch-1', name: 'Alternative Approach' },
    { id: 'branch-2', name: 'Exploring Ideas' }
  ];

  const handleCreateBranch = () => {
    if (newBranchName.trim()) {
      // In a real app, this would call backend to create branch
      onNewBranch();
      setIsCreatingBranch(false);
      setNewBranchName('');
    }
  };

  const selectBranch = (branchId: string) => {
    onBranchSelect(branchId);
    onItemSelected?.();
  };

  return (
    <aside className={`w-72 bg-slate-950/90 border-r border-slate-800 flex flex-col backdrop-blur ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-slate-100">Conversations</h2>
        <button
          onClick={() => setIsCreatingBranch(true)}
          className="px-3 py-1 bg-cyan-500/10 text-cyan-200 text-sm rounded hover:bg-cyan-500/15 border border-cyan-300/20"
        >
          New Branch
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto">
        {branches.map((branch) => (
          <button
            key={branch.id}
            onClick={() => selectBranch(branch.id)}
            className={`flex items-center px-4 py-3 text-left ${
              branch.id === activeBranch 
                ? 'bg-cyan-500/10 text-cyan-200 font-medium border-l-4 border-cyan-500/70'
                : 'text-slate-400 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex-1">{branch.name}</div>
            {branch.id !== 'main' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Delete branch logic
                }}
                className="ml-2 p-1 text-red-400 hover:text-red-200 rounded"
                title="Delete branch"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </button>
        ))}
      </nav>
      
      {isCreatingBranch && (
        <div className="p-4 border-t border-slate-800">
          <input
            type="text"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="Enter branch name..."
            className="w-full px-3 py-2 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/20 text-sm bg-slate-900/30 text-slate-100"
          />
          <div className="mt-2 flex justify-end space-x-2">
            <button
              onClick={() => setIsCreatingBranch(false)}
              className="px-3 py-1 bg-slate-800/50 text-slate-200 text-sm rounded hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBranch}
              className="px-3 py-1 bg-cyan-500/90 text-slate-950 text-sm rounded hover:bg-cyan-500"
              disabled={!newBranchName.trim()}
            >
              Create
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}