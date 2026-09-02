import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST /api/validate-key
// Body: { apiKey: string }
// Returns: { success: boolean, message: string }
export async function POST(req: NextRequest) {
  try {
    let body: { apiKey?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // Accept key from body or header (no prefix/length restriction)
    const rawKey =
      (body.apiKey && body.apiKey.trim()) ||
      (req.headers.get('x-gemini-api-key') && req.headers.get('x-gemini-api-key')!.trim()) ||
      null;

    if (!rawKey) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp Gemini API Key để kiểm tra.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: rawKey });

    // Cascade through 3 models — stop at first success
    const testModels = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];
    let lastError: any = null;

    for (const testModel of testModels) {
      try {
        const result = await ai.models.generateContent({
          model: testModel,
          contents: 'Ping test. Reply with OK.',
          config: { maxOutputTokens: 5, temperature: 0 },
        });
        if (result && result.text) {
          return NextResponse.json({
            success: true,
            message: 'API Key hợp lệ và hoạt động tốt!',
          });
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || '').toLowerCase();
        const errStatus = err?.status || err?.statusCode;

        // Key-level errors — no point trying other models
        if (
          errStatus === 400 ||
          errStatus === 403 ||
          errMsg.includes('api_key_invalid') ||
          errMsg.includes('invalid api key') ||
          errMsg.includes('permission_denied') ||
          errMsg.includes('not found')
        ) {
          break;
        }
        // For 404 (model not found) — continue to next model
        // For 429 (quota) — continue to next model
        console.warn(`Validate ping failed on ${testModel}:`, err?.message);
      }
    }

    // Analyse the last error for a user-friendly message
    const errMsg = String(lastError?.message || '').toLowerCase();
    const errStatus = lastError?.status || lastError?.statusCode;

    if (
      errStatus === 429 ||
      errMsg.includes('429') ||
      errMsg.includes('quota') ||
      errMsg.includes('rate_limit') ||
      errMsg.includes('resource_exhausted')
    ) {
      // Key exists but quota exhausted — still a valid key
      return NextResponse.json(
        {
          success: true,
          message: 'API Key hợp lệ nhưng tài khoản đang bị giới hạn hạn mức (Quota Exceeded). Bạn vẫn có thể lưu và sử dụng sau.',
        },
        { status: 200 }
      );
    }

    if (
      errStatus === 400 ||
      errStatus === 403 ||
      errMsg.includes('api_key_invalid') ||
      errMsg.includes('invalid api key') ||
      errMsg.includes('permission_denied')
    ) {
      return NextResponse.json(
        { success: false, message: 'Mã API Key không chính xác hoặc không có quyền truy cập Gemini API.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: lastError?.message || 'Không thể kết nối đến máy chủ Gemini để xác thực Key.',
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('validate-key route error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Lỗi máy chủ không xác định.' },
      { status: 500 }
    );
  }
}
