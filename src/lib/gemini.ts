import { GoogleGenAI } from '@google/genai';

/**
 * Model Fallback Cascade: Primary 3.6-flash -> 3.5-flash
 */
export const MODEL_CASCADE = [
  process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  'gemini-3.5-flash',
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
  maxRetriesPerModel?: number;
}

/**
 * Executes a generation request through the Model Fallback Cascade with internal retry & jitter
 */
export async function generateContentWithCascade({
  ai,
  contents,
  systemInstruction,
  temperature = 0.1,
  maxOutputTokens,
  maxRetriesPerModel = 2,
}: GenerateContentCascadeOptions) {
  let lastError: any = null;

  for (const modelName of MODEL_CASCADE) {
    for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(
          `[AI Cascade] Đang thử với model: ${modelName} (Lần thử ${attempt + 1}/${maxRetriesPerModel + 1})...`
        );

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
        const errMsg = String(err?.message || '').toLowerCase();

        const isSpike =
          statusCode === 503 ||
          statusCode === 429 ||
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('high demand') ||
          errMsg.includes('overloaded') ||
          errMsg.includes('resource exhausted');

        if (isSpike && attempt < maxRetriesPerModel) {
          const delay = (attempt + 1) * 1200 + Math.random() * 500;
          console.warn(
            `[AI Cascade] Model ${modelName} gặp lỗi tạm thời (${statusCode || 'Spike'}). Thử lại sau ${Math.round(delay)}ms...`
          );
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        console.warn(
          `[AI Cascade] Model ${modelName} gặp lỗi (${statusCode || 'Unknown'}): ${err?.message || ''}. Chuyển model kế tiếp trong chuỗi cascade...`
        );
        break; // break retry loop to move to next model in cascade
      }
    }
  }

  // Nếu thử cả cụm model đều thất bại mới ném lỗi ra ngoài
  throw new Error(
    `Toàn bộ cụm model đều không khả dụng. Chi tiết lỗi cuối: ${lastError?.message || JSON.stringify(lastError)}`
  );
}
