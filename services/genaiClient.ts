import { GoogleGenAI } from '@google/genai';

const resolveApiKey = (): string | null => {
  const rawKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (typeof rawKey !== 'string') return null;

  const trimmed = rawKey.trim();
  if (!trimmed) return null;

  return trimmed;
};

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

export const getGenAIClient = (): GoogleGenAI => {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error(
      'Missing Gemini API key. Set VITE_GEMINI_API_KEY (recommended) or GEMINI_API_KEY in .env.local and restart the dev server.'
    );
  }

  if (cachedClient && cachedApiKey === apiKey) return cachedClient;

  cachedApiKey = apiKey;
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
};
