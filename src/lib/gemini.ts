import { GoogleGenAI } from '@google/genai';

/**
 * Standard Stable Gemini Models
 */
export const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
export const FALLBACK_MODEL = 'gemini-1.5-flash';
export const DEFAULT_GEMINI_MODEL = PRIMARY_MODEL;

/**
 * Returns the configured Gemini Model name
 */
export function getGeminiModelName(): string {
  return PRIMARY_MODEL;
}

/**
 * Initialize and get GoogleGenAI client instance
 */
export function getGeminiClient(apiKey?: string): GoogleGenAI {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Server chưa thiết lập GEMINI_API_KEY trong môi trường.');
  }
  return new GoogleGenAI({ apiKey: key });
}
