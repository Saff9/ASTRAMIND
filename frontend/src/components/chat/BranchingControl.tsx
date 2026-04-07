import { useState } from 'react';

interface BranchingControlProps {
  onBranchSelect: (branchId: string) => void;
  onNewBranch: () => void;
}

export function BranchingControl({ onBranchSelect, onNewBranch }: BranchingControlProps) {
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // Mock branches - in a real app, this would come from backend
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

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Conversation Branches</h3>
        <button
          onClick={() => setIsCreatingBranch(true)}
          className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded hover:bg-blue-100"
        >
          New Branch
        </button>
      </div>

      <div className="space-y-2">
        {branches.map((branch) => (
          <div key={branch.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                {branch.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium">{branch.name}</p>
                <p className="text-sm text-gray-500">{branch.id === 'main' ? 'Primary conversation' : 'Branch'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onBranchSelect(branch.id)}
                className={`px-2 py-1 text-xs rounded ${
                  branch.id === 'main' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                Switch
              </button>
              {branch.id !== 'main' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Delete branch logic would go here
                  }}
                  className="p-1 text-red-500 hover:text-red-700 rounded"
                  title="Delete branch"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isCreatingBranch && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg">
          <input
            type="text"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="Enter branch name..."
            className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsCreatingBranch(false)}
              className="px-3 py-1 bg-gray-200 text-gray-600 text-sm rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBranch}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              disabled={!newBranchName.trim()}
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}