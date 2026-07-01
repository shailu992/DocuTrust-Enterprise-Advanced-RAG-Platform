import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, FileText, ChevronDown, ChevronUp, Loader2, Info, BookOpen } from 'lucide-react';
import { ChatSession, Message, Citation } from '../types';

interface ChatInterfaceProps {
  session: ChatSession | null;
  token: string | null;
  onNewMessage: (updatedSession: ChatSession) => void;
  disabled: boolean;
}

export default function ChatInterface({ session, token, onNewMessage, disabled }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session || loading) return;

    const query = input;
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/sessions/${session.id}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'RAG consultation query failed');
      }

      onNewMessage(data.session);
    } catch (err: any) {
      setError(err.message || 'Error communicating with vector consultation server');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = (prompt: string) => {
    setInput(prompt);
  };

  if (!session) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-8 text-center border-l border-slate-900">
        <div className="max-w-md space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl shadow-inner mb-2">
            <Sparkles className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white">Initialize Trusted RAG Chat</h2>
          <p className="text-sm text-slate-400">
            Select an active chat room from the sidebar index, or create a new consultation space to start querying your document vault.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-[calc(100vh-64px)] border-l border-slate-900">
      {/* Top Banner / Security Context */}
      <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
          <div>
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">{session.title}</h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">Secure RAG Portal • Grounded Context Active</p>
          </div>
        </div>
      </div>

      {/* Messages Logs Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {session.messages.length === 0 ? (
          <div className="max-w-2xl mx-auto py-12 space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">Ask your documents anything</h3>
              <p className="text-sm text-slate-400">
                Queries will be resolved strictly based on matched passages from your document vault. No hallucinations.
              </p>
            </div>

            {disabled ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span>Upload at least one PDF file first in the Document Center to index context.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleSuggest("What are the key findings or summary of the uploaded document?")}
                  className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-left hover:bg-slate-900/80 transition group"
                >
                  <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition font-sans">
                    Summarize key facts
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Generate a structured conceptual overview.</p>
                </button>

                <button
                  onClick={() => handleSuggest("Are there any specific financial statistics, dates, or numbers mentioned?")}
                  className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-left hover:bg-slate-900/80 transition group"
                >
                  <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition font-sans">
                    Extract numeric statistics
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Locate percentages, quantities, or specific dates.</p>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {session.messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tr-none'
                      : 'bg-slate-900 border border-emerald-950 text-slate-100 rounded-tl-none'
                  }`}
                >
                  {/* Markdown equivalent parser (or standard whitespace-friendly renderer) */}
                  <div className="whitespace-pre-wrap font-sans text-slate-200">{msg.text}</div>

                  {/* Render citations if available */}
                  {msg.sender === 'assistant' && msg.citations && msg.citations.length > 0 && (
                    <CitationsViewer citations={msg.citations} />
                  )}
                </div>
                
                <span className="text-[10px] text-slate-600 font-mono mt-1.5 px-1 uppercase">
                  {msg.sender === 'user' ? 'Client Request' : 'Audited Answer'} •{' '}
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="max-w-3xl mx-auto flex items-start gap-3">
            <div className="bg-slate-900 border border-emerald-950 rounded-2xl rounded-tl-none px-5 py-4 max-w-[80%] shadow-sm">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="text-sm text-slate-400 font-mono uppercase tracking-wide animate-pulse">
                  Querying Embeddings & Reranking Chunks...
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto p-4 bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Footer */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSend} className="flex gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={disabled ? "Please upload documents to index them..." : "Ask questions matching your secure vaults..."}
              disabled={disabled || loading}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl pl-5 pr-14 py-3.5 text-slate-100 placeholder-slate-600 outline-none transition text-sm disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            />
            <button
              type="submit"
              disabled={disabled || loading || !input.trim()}
              className="absolute right-2 top-2 p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg shadow-md transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-slate-500 font-mono text-center mt-2 uppercase tracking-widest">
            STRICT AUDITING GROUNDING MODE ACTIVE • MULTIPLE PDF COMPLIANT
          </p>
        </div>
      </div>
    </div>
  );
}

// Sub-component to visualize citations beautifully
function CitationsViewer({ citations }: { citations: Citation[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 pt-3 border-t border-slate-800/80">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-xs font-mono font-semibold text-emerald-400/90 hover:text-emerald-400 transition uppercase tracking-wider select-none cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Audit Source Citations ({citations.length})</span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2.5">
          {citations.map((cite, index) => (
            <div key={index} className="p-3 bg-slate-950 border border-slate-800/65 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold truncate max-w-[180px] md:max-w-[280px]">
                  {cite.docName}
                </span>
                <span className="text-emerald-500/80 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
                  p. {cite.pageNumber} • Match: {(cite.score * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans italic bg-slate-900/40 p-2 border-l-2 border-slate-800 rounded-r-lg">
                "...{cite.text}..."
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
