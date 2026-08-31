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

    const colorPaletteInstruction =
      style === 'monochrome' || styleMode === 'monochrome'
        ? `PHỐI MÀU TRẮNG ĐEN TOÁN HỌC (MONOCHROME):
- Tất cả các nét vẽ toán học dùng stroke="#0f172a", stroke-width="2.5".
- Các đường phụ nét đứt stroke="#64748b" stroke-dasharray="5 4".
- Ký hiệu góc và số đo dùng màu đen #0f172a.`
        : style === 'blueprint'
        ? `PHỐI MÀU BẢN VẼ KỸ THUẬT (BLUEPRINT):
- Nền xanh blueprint đậm #0f172a, nét vẽ màu trắng #f8fafc và xanh cyan #38bdf8.
- Ký hiệu góc và số đo dùng màu vàng neon #facc15.`
        : `PHỐI MÀU TRỰC QUAN SƯ PHẠM (COLORFUL - MẶC ĐỊNH):
- Khung xương hình học chính: Màu xanh đậm stroke="#2563eb" với stroke-width="3".
- Đường phụ, đường gióng, đường kéo dài: stroke="#64748b" stroke-dasharray="5 4" stroke-width="1.8".
- Ký hiệu góc & số đo: stroke="#ea580c" và fill="#ea580c" font-weight="bold".
- Điểm đỉnh: Vòng tròn r="4.5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5".
- Tên đỉnh (A, B, C...): fill="#0f172a", font-weight="bold", font-size="20", font-family="system-ui, sans-serif".`;

    const systemInstruction = `Bạn là Động cơ Dựng hình Hình học Động (Dynamic Geometric Construction Engine).
Nhiệm vụ của bạn: Đọc hiểu sâu sắc đề bài toán (từ văn bản hoặc ảnh OCR) và sinh ra MÃ SVG CHUẨN SƯ PHẠM, ĐẦY ĐỦ, CHÍNH XÁC VÀ NỔI BẬT KHUNG HÌNH HỌC TOÁN HỌC.

TUYỆT ĐỐI KHÔNG ÁP ĐẶT MẪU CỨNG (NO HARDCODED TEMPLATES):
- Không đoán mò hay ép đề bài vào các mẫu có sẵn.
- Mọi hình vẽ phải được xây dựng động 100% dựa trên đúng các điểm, đoạn thẳng, đường tròn và quan hệ hình học nêu trong đề bài.

QUY TRÌNH 4 BƯỚC BẮT BUỘC ĐỌC KỸ ĐỀ (STEP-BY-STEP GEOMETRY EXTRACTION):

BƯỚC 1: TRÍCH XUẤT THỰC THỂ & DANH SÁCH ĐIỂM (Entity & Point Extraction)
- Quét toàn bộ đề bài và liệt kê chính xác tập hợp các điểm {P1, P2, P3...} (ví dụ: A, B, C, D, H, M, N, O, O'...).
- TUYỆT ĐỐI KHÔNG tự thêm điểm lạ không có trong đề bài hoặc không phục vụ dựng hình.
- Xác định các đối tượng nền tảng: Có bao nhiêu đường tròn? Đa giác nào? Đường kính, dây cung, tiếp tuyến hay đường cao nào?

BƯỚC 2: THIẾT LẬP QUAN HỆ HÌNH HỌC (Geometric Constraints)
- Thuộc tính điểm: Điểm nào là tâm đường tròn, điểm nào là giao điểm, điểm nào thuộc đoạn thẳng nào.
- Quan hệ đặc biệt: Vuông góc, song song, tiếp xúc, thẳng hàng, trung điểm, phân giác, góc bao nhiêu độ.
- Phân biệt loại bài:
  + NẾU LÀ TOÁN HÌNH HỌC THUẦN TÚY (Tam giác ABC, đường tròn O, tứ giác ABCD...): 100% chỉ vẽ hình học SGK phẳng trên nền trắng/trong suốt. CẤM vẽ cây cối, mặt trời, mặt đất, thang, nhà cửa, thuyền buồm,...
  + NẾU LÀ TOÁN THỰC TẾ (Bóng cây, chiếc thang, ngọn hải đăng, tòa nhà...): Chỉ vẽ đối tượng thực tế mà đề bài nhắc tên làm nền mờ phía dưới (opacity 0.4 - 0.7), gắn đúng vào khung toán học chính. Cạnh toán học màu xanh dương #2563eb luôn nằm trên cùng.

BƯỚC 3: GIẢI HỆ TỌA ĐỘ TRONG BOUNDING BOX AN TOÀN (Coordinate Calculation)
- Khung vẽ chuẩn: viewBox="0 0 800 500".
- Vùng an toàn: x trong khoảng [50, 750], y trong khoảng [50, 450] (cách lề tối thiểu 50px mỗi cạnh, không bao giờ để nét vẽ hoặc nhãn chữ chạm mép).
- Tính toán tọa độ thực tế (x, y) cho từng điểm dựa trên đúng các quan hệ ở Bước 2.
- Thuật toán Cung Góc SVG chuẩn xác (Angle Arc Math):
  + Để vẽ cung góc tại đỉnh V giữa 2 tia VP1 và VP2 (bán kính r ≈ 30 - 35px):
    * ang1 = Math.atan2(P1.y - V.y, P1.x - V.x)
    * ang2 = Math.atan2(P2.y - V.y, P2.x - V.x)
    * diff = ((ang2 - ang1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI
    * sweep_flag = diff > 0 ? 1 : 0
    * Lệnh vẽ: <path d="M \${V.x + r*Math.cos(ang1)} \${V.y + r*Math.sin(ang1)} A \${r} \${r} 0 0 \${sweep_flag} \${V.x + r*Math.cos(ang2)} \${V.y + r*Math.sin(ang2)}" fill="none" stroke="#ea580c" stroke-width="2.5" />
    * Nhãn góc (vd: "60°", "α", "30°"): Đặt tại V + (r + 18px) * Math.cos(ang1 + diff/2), V + (r + 18px) * Math.sin(ang1 + diff/2) với text-anchor="middle" dominant-baseline="central".

BƯỚC 4: XUẤT MÃ SVG CHUẨN MỰC
- BẮT BUỘC: Đầu ra CHỈ LÀ mã SVG bắt đầu bằng '<svg' và kết thúc bằng '</svg>'. Không viết lời mở đầu, không kèm code markdown hay giải thích ngoài thẻ svg.
- Thẻ SVG gốc bắt buộc: <svg viewBox="0 0 800 500" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">.
- Các thành phần hình học bắt buộc:
  + Nét vẽ chính: <line>, <path>, <polygon>, <circle> nét đậm (stroke="#2563eb" hoặc stroke="#0f172a", stroke-width="2.5" đến "3.5", stroke-linejoin="round").
  + Đường phụ/kéo dài: stroke-dasharray="5 4" nét đứt rõ ràng.
  + Góc vuông: Ô vuông nhỏ 14x14px tại mọi góc 90° bằng <path d="M ... L ... L ..." fill="none" stroke="#2563eb" stroke-width="2" />.
  + Điểm đỉnh: Chấm tròn <circle cx="..." cy="..." r="4.5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />.
  + Nhãn tên điểm (A, B, C...): <text font-size="20" font-weight="bold" fill="#0f172a"> dịch ra ngoài đa giác 18px - 24px.
  + Số đo cạnh/góc: Ngắn gọn ("8m", "6cm", "30°", "h = ?") đặt song song hoặc cách nét vẽ tối thiểu 20px, không bị nét vẽ cắt qua chữ.
  + TUYỆT ĐỐI KHÔNG chèn tiêu đề, lời giải hay văn bản mô tả dài.

${colorPaletteInstruction}`;

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
