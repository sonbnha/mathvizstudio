import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { GeoCanvas } from '@/lib/geoEngine';
import { renderStructuredMathToSvg, MathSpec } from '@/lib/svg-generator';

// Helper function to sanitize and extract/execute ONLY valid, clean SVG content
function extractSvgCode(rawText: string): string {
  let clean = rawText.trim();

  // 1. If text is a GeoEngine JavaScript snippet, execute it on GeoCanvas
  if (
    clean.includes('geo.defPoint') ||
    clean.includes('geo.draw') ||
    clean.includes('GeoCanvas') ||
    (clean.includes('geo.') && clean.includes('const '))
  ) {
    try {
      const svg = GeoCanvas.execute(clean);
      if (svg && svg.includes('<svg')) {
        return svg;
      }
    } catch (e) {
      console.warn('[extractSvgCode] GeoCanvas execution fallback:', e);
    }
  }

  // 2. If text is JSON, attempt structured rendering
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

  // 3. Strip markdown code fences if wrapped in ```xml, ```svg, ```html, etc.
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:xml|svg|html|javascript|js|tsx|jsx|json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  // Trích xuất đúng khối <svg>...</svg>
  const svgMatch = clean.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgMatch) {
    clean = svgMatch[0];
  } else if (!clean.includes('<svg') && (clean.includes('ctx.') || clean.includes('canvas'))) {
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

  // Xóa triệt để các thẻ text dài (tiêu đề, lời giải thừa từ 15 ký tự trở lên)
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

    const systemInstruction = `Bạn là chuyên gia hình học toán học và lập trình viên đồ họa cấp cao (Geometry Computation Engine).
Nhiệm vụ của bạn: Đọc hiểu sâu sắc đề bài toán (từ văn bản hoặc ảnh OCR) và VIẾT MÃ JAVASCRIPT THỰC THI trên đối tượng \`geo\` (instance của GeoCanvas) để dựng hình học chính xác 100%.

CÁC PHƯƠNG THỨC CÓ SẴN CỦA ĐỐI TƯỢNG \`geo\`:
1. Định nghĩa và tính toán điểm hình học:
   - \`geo.defPoint(name, x, y)\`: Định nghĩa điểm với tọa độ (x, y).
   - \`geo.midpoint(name, p1, p2)\`: Tính trung điểm của đoạn thẳng p1p2.
   - \`geo.reflect(name, p, center)\`: Điểm đối xứng của p qua tâm center.
   - \`geo.homothety(name, origin, p, k)\`: Phép vị tự tâm origin tỉ số k (kéo dài vector).
   - \`geo.projectPointOnLine(name, p, l1, l2)\`: Hình chiếu vuông góc của điểm p lên đường thẳng l1l2.
   - \`geo.intersectLines(name, p1, p2, p3, p4)\`: Giao điểm của 2 đường thẳng p1p2 và p3p4.
   - \`geo.intersectLineCircleOther(name, p1, p2, center, r)\`: Giao điểm thứ 2 của đường thẳng p1p2 với đường tròn (center; r).
   - \`geo.tangentPoints(name1, name2, from, center, r)\`: Hai tiếp điểm từ điểm ngoài from đến đường tròn (center; r).

2. Vẽ các phần tử hình học:
   - \`geo.drawSegment(p1, p2, { stroke: '#2563eb', width: 2.5, dashed: false })\`: Vẽ đoạn thẳng (dashed: true cho nét đứt).
   - \`geo.drawPolygon([p1, p2, p3, ...], { stroke: '#2563eb', fill: 'none', width: 2.5 })\`: Vẽ đa giác/tam giác.
   - \`geo.drawCircle(center, radius, { stroke: '#2563eb', fill: 'none', width: 2, dashed: false })\`: Vẽ đường tròn.
   - \`geo.drawRightAngle(p1, vertex, p2, size = 14)\`: Vẽ ô vuông góc vuông 90° tại đỉnh vertex.
   - \`geo.drawAngleArc(p1, vertex, p2, label = '60°', r = 32)\`: Vẽ cung tròn góc phồng lồi chuẩn toán học kèm nhãn độ.
   - \`geo.drawText(text, x, y, { fill: '#2563eb', size: 18, anchor: 'middle' })\`: Vẽ nhãn số đo/kích thước.
   - \`geo.addRawElement('<path ... />')\`: Thêm nét vẽ minh họa tự do nếu là toán thực tế (bóng nắng, cái thang...).

QUY TẮC BẮT BUỘC:
- Khung hình chuẩn: 800 x 500. Tất cả các điểm phải nằm trong vùng an toàn x: 60 - 740, y: 60 - 440 (cách mép tối thiểu 50px).
- NẾU LÀ TOÁN HÌNH HỌC THUẦN TÚY (Tam giác ABC, đường tròn O, tứ giác ABCD...): Chỉ dùng các hàm vẽ hình học phẳng chuẩn mực SGK, CẤM vẽ cây cối, mặt trời, mặt đất.
- NẾU LÀ TOÁN THỰC TẾ: Dựng đúng khung tam giác vuông toán học chính lên trên cùng, minh họa phụ làm mờ bên dưới.
- ĐẦU RA BẮT BUỘC: CHỈ XUẤT DUY NHẤT mã JavaScript bên trong khối \`\`\`javascript ... \`\`\`. Không viết bất kỳ lời giải thích ngoài code.`;

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
      ? `Hãy viết mã JavaScript GeoEngine để dựng hình cho bài toán sau:\n\n${promptText}`
      : 'Hãy đọc đề bài toán trong ảnh và viết mã JavaScript GeoEngine để dựng hình chính xác.';

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
            console.info(`[Gemini API] Model ${currentModel} đã sinh mã GeoEngine thành công!`);
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
      throw lastError || new Error('Mô hình Gemini không thể sinh mã hình học hợp lệ.');
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
