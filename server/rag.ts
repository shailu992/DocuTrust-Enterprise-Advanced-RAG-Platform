import crypto from 'crypto';
import { Chunk } from '../src/types';
import { chunkDb } from './db';

// Simple overlapping sliding window character chunker
export function splitTextIntoChunks(
  text: string,
  pageNumber: number,
  docId: string,
  docName: string,
  userId: string,
  chunkSize: number = 800,
  chunkOverlap: number = 150
): Omit<Chunk, 'id'>[] {
  const chunks: Omit<Chunk, 'id'>[] = [];
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  if (normalizedText.length <= chunkSize) {
    chunks.push({
      docId,
      docName,
      userId,
      pageNumber,
      text: normalizedText
    });
    return chunks;
  }

  let start = 0;
  while (start < normalizedText.length) {
    let end = start + chunkSize;
    if (end > normalizedText.length) {
      end = normalizedText.length;
    }
    
    // Attempt to align chunk boundary on a clean word boundary
    if (end < normalizedText.length) {
      const spaceIdx = normalizedText.lastIndexOf(' ', end);
      if (spaceIdx > start + (chunkSize / 2)) {
        end = spaceIdx;
      }
    }

    const chunkText = normalizedText.slice(start, end).trim();
    if (chunkText.length > 50) { // filter out very short, meaningless fragments
      chunks.push({
        docId,
        docName,
        userId,
        pageNumber,
        text: chunkText
      });
    }

    start = end - chunkOverlap;
    if (start >= normalizedText.length || end === normalizedText.length) {
      break;
    }
  }

  return chunks;
}

// Full Cosine Similarity math calculation
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Local vector search engine using cosine similarity
export function searchSimilarChunks(
  queryEmbedding: number[],
  userId: string,
  topK: number = 5,
  minScore: number = 0.3
): Chunk[] {
  const allUserChunks = chunkDb.listByUser(userId);
  const scoredChunks = allUserChunks.map(chunk => {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      id: chunk.id,
      docId: chunk.docId,
      docName: chunk.docName,
      userId: chunk.userId,
      pageNumber: chunk.pageNumber,
      text: chunk.text,
      score: score
    };
  });

  // Sort by score in descending order and filter by minimum match score threshold
  return scoredChunks
    .filter(chunk => chunk.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
