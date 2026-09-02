import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST /api/validate-key
export async function POST(req: NextRequest) {
  try {
    let body: { apiKey?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const customKey =
      (body.apiKey && body.apiKey.trim().length > 10 ? body.apiKey.trim() : null) ||
      (req.headers.get('x-custom-api-key') && req.headers.get('x-custom-api-key')!.trim().length > 10
        ? req.headers.get('x-custom-api-key')!.trim()
        : null);

    const apiKey = customKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp Gemini API Key hợp lệ để kiểm tra.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Lightweight verification call using gemini-3.6-flash / 3.7-flash / 3.5-flash
    let result: any = null;
    const testModels = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];
    for (const testModel of testModels) {
      try {
        result = await ai.models.generateContent({
          model: testModel,
          contents: 'Ping test. Reply with OK.',
          config: {
            maxOutputTokens: 5,
            temperature: 0,
          },
        });
        if (result && result.text) break;
      } catch (err) {
        console.warn(`Validate key test ping error with ${testModel}:`, err);
      }
    }

    if (result && result.text) {
      return NextResponse.json({
        success: true,
        message: 'Kết nối Gemini API Key thành công!',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Kết nối API Key thành công!',
    });
  } catch (error: any) {
    console.error('Error validating Gemini API key:', error);
    const errorMsg = String(error?.message || '').toLowerCase();
    const errorStatus = error?.status || error?.statusCode;

    if (
      errorStatus === 429 ||
      errorMsg.includes('429') ||
      errorMsg.includes('quota') ||
      errorMsg.includes('rate limit') ||
      errorMsg.includes('resource_exhausted')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'API Key này đã tạm thời hết hạn mức quota hoặc bị giới hạn tốc độ (Rate Limit).',
        },
        { status: 429 }
      );
    }

    if (
      errorStatus === 400 ||
      errorStatus === 403 ||
      errorMsg.includes('api_key_invalid') ||
      errorMsg.includes('invalid api key') ||
      errorMsg.includes('permission_denied')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'API Key không hợp lệ hoặc không có quyền truy cập Gemini API.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Không thể kết nối đến máy chủ Gemini.',
      },
      { status: 500 }
    );
  }
}
