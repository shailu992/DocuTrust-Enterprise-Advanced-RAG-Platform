import React from 'react';
import { Shield, Plus, MessageSquare, FileText, LogOut, Trash2, User, ChevronRight, Activity } from 'lucide-react';
import { ChatSession, User as UserType } from '../types';

interface SidebarProps {
  user: UserType | null;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  activeTab: 'documents' | 'chat';
  setActiveTab: (tab: 'documents' | 'chat') => void;
  onLogout: () => void;
}

export default function Sidebar({
  user,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  activeTab,
  setActiveTab,
  onLogout,
}: SidebarProps) {
  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-screen shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shadow-inner">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight text-white font-sans">DocuTrust</h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Advanced RAG Portal</p>
          </div>
        </div>
      </div>

      {/* Main Tab Switches */}
      <div className="p-4 grid grid-cols-2 gap-2 border-b border-slate-800 bg-slate-900/50">
        <button
          onClick={() => setActiveTab('documents')}
          className={`py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition select-none cursor-pointer border ${
            activeTab === 'documents'
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>VAULT</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition select-none cursor-pointer border ${
            activeTab === 'chat'
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>RAG CHAT</span>
        </button>
      </div>

      {/* Dynamic Content Area (Vault vs Rooms) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'documents' ? (
          <div className="space-y-2">
            <h3 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Vault Index Status</h3>
            <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> Integrity Audit
                </span>
                <span className="text-emerald-400 font-bold uppercase">100% SECURE</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Documents are parsed client-side and saved into isolated secure vectors. Direct retrieval guarantees maximum data safety.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Consultations</h3>
              <button
                onClick={onCreateSession}
                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/15 rounded-lg transition cursor-pointer"
                title="Create a new consultation room"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs py-8">
                No active rooms. Click the "+" button to start a new audit.
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-sm group transition-all duration-150 ${
                      activeSessionId === session.id
                        ? 'bg-slate-950 border-emerald-500/35 text-white shadow-sm'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-950/20'
                    }`}
                  >
                    <button
                      onClick={() => onSelectSession(session.id)}
                      className="flex-1 text-left truncate font-sans text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition shrink-0" />
                      <span className="truncate pr-2 font-medium">{session.title}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition rounded hover:bg-slate-900 cursor-pointer"
                      title="Delete consultation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Session Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 rounded-lg shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Loading user...'}</p>
            <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/20 rounded-lg border border-transparent transition cursor-pointer shrink-0"
          title="Sign out of portal"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
