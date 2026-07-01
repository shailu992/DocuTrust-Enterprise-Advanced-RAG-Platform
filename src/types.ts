export interface User {
  id: string;
  email: string;
  name: string;
}

export interface DocumentMeta {
  id: string;
  name: string;
  size: number;
  uploadDate: string;
  totalPages: number;
  chunkCount: number;
  userId: string;
}

export interface DocumentPageInput {
  pageNumber: number;
  text: string;
}

export interface Chunk {
  id: string;
  docId: string;
  docName: string;
  userId: string;
  pageNumber: number;
  text: string;
  score?: number; // Cosine similarity score
}

export interface Citation {
  text: string;
  pageNumber: number;
  docName: string;
  score: number;
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citations?: Citation[];
}

export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  messages: Message[];
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}
