import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, DocumentMeta, Chunk, ChatSession, Message } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'docutrust_enterprise_advanced_rag_platform_secret_998877';

// Ensure data directory and database file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseSchema {
  users: Array<User & { passwordHash: string }>;
  documents: DocumentMeta[];
  chunks: Array<Chunk & { embedding: number[] }>;
  chats: ChatSession[];
}

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial: DatabaseSchema = { users: [], documents: [], chunks: [], chats: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read database, returning empty schema:', err);
    return { users: [], documents: [], chunks: [], chats: [] };
  }
}

function writeDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Failed to write database:', err);
  }
}

// 1. Password Hashing Utility
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function comparePassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const computedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === computedHash;
}

// 2. Base64 URL Encoding for Custom JWT
function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function generateToken(payload: object): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(`${encodedHeader}.${encodedPayload}`);
  const signature = base64UrlEncode(hmac.digest());
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, payload, signature] = parts;
    const hmac = crypto.createHmac('sha256', JWT_SECRET);
    hmac.update(`${header}.${payload}`);
    const expectedSignature = base64UrlEncode(hmac.digest());
    
    if (signature !== expectedSignature) return null;
    
    return JSON.parse(base64UrlDecode(payload));
  } catch (err) {
    return null;
  }
}

// 3. User operations
export const userDb = {
  create: (email: string, passwordPlain: string, name: string): User => {
    const db = readDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('Email already registered');
    }
    const user: User & { passwordHash: string } = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      name,
      passwordHash: hashPassword(passwordPlain)
    };
    db.users.push(user);
    writeDb(db);
    return { id: user.id, email: user.email, name: user.name };
  },

  findByEmail: (email: string) => {
    const db = readDb();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  findById: (id: string): User | null => {
    const db = readDb();
    const user = db.users.find(u => u.id === id);
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name };
  }
};

// 4. Document operations
export const documentDb = {
  create: (doc: DocumentMeta): DocumentMeta => {
    const db = readDb();
    db.documents.push(doc);
    writeDb(db);
    return doc;
  },

  listByUser: (userId: string): DocumentMeta[] => {
    const db = readDb();
    return db.documents.filter(d => d.userId === userId);
  },

  delete: (id: string, userId: string) => {
    const db = readDb();
    db.documents = db.documents.filter(d => !(d.id === id && d.userId === userId));
    db.chunks = db.chunks.filter(c => !(c.docId === id && c.userId === userId));
    writeDb(db);
  }
};

// 5. Chunk operations
export const chunkDb = {
  addMany: (chunks: Array<Chunk & { embedding: number[] }>) => {
    const db = readDb();
    db.chunks.push(...chunks);
    writeDb(db);
  },

  listByUser: (userId: string): Array<Chunk & { embedding: number[] }> => {
    const db = readDb();
    return db.chunks.filter(c => c.userId === userId);
  }
};

// 6. Chat Session operations
export const chatDb = {
  create: (userId: string, title: string): ChatSession => {
    const db = readDb();
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title,
      userId,
      messages: [],
      createdAt: new Date().toISOString()
    };
    db.chats.push(session);
    writeDb(db);
    return session;
  },

  listByUser: (userId: string): ChatSession[] => {
    const db = readDb();
    return db.chats.filter(c => c.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getById: (id: string, userId: string): ChatSession | null => {
    const db = readDb();
    return db.chats.find(c => c.id === id && c.userId === userId) || null;
  },

  addMessage: (sessionId: string, userId: string, message: Message): ChatSession => {
    const db = readDb();
    const sessionIndex = db.chats.findIndex(c => c.id === sessionId && c.userId === userId);
    if (sessionIndex === -1) {
      throw new Error('Chat session not found');
    }
    db.chats[sessionIndex].messages.push(message);
    writeDb(db);
    return db.chats[sessionIndex];
  },

  delete: (id: string, userId: string) => {
    const db = readDb();
    db.chats = db.chats.filter(c => !(c.id === id && c.userId === userId));
    writeDb(db);
  }
};
