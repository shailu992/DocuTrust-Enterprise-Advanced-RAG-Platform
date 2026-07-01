import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

import { 
  userDb, 
  documentDb, 
  chunkDb, 
  chatDb, 
  verifyToken, 
  generateToken 
} from './server/db';
import { splitTextIntoChunks, searchSimilarChunks } from './server/rag';
import { DocumentPageInput, Chunk, Message, Citation } from './src/types';
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;

// Body parser with generous payload size to handle text extraction payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Lazy initializer for Google GenAI to prevent startup crashes when keys are not configured
let _ai: GoogleGenAI | null = null;
function getGenAI() {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please add it via Settings > Secrets.');
    }
    _ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return _ai;
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
  
  req.userId = payload.userId;
  req.userEmail = payload.email;
  next();
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Authentication
app.post('/api/auth/signup', (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Missing name, email, or password' });
      return;
    }
    const user = userDb.create(email, password, name);
    const token = generateToken({ userId: user.id, email: user.email });
    res.status(201).json({ user, token });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Signup failed' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }
    const user = userDb.findByEmail(email);
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const { comparePassword } = require('./server/db');
    const isPasswordValid = comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const token = generateToken({ userId: user.id, email: user.email });
    res.json({ 
      user: { id: user.id, email: user.email, name: user.name }, 
      token 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = userDb.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Document Management
app.get('/api/documents', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const docs = documentDb.listByUser(req.userId!);
    res.json({ documents: docs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/documents/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    documentDb.delete(id, req.userId!);
    res.json({ success: true, message: 'Document and associated vector index deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents/upload', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, size, pages } = req.body as { name: string; size: number; pages: DocumentPageInput[] };
    if (!name || !pages || !pages.length) {
      res.status(400).json({ error: 'No document data provided' });
      return;
    }

    const docId = crypto.randomUUID();
    const userId = req.userId!;

    // 1. Structural semantic chunking of all text
    const allChunksToProcess: Omit<Chunk, 'id'>[] = [];
    for (const page of pages) {
      const pageChunks = splitTextIntoChunks(
        page.text,
        page.pageNumber,
        docId,
        name,
        userId
      );
      allChunksToProcess.push(...pageChunks);
    }

    if (!allChunksToProcess.length) {
      res.status(400).json({ error: 'Failed to extract meaningful content chunks from PDF' });
      return;
    }

    // 2. Generating vector embeddings using Gemini Model `gemini-embedding-2-preview`
    const ai = getGenAI();
    const processedChunks: Array<Chunk & { embedding: number[] }> = [];

    // Process chunk embeddings sequentially (helps bypass rate limits cleanly, with solid reliability)
    for (let i = 0; i < allChunksToProcess.length; i++) {
      const item = allChunksToProcess[i];
      try {
        const embedRes = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: item.text,
        });

        const embeddingValues = embedRes.embeddings?.[0]?.values;
        if (embeddingValues) {
          processedChunks.push({
            id: crypto.randomUUID(),
            ...item,
            embedding: embeddingValues
          });
        }
      } catch (embedErr: any) {
        console.error(`Embedding generation failed for chunk ${i}:`, embedErr);
        // Continue processing other chunks, fallback graceful skip
      }
    }

    if (!processedChunks.length) {
      res.status(500).json({ error: 'AI embedding pipeline returned empty vectors. Ensure API key is configured.' });
      return;
    }

    // 3. Save Chunks into DB
    chunkDb.addMany(processedChunks);

    // 4. Create Document Metadata
    const docMeta = documentDb.create({
      id: docId,
      name,
      size,
      uploadDate: new Date().toISOString(),
      totalPages: pages.length,
      chunkCount: processedChunks.length,
      userId
    });

    res.status(201).json({ 
      success: true, 
      document: docMeta,
      message: `Successfully index and processed ${processedChunks.length} vector chunks.`
    });
  } catch (err: any) {
    console.error('PDF ingestion failure:', err);
    res.status(500).json({ error: err.message || 'PDF processing pipeline failed' });
  }
});

// Chat & RAG Query
app.get('/api/chat/sessions', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessions = chatDb.listByUser(req.userId!);
    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat/sessions', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title } = req.body;
    const session = chatDb.create(req.userId!, title || 'New Consultation');
    res.status(201).json({ session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chat/sessions/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = chatDb.getById(req.params.id, req.userId!);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chat/sessions/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    chatDb.delete(req.params.id, req.userId!);
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Advanced Grounded RAG Query endpoint
app.post('/api/chat/sessions/:id/query', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.id;
    const { query } = req.body;
    const userId = req.userId!;

    if (!query || !query.trim()) {
      res.status(400).json({ error: 'Query prompt cannot be empty' });
      return;
    }

    const session = chatDb.getById(sessionId, userId);
    if (!session) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    // 1. Generate query embedding vector using `gemini-embedding-2-preview`
    const ai = getGenAI();
    let queryEmbedding: number[] = [];
    try {
      const embedRes = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: query,
      });
      const embeddingValues = embedRes.embeddings?.[0]?.values;
      if (embeddingValues) {
        queryEmbedding = embeddingValues;
      }
    } catch (embedErr: any) {
      res.status(500).json({ error: 'Embedding model generation failed: ' + embedErr.message });
      return;
    }

    // 2. Perform Cosine Similarity Vector Search across all user document chunks
    // Fetch top 5 relevant document chunks
    const matches = searchSimilarChunks(queryEmbedding, userId, 6, 0.25);

    // Save user message first
    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };
    chatDb.addMessage(sessionId, userId, userMessage);

    // 3. Setup prompt instructions for Grounded RAG with exact excerpts as context
    let systemInstruction = `You are DocuTrust, an advanced enterprise RAG agent providing secure, audited information based strictly on user documents.
Your task is to answer the query truthfully, relying ONLY on the document excerpts provided below.

CONSTRAINTS:
1. Base your answer strictly on the provided excerpts.
2. If the excerpts do not contain the answer, reply EXACTLY: "I cannot find the answer to this query in the uploaded documents." Do not try to extrapolate or make up an answer.
3. Keep answers concise, factual, and professional.
4. For every factual claim you make, cite the document name and page number at the end of the sentence or paragraph (e.g. [Q4_Financials.pdf, p. 5]).
5. Do NOT refer to "the excerpts provided" or "the text" in your responses. Speak directly and securely.

EXCERPTS:
`;

    if (matches.length > 0) {
      matches.forEach((chunk, index) => {
        systemInstruction += `\n[Excerpt ${index + 1}] Source: "${chunk.docName}", Page: ${chunk.pageNumber}\nContent: ${chunk.text}\n`;
      });
    } else {
      systemInstruction += `\n[No matching reference document chunks found for the user query.]\n`;
    }

    // 4. Submit prompt to Gemini-3.5-flash
    let answerText = '';
    let citations: Citation[] = [];

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.2 // Lower temperature to prevent hallucination, ensuring strict grounding
        }
      });

      answerText = response.text || 'No response returned from RAG generation pipeline.';

      // Format source citations to return alongside response
      citations = matches.map(match => ({
        text: match.text,
        pageNumber: match.pageNumber,
        docName: match.docName,
        score: match.score || 0
      }));

    } catch (aiErr: any) {
      console.error('Gemini RAG Generation Error:', aiErr);
      answerText = `RAG generation failed. Please verify your API Key. Internal error: ${aiErr.message}`;
    }

    // 5. Save and return assistant message containing grounding citations
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      sender: 'assistant',
      text: answerText,
      timestamp: new Date().toISOString(),
      citations: citations.length > 0 ? citations : undefined
    };

    const updatedSession = chatDb.addMessage(sessionId, userId, assistantMessage);
    res.json({ session: updatedSession, reply: assistantMessage });

  } catch (err: any) {
    console.error('Query processing pipeline error:', err);
    res.status(500).json({ error: err.message || 'Error executing grounded query' });
  }
});


// -------------------------------------------------------------
// VITE AND STATIC ASSETS HANDLING
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DocuTrust backend listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
