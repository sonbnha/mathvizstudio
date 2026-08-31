import { GoogleGenAI } from '@google/genai';

/**
 * Gemini Model Configuration
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
export const DEFAULT_GEMINI_MODEL = GEMINI_MODEL;
export const SUPPORTED_MODELS = [
  GEMINI_MODEL,
  ...(GEMINI_MODEL !== 'gemini-3.5-flash' ? ['gemini-3.5-flash'] : []),
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
];

/**
 * Returns the configured Gemini Model name
 */
export function getGeminiModelName(): string {
  return GEMINI_MODEL;
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
