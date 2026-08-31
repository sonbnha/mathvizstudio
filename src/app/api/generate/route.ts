import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';

// Helper function to sanitize and extract ONLY valid, clean SVG content
function extractSvgCode(rawText: string): string {
  let clean = rawText.trim();

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
  }

  return clean.trim();
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate via Header X-License-Key
    const licenseKey = req.headers.get('x-license-key') || req.headers.get('X-License-Key');
    if (!licenseKey) {
      return NextResponse.json(
        { error: 'Thiếu License Key trong Header X-License-Key.' },
        { status: 403 }
      );
    }

    const keyRecord = await prisma.licenseKey.findUnique({
      where: { key: licenseKey.trim() },
    });

    if (!keyRecord) {
      return NextResponse.json(
        { error: 'License key không tồn tại.' },
        { status: 403 }
      );
    }

    if (!keyRecord.isActive) {
      return NextResponse.json(
        { error: 'License key đã bị vô hiệu hóa.' },
        { status: 403 }
      );
    }

    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'License key đã hết hạn sử dụng.' },
        { status: 403 }
      );
    }

    if (keyRecord.totalCredits !== -1 && keyRecord.usedCredits >= keyRecord.totalCredits) {
      return NextResponse.json(
        { error: 'License key đã hết lượt sử dụng.' },
        { status: 403 }
      );
    }

    // 2. Parse request payload
    let body: { prompt?: string; imageBase64?: string; mimeType?: string; styleMode?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const promptText = body.prompt?.trim() || '';
    const imageBase64 = body.imageBase64;
    const mimeType = body.mimeType || 'image/png';
    const styleMode = (body.styleMode || 'color').toLowerCase() === 'monochrome' ? 'monochrome' : 'color';

    if (!promptText && !imageBase64) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp văn bản gợi ý (prompt) hoặc hình ảnh (imageBase64).' },
        { status: 400 }
      );
    }

    // 3. Gemini API setup (Priority 1: User custom BYOK key, Priority 2: System GEMINI_API_KEY)
    const customKey = req.headers.get('x-custom-api-key');
    const apiKey =
      customKey && customKey.trim().length > 10
        ? customKey.trim()
        : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('[Gemini API] Thiếu cấu hình API Key: Cả key người dùng và GEMINI_API_KEY đều trống.');
      return NextResponse.json(
        { error: 'Chưa cấu hình GEMINI_API_KEY trên hệ thống và bạn chưa nhập API Key cá nhân.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const colorPaletteInstruction =
      styleMode === 'monochrome'
        ? `CHẾ ĐỘ IN ẤN & ĐỀ THI (MONOCHROME PRINT MODE):
- Nền: Nền trắng tinh khiết (#ffffff).
- Toàn bộ đường nét hình học: Màu đen stroke="#000000" với stroke-width="2.5".
- Đường gióng / đường đứt đoạn / tia sáng: stroke="#000000" stroke-dasharray="5 5" stroke-width="1.8".
- Điểm đỉnh: Vòng tròn r="4" fill="#000000".
- Chữ tên đỉnh, số đo, đơn vị: fill="#000000", font-weight="bold", font-family="sans-serif", font-size="16".
- Đối tượng thực tế (mặt đất, cây, thang, cột): Dùng nét đơn sắc đen trắng, gạch bóng hoặc nét hatch tinh tế, TUYỆT ĐỐI KHÔNG dùng màu mè.`
        : `CHẾ ĐỘ BÀI GIẢNG TRỰC QUAN (COLOR PEDAGOGY MODE):
- Nền: Nền trắng (#ffffff).
- Khung xương hình học chính: Màu xanh đậm stroke="#2563eb" (Blue 600) với stroke-width="3".
- Tia nắng / tia sáng / đường ngắm: Màu vàng cam stroke="#f59e0b" (Amber 500) hoặc stroke-dasharray="5 5" stroke-width="2".
- Đối tượng thực tế:
  + Cây xanh: Tán lá fill="#22c55e" stroke="#16a34a", thân cây fill="#854d0e" stroke="#713f12".
  + Cột hải đăng / tòa nhà / tường: Phối màu trang nhã (fill="#e2e8f0" stroke="#475569").
  + Thang / dây neo: stroke="#d97706" hoặc stroke="#64748b" stroke-width="2.5".
  + Mặt đất: Đường chuẩn nằm ngang stroke="#64748b" stroke-width="2".
- Điểm đỉnh: Vòng tròn r="4.5" fill="#1e293b".
- Chữ tên đỉnh (A, B, C...): fill="#0f172a", font-weight="bold", font-size="16", font-family="sans-serif".
- Ký hiệu góc & số đo: stroke="#ea580c" và fill="#ea580c" (Orange 600) font-weight="bold".`;

    const systemInstruction = `Bạn là chuyên gia hàng đầu về Đồ Họa Vector Toán Học (MathViz Engine).
Nhiệm vụ của bạn: Phân tích bài toán (từ văn bản hoặc ảnh OCR) và sinh ra một mô hình hình học toán học ĐẦY ĐỦ, CHÍNH XÁC, ĐẸP MẮT dưới dạng MÃ SVG HỢP LỆ.

BẮT BUỘC VỀ ĐẦU RA:
1. Đầu ra CHỈ LÀ MÃ SVG bắt đầu bằng '<svg' và kết thúc bằng '</svg>'. Không viết lời mở đầu, không kèm code markdown hay giải thích.
2. Thẻ SVG gốc bắt buộc: <svg viewBox="0 0 800 500" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">.

${colorPaletteInstruction}

QUY TẮC MÔ HÌNH HÓA BÀI TOÁN THỰC TẾ (BÓNG NẮNG, HẢI ĐĂNG, CHIỀU CAO, THANG, GÓC NÂNG/HẠ):
Khi gặp bài toán thực tế (ví dụ: "Cây cao bóng dài", "Ngọn hải đăng nhìn tàu", "Thang dựa vào tường", "Khinh khí cầu", "Tỉ số lượng giác"):
BẮT BUỘC PHẢI VẼ ĐỦ CẢ 4 LỚP SAU:
1. Lớp Mặt Đất & Chuẩn Ngang:
   - Một đường kẻ ngang làm mặt đất rõ ràng (ví dụ: y = 420 từ x=50 đến x=750).
   - Có nhãn số đo cạnh đáy/bóng (ví dụ: '6m', '20m', 'd = ?') đặt phía dưới đường mặt đất.
2. Lớp Đối Tượng Thực Tế:
   - Vẽ hình cách điệu của vật thể (cây xanh, cột hải đăng, tòa nhà, bờ tường...) dựng THẲNG ĐỨNG vuông góc với mặt đất.
   - Có nhãn chiều cao của vật thể (ví dụ: '8m', 'h = ?', '15m') đặt cạnh thân vật thể.
3. Lớp Hình Học Tam Giác & Góc:
   - Nối ngọn vật thể với đầu bóng hoặc điểm quan sát tạo thành tam giác vuông chuẩn toán học.
   - Ký hiệu góc vuông: Vẽ hình vuông nhỏ (14x14px) tại chân góc vuông bằng <path d="M ... L ... L ..." fill="none" stroke="#2563eb" stroke-width="1.8" />.
   - Ký hiệu cung tròn góc & nhãn độ lớn góc: Cung tròn góc tại điểm quan sát/đầu bóng bằng <path d="..." fill="none" stroke="#ea580c" stroke-width="2" /> kèm nhãn số đo (ví dụ: '30°', '45°', 'α', 'β').
4. Lớp Điểm Đỉnh & Chú Thích:
   - Đặt tên các đỉnh tam giác: A (ngọn/đỉnh cao), B (gốc/chân vuông góc), C (đầu bóng/điểm quan sát) bằng thẻ <text font-weight="bold" font-size="16">.
   - Chấm tròn đỉnh: <circle cx="..." cy="..." r="4.5" /> tại mỗi đỉnh A, B, C.

QUY TẮC BỐ CỤC & TỌA ĐỘ:
- Căn giữa toàn bộ mô hình trong khung viewBox="0 0 800 500" (khoảng x từ 80 đến 720, y từ 60 đến 440).
- Chừa lề an toàn tối thiểu 40px xung quanh để các chữ tên đỉnh và số đo không bị cắt viền.
- Đảm bảo hình vẽ có chiều sâu, rõ ràng, trực quan chuẩn sư phạm.`;

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

    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    console.info(`[Gemini API] Đang gửi yêu cầu tới model: ${GEMINI_MODEL}...`);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    });

    if (!response || !response.text) {
      throw new Error('Mô hình Gemini không trả về dữ liệu văn bản.');
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
          error: 'Hệ thống đang quá tải lượt dùng hoặc hết hạn mức API miễn phí (Rate Limit / Quota Exceeded).',
          code: 'RATE_LIMIT_EXCEEDED',
          isQuotaError: true,
          isKeyError: true,
          details: error?.message,
        },
        { status: 429 }
      );
    }

    if (isInvalidKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gemini API Key không hợp lệ hoặc không có quyền truy cập.',
          code: 'INVALID_API_KEY',
          isKeyError: true,
          details: error?.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Đã xảy ra lỗi trong quá trình sinh hình SVG.',
        details: error?.message,
      },
      { status: errorStatus && errorStatus >= 400 && errorStatus < 600 ? errorStatus : 500 }
    );
  }
}
