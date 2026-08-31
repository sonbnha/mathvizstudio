import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { renderStructuredMathToSvg, MathSpec } from '@/lib/svg-generator';

// Helper function to sanitize and extract ONLY valid, clean SVG content
function extractSvgCode(rawText: string): string {
  let clean = rawText.trim();

  // If text is JSON, attempt structured rendering first
  try {
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as MathSpec;
      if (parsed.type) {
        return renderStructuredMathToSvg(parsed);
      }
    }
  } catch (e) {
    // Continue with normal SVG parsing
  }

  // Strip markdown code fences if wrapped in ```xml, ```svg, ```html, etc.
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:xml|svg|html|javascript|js|tsx|jsx|json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  // 1. Trích xuất đúng khối <svg>...</svg>
  const svgMatch = clean.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgMatch) {
    clean = svgMatch[0];
  } else if (!clean.includes('<svg') && (clean.includes('ctx.') || clean.includes('canvas'))) {
    // If JS canvas code was generated, return as-is for canvas execution
    return clean;
  } else {
    clean = clean.replace(/```xml|```svg|```html|```/gi, '').trim();
  }

  // Ensure essential SVG attributes exist so it never collapses or clips
  if (clean.includes('<svg')) {
    if (!clean.includes('xmlns=')) {
      clean = clean.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!clean.includes('viewBox=')) {
      clean = clean.replace(/<svg/i, '<svg viewBox="0 0 800 500"');
    }
    if (!clean.includes('width=')) {
      clean = clean.replace(/<svg/i, '<svg width="100%"');
    }
    if (!clean.includes('height=')) {
      clean = clean.replace(/<svg/i, '<svg height="100%"');
    }
    if (!clean.includes('overflow=')) {
      clean = clean.replace(/<svg/i, '<svg overflow="visible"');
    }
  }

  // 2. Xóa triệt để các thẻ text dài (tiêu đề, lời giải, ghi chú mô tả thừa từ 15 ký tự trở lên)
  clean = clean.replace(/<text[^>]*>([^<]{15,})<\/text>/gi, '');

  return clean.trim();
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { prompt: promptText, imageBase64, mimeType = 'image/jpeg', style, styleMode, gridMode } = body;
    const licenseKey = (req.headers.get('x-license-key') || req.headers.get('X-License-Key') || body.licenseKey || '').trim();

    // 1. Validate prompt/image
    if (!promptText && !imageBase64) {
      return NextResponse.json({ error: 'Vui lòng cung cấp văn bản bài toán hoặc tải lên hình ảnh.' }, { status: 400 });
    }

    // 2. Validate License Key
    if (!licenseKey) {
      return NextResponse.json(
        {
          error: 'MISSING_LICENSE',
          message: 'Vui lòng nhập License Key để tiếp tục sử dụng.',
        },
        { status: 401 }
      );
    }

    const keyRecord = await prisma.licenseKey.findUnique({
      where: { key: licenseKey },
    });

    if (!keyRecord) {
      return NextResponse.json(
        {
          error: 'INVALID_LICENSE',
          message: 'Mã License Key không hợp lệ hoặc không tồn tại trên hệ thống.',
        },
        { status: 401 }
      );
    }

    if (!keyRecord.isActive) {
      return NextResponse.json(
        {
          error: 'LICENSE_DISABLED',
          message: 'Mã License Key của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
        },
        { status: 403 }
      );
    }

    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          error: 'LICENSE_EXPIRED',
          message: 'Mã bản quyền của bạn đã hết hạn sử dụng. Vui lòng gia hạn hoặc liên hệ quản trị viên.',
        },
        { status: 403 }
      );
    }

    if (keyRecord.totalCredits !== -1 && keyRecord.usedCredits >= keyRecord.totalCredits) {
      return NextResponse.json(
        {
          error: 'LICENSE_LIMIT_REACHED',
          message: 'Mã bản quyền của bạn đã sử dụng hết số lượt tạo hình cho phép.',
        },
        { status: 403 }
      );
    }

    // 3. Initialize Gemini Client (Supports BYOK custom user API key or Server GEMINI_API_KEY)
    const customKey = req.headers.get('x-custom-api-key');
    const apiKey =
      customKey && customKey.trim().length > 10
        ? customKey.trim()
        : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'AI_KEY_MISSING',
          message: 'Chưa cấu hình GEMINI_API_KEY trên hệ thống và bạn chưa nhập API Key cá nhân.',
          isAiKeyError: true,
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Bạn là bộ xử lý toán học thông minh (Structured Math Engine).
Nhiệm vụ của bạn: Phân tích bài toán (từ văn bản hoặc ảnh OCR) và trích xuất các tham số hình học toán học dưới dạng JSON THUẦN TÚY.

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC (TUYỆT ĐỐI CHỈ TRẢ VỀ JSON):
{
  "type": "SHADOW" | "LADDER" | "LIGHTHOUSE" | "BUILDING" | "CIRCLE" | "GENERAL_TRIANGLE",
  "points": {
    "A": { "label": "A", "description": "Đỉnh ngọn cây/tháp/thang" },
    "B": { "label": "B", "description": "Chân vuông góc" },
    "C": { "label": "C", "description": "Mút bóng nắng/chân thang/thuyền" }
  },
  "dimensions": {
    "height": "8m",
    "base": "6m",
    "hypotenuse": ""
  },
  "angles": [
    { "vertex": "C", "value": "60°", "position": "elevation" },
    { "vertex": "A", "value": "30°", "position": "depression" }
  ],
  "title": "Mô hình hình học bài toán",
  "style": "${style || 'colorful'}"
}

QUY TẮC PHÂN LOẠI TYPE CHUẨN XÁC:
1. 'SHADOW': Bài toán bóng cây, bóng cột cờ, bóng cọc trên mặt đất tạo bởi tia nắng mặt trời.
2. 'LADDER': Chiếc thang dựa vào bức tường đứng.
3. 'LIGHTHOUSE': Ngọn hải đăng / vách đá quan sát tàu thuyền trên biển (có góc hạ hoặc góc nâng).
4. 'BUILDING': Tòa nhà cao tầng, tháp quan sát người nhìn từ mặt đất.
5. 'CIRCLE': Bài toán đường tròn (O; R), hai tiếp tuyến cắt nhau, dây cung, góc nội tiếp.
6. 'GENERAL_TRIANGLE': Tam giác tổng quát, hình học phẳng khác.

QUY TẮC TRÍCH XUẤT THAM SỐ:
- Gán đúng tên các đỉnh A, B, C theo đề bài (nếu đề bài chưa đặt tên, mặc định A là đỉnh trên, B là chân góc vuông, C là điểm trên mặt đất/mặt nước).
- Trích xuất ngắn gọn độ dài ("8m", "1.5m", "45m", "h = ?", "d = ?") vào dimensions.
- Trích xuất góc ("30°", "45°", "60°", "α = ?") vào mảng angles.`;

    const contents: any[] = [];

    // Attach image if provided
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    const userPrompt = promptText
      ? `Hãy vẽ mô hình hình học SVG cho bài toán sau:\n\n${promptText}`
      : 'Hãy đọc đề bài toán trong ảnh và vẽ mô hình hình học SVG chính xác.';

    contents.push(userPrompt);

    const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const MODELS = [
      DEFAULT_MODEL,
      ...(DEFAULT_MODEL !== 'gemini-3.5-flash' ? ['gemini-3.5-flash'] : []),
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
    ];

    let response: any = null;
    let lastError: any = null;

    for (let i = 0; i < MODELS.length; i++) {
      const currentModel = MODELS[i];
      try {
        console.info(`[Gemini API] Đang gửi yêu cầu tới model: ${currentModel} (Lần thử ${i + 1}/${MODELS.length})...`);
        const result = await ai.models.generateContent({
          model: currentModel,
          contents,
          config: {
            systemInstruction,
            temperature: 0.1,
            maxOutputTokens: 6144,
          },
        });

        if (result && result.text) {
          const testClean = extractSvgCode(result.text);
          if (testClean && testClean.includes('<svg')) {
            response = result;
            console.info(`[Gemini API] Model ${currentModel} đã sinh SVG thành công (${testClean.length} bytes)!`);
            break;
          }
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini API] Model ${currentModel} gặp sự cố:`, err?.message || err);
        if (i < MODELS.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Mô hình Gemini không thể sinh mã SVG hợp lệ.');
    }

    const rawText = response.text || '';
    const cleanedSvg = extractSvgCode(rawText);

    // 4. Update usage credits
    let updatedRecord = keyRecord;
    if (keyRecord.totalCredits !== -1) {
      updatedRecord = await prisma.licenseKey.update({
        where: { id: keyRecord.id },
        data: { usedCredits: { increment: 1 } },
      });
    }

    const remainingCredits =
      updatedRecord.totalCredits === -1
        ? -1
        : Math.max(0, updatedRecord.totalCredits - updatedRecord.usedCredits);

    return NextResponse.json({
      success: true,
      svg: cleanedSvg,
      remainingCredits,
    });
  } catch (error: any) {
    console.error('DEBUG GEMINI ERROR:', error);
    const errorMsg = String(error?.message || '').toLowerCase();
    const errorStatus = error?.status || error?.statusCode;

    const isQuotaOrRateLimit =
      errorStatus === 429 ||
      errorMsg.includes('429') ||
      errorMsg.includes('quota') ||
      errorMsg.includes('rate limit') ||
      errorMsg.includes('resource_exhausted') ||
      errorMsg.includes('resource exhausted') ||
      errorMsg.includes('overloaded');

    const isInvalidKey =
      errorStatus === 400 ||
      errorStatus === 401 ||
      errorStatus === 403 ||
      errorMsg.includes('api_key_invalid') ||
      errorMsg.includes('api key not valid') ||
      errorMsg.includes('invalid api key') ||
      errorMsg.includes('permission_denied') ||
      errorMsg.includes('api_key');

    if (isQuotaOrRateLimit) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI_QUOTA_EXCEEDED',
          message: 'Hệ thống AI đang quá tải lượt dùng hoặc hết hạn mức API miễn phí (Rate Limit / Quota Exceeded).',
          code: 'RATE_LIMIT_EXCEEDED',
          isAiQuotaError: true,
          isAiKeyError: true,
          details: error?.message,
        },
        { status: 429 }
      );
    }

    if (isInvalidKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_AI_KEY',
          message: 'Gemini API Key không hợp lệ hoặc không có quyền truy cập.',
          code: 'INVALID_API_KEY',
          isAiKeyError: true,
          details: error?.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'GENERATE_FAILED',
        message: error?.message || 'Đã xảy ra lỗi trong quá trình sinh hình SVG.',
        details: error?.message,
      },
      { status: errorStatus && errorStatus >= 400 && errorStatus < 600 ? errorStatus : 500 }
    );
  }
}
