import { GoogleGenAI } from '@google/genai';

/**
 * Default Gemini Model: gemini-3.6-flash (or configured via GEMINI_MODEL env)
 */
export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

/**
 * Returns the configured Gemini Model name
 */
export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.6-flash';
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
