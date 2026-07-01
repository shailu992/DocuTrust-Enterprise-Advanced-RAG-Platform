import React from 'react';
import { FileText, Layers, RefreshCw, Cpu } from 'lucide-react';
import { DocumentMeta } from '../types';

interface DashboardStatsProps {
  documents: DocumentMeta[];
}

export default function DashboardStats({ documents }: DashboardStatsProps) {
  const totalDocs = documents.length;
  const totalChunks = documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0);
  const totalPages = documents.reduce((acc, d) => acc + (d.totalPages || 0), 0);
  
  // Format total file size securely
  const totalSizeBytes = documents.reduce((acc, d) => acc + (d.size || 0), 0);
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Total Documents Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:border-slate-700/80 transition-all duration-200">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">Vault Files</p>
          <p className="text-2xl font-bold text-white mt-1">{totalDocs}</p>
          <p className="text-xs text-slate-400 mt-1 font-sans">{totalSizeMB} MB Total Size</p>
        </div>
      </div>

      {/* Total Chunks Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:border-slate-700/80 transition-all duration-200">
        <div className="p-3 bg-blue-500/10 border border-blue-500/25 rounded-xl text-blue-400">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">Semantic Chunks</p>
          <p className="text-2xl font-bold text-white mt-1">{totalChunks}</p>
          <p className="text-xs text-slate-400 mt-1 font-sans">Overlapping Sliding Window</p>
        </div>
      </div>

      {/* Pages Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:border-slate-700/80 transition-all duration-200">
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/25 rounded-xl text-indigo-400">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">Total Pages</p>
          <p className="text-2xl font-bold text-white mt-1">{totalPages}</p>
          <p className="text-xs text-slate-400 mt-1 font-sans">768-D Vector Mapping</p>
        </div>
      </div>

      {/* Audit Clearance Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:border-slate-700/80 transition-all duration-200">
        <div className="p-3 bg-teal-500/10 border border-teal-500/25 rounded-xl text-teal-400">
          <RefreshCw className="w-5 h-5 animate-[spin_8s_linear_infinite]" />
        </div>
        <div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">Embedding Model</p>
          <p className="text-md font-bold text-teal-400 mt-2 font-mono">gemini-embedding-2</p>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">100% GROUNDED STATE</p>
        </div>
      </div>
    </div>
  );
}
