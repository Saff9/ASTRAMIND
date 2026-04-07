"use client";

import { ChatWindow } from '../../components/chat/ChatWindow';
import { Sidebar } from '../../components/layout/Sidebar';
import { useState } from 'react';

export default function ChatPage() {
  const [activeBranch, setActiveBranch] = useState('main');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleBranchSelect = (branchId: string) => {
    setActiveBranch(branchId);
    // In a real app, this would fetch messages for the selected branch
  };

  const handleNewBranch = () => {
    // In a real app, this would create a new branch via backend
    console.log('Creating new branch');
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Desktop Sidebar */}
      <Sidebar
        activeBranch={activeBranch}
        onBranchSelect={handleBranchSelect}
        onNewBranch={handleNewBranch}
        className="hidden md:flex"
      />

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 border-b border-slate-800 bg-slate-950/90 backdrop-blur flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="h-9 px-3 rounded-lg border border-slate-700 text-slate-100 bg-slate-900/50"
        >
          Menu
        </button>
        <div className="text-sm font-semibold text-slate-200">Chat</div>
        <span className="text-xs text-slate-400">{activeBranch}</span>
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <Sidebar
            activeBranch={activeBranch}
            onBranchSelect={handleBranchSelect}
            onNewBranch={handleNewBranch}
            onItemSelected={() => setMobileSidebarOpen(false)}
            className="absolute left-0 top-0 h-full"
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col md:ml-0 pt-14 md:pt-0">
        <ChatWindow />
      </div>
    </div>
  );
}