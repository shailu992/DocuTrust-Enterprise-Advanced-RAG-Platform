import React, { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Eye, ShieldAlert, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { DocumentMeta } from '../types';

interface DocumentManagerProps {
  documents: DocumentMeta[];
  token: string | null;
  onUploadSuccess: () => void;
  onDeleteSuccess: () => void;
}

export default function DocumentManager({ documents, token, onUploadSuccess, onDeleteSuccess }: DocumentManagerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  // Extract PDF content page-by-page client-side and upload text pages directly
  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setErrorText('Only standard PDF (.pdf) documents are accepted for vector indexing');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorText('File exceeds the secure 15MB limit. Please upload smaller documents.');
      return;
    }

    setUploading(true);
    setErrorText(null);
    setStatusText('Reading file binary array...');

    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        // Fetch PDF.js library attached to global window object
        const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
        if (!pdfjsLib) {
          throw new Error('Grounded PDF parser engine is initializing. Please retry in a moment.');
        }

        // Set worker endpoint for thread-isolated parsing
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        setStatusText('Parsing document structure...');
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        const pages: Array<{ pageNumber: number; text: string }> = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          setStatusText(`Extracting textual content page ${pageNum} of ${pdf.numPages}...`);
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Assemble all text components on the page
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');

          pages.push({
            pageNumber: pageNum,
            text: pageText || ''
          });
        }

        if (pages.length === 0) {
          throw new Error('This PDF has no extractable text elements. Scanned images are not supported.');
        }

        setStatusText('Injecting semantic chunk vectors to Gemini-Embedding-2-Preview... (this may take up to a minute)');
        
        // POST parsed text list to backend upload pipeline
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            pages
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Vector injection failed');
        }

        setStatusText('Document indexing complete!');
        onUploadSuccess();
        setTimeout(() => setUploading(false), 1500);

      } catch (err: any) {
        console.error(err);
        setErrorText(err.message || 'Error occurred while processing PDF RAG data');
        setUploading(false);
      }
    };

    fileReader.onerror = () => {
      setErrorText('Failed to read local binary file stream');
      setUploading(false);
    };

    fileReader.readAsArrayBuffer(file);
  };

  const deleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this document and erase all associated vector indexes?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete indexed file');
      }

      onDeleteSuccess();
    } catch (err: any) {
      setErrorText(err.message || 'Deletion failed');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging 
            ? 'border-emerald-500 bg-emerald-500/5 shadow-inner' 
            : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
        } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf"
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-sm font-semibold text-white">{statusText}</p>
            <p className="text-xs text-slate-400 font-mono">SECURE TRANSIT PORTAL ACTIVE</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Click or drag a PDF document here</p>
              <p className="text-xs text-slate-500 mt-1">Accepts standard PDF documents up to 15MB</p>
            </div>
          </div>
        )}
      </div>

      {errorText && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}

      {/* Document Inventory */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">Secure Document Store</h2>
          <span className="text-xs font-mono text-slate-500">{documents.length} Files Indexed</span>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
            <FileText className="w-8 h-8 text-slate-700" />
            <p className="text-sm">No files uploaded yet.</p>
            <p className="text-xs text-slate-600">Documents you upload are processed here to enable instant vector search.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-950/20 transition duration-150">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-emerald-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate max-w-xs md:max-w-md">{doc.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 font-mono">
                      <span>{formatSize(doc.size)}</span>
                      <span>•</span>
                      <span>{doc.totalPages} Pages</span>
                      <span>•</span>
                      <span className="text-emerald-400">{doc.chunkCount} Vector Nodes</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 bg-slate-950 border border-slate-850 hover:border-rose-500/30 rounded-lg transition"
                    title="Delete document index"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
