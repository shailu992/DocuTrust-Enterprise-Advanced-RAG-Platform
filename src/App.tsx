import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ShieldAlert, Sparkles, FolderOpen, AlertCircle } from 'lucide-react';

import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import DocumentManager from './components/DocumentManager';
import ChatInterface from './components/ChatInterface';
import DashboardStats from './components/DashboardStats';
import { User, DocumentMeta, ChatSession } from './types';

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('docutrust_token'));
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Business state
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'chat'>('documents');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Verify auth token on initial mount
  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (response.ok) {
          setUser(data.user);
          // Fetch workspace data once user verified
          await fetchWorkspaceData(token);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error('Verify user error:', err);
        setApiError('Unable to connect to the authentication gateway.');
      } finally {
        setAuthLoading(false);
      }
    };

    verifyUser();
  }, [token]);

  const fetchWorkspaceData = async (accessToken: string) => {
    setLoading(true);
    setApiError(null);
    try {
      // 1. Fetch user documents
      const docsRes = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const docsData = await docsRes.json();
      if (docsRes.ok) {
        setDocuments(docsData.documents);
      }

      // 2. Fetch user chat sessions
      const sessionsRes = await fetch('/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const sessionsData = await sessionsRes.json();
      if (sessionsRes.ok) {
        setSessions(sessionsData.sessions);
        if (sessionsData.sessions.length > 0) {
          setActiveSessionId(sessionsData.sessions[0].id);
        }
      }
    } catch (err) {
      setApiError('Failed to fetch workspace data. Connection lost.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (accessToken: string, authenticatedUser: User) => {
    localStorage.setItem('docutrust_token', accessToken);
    setToken(accessToken);
    setUser(authenticatedUser);
    fetchWorkspaceData(accessToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('docutrust_token');
    setToken(null);
    setUser(null);
    setDocuments([]);
    setSessions([]);
    setActiveSessionId(null);
    setActiveTab('documents');
  };

  const handleCreateSession = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `Audit Session ${sessions.length + 1}`
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSessions(prev => [data.session, ...prev]);
        setActiveSessionId(data.session.id);
        setActiveTab('chat'); // Auto pivot user to the consultation tab for direct interaction
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to create chat session');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/chat/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (activeSessionId === id) {
          const remaining = sessions.filter(s => s.id !== id);
          setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    } catch (err) {
      setApiError('Failed to clear session.');
    }
  };

  const handleNewMessage = (updatedSession: ChatSession) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const handleUploadSuccess = () => {
    if (token) {
      fetchWorkspaceData(token);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Render Loader if authentication state is determining
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold mt-4 font-mono uppercase tracking-widest text-slate-400">
          Loading Security Console...
        </p>
      </div>
    );
  }

  // If unauthorized, redirect to elegant Auth login page
  if (!token || !user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen font-sans">
      {/* 1. App Navigation Sidebar */}
      <Sidebar
        user={user}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar / Stats Indicator */}
        <header className="h-16 border-b border-slate-900 bg-slate-900/40 backdrop-blur-sm px-8 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Workspace Dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-emerald-400/90 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              RAG INTERFACE ACTIVE
            </span>
          </div>
        </header>

        {apiError && (
          <div className="mx-8 mt-4 p-4 bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm rounded-xl flex items-start gap-3 shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Workspace Panels */}
        <div className="flex-1 overflow-hidden flex">
          {activeTab === 'documents' ? (
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
              {/* Analytics Summary */}
              <DashboardStats documents={documents} />

              <div className="bg-slate-900/60 border border-slate-850/80 rounded-2xl p-6 shadow-sm mt-2">
                <div className="mb-6">
                  <h2 className="text-lg font-bold tracking-tight text-white font-sans">Document Center</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Upload multiple PDF papers, technical spec sheets, or financial audits. Files are converted into semantic vector arrays in real-time.
                  </p>
                </div>

                <DocumentManager
                  documents={documents}
                  token={token}
                  onUploadSuccess={handleUploadSuccess}
                  onDeleteSuccess={handleUploadSuccess}
                />
              </div>
            </div>
          ) : (
            <ChatInterface
              session={activeSession}
              token={token}
              onNewMessage={handleNewMessage}
              disabled={documents.length === 0}
            />
          )}
        </div>
      </div>
    </div>
  );
}
