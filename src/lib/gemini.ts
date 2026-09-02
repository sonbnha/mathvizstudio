import { GoogleGenAI } from '@google/genai';

/**
 * Model Fallback Cascade: Primary 3.6 -> 3.5 -> 2.5
 */
export const MODEL_CASCADE = [
  process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
].filter((v, i, a) => a.indexOf(v) === i);

export const DEFAULT_GEMINI_MODEL = MODEL_CASCADE[0];

/**
 * Returns the primary Gemini Model name
 */
export function getGeminiModelName(): string {
  return DEFAULT_GEMINI_MODEL;
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

export interface GenerateContentCascadeOptions {
  ai: GoogleGenAI;
  contents: any[];
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Executes a generation request through the Model Fallback Cascade (3.6 -> 3.5 -> 2.5)
 */
export async function generateContentWithCascade({
  ai,
  contents,
  systemInstruction,
  temperature = 0.1,
  maxOutputTokens,
}: GenerateContentCascadeOptions) {
  let lastError: any = null;

  for (const modelName of MODEL_CASCADE) {
    try {
      console.log(`[AI Cascade] Đang thử với model: ${modelName}...`);

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature,
          ...(maxOutputTokens ? { maxOutputTokens } : {}),
        },
      });

      if (response && response.text) {
        console.log(`[AI Cascade] Thành công với model: ${modelName}`);
        return {
          response,
          usedModel: modelName,
          text: response.text,
        };
      }
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.status || err?.statusCode || err?.response?.status;
      const errMsg = err?.message || '';

      console.warn(
        `[AI Cascade] Model ${modelName} gặp lỗi (${statusCode || 'Unknown'}): ${errMsg}. Tự động chuyển model kế tiếp trong chuỗi cascade...`
      );
    }
  }

  // Nếu thử cả 3 model đều thất bại mới ném lỗi ra ngoài
  throw new Error(
    `Toàn bộ cụm model đều không khả dụng. Chi tiết lỗi cuối: ${lastError?.message || JSON.stringify(lastError)}`
  );
}
