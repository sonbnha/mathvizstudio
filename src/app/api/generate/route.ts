import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';

// Helper function to sanitize and extract ONLY valid, clean SVG content
function sanitizeSvg(svgString: string): string {
  let clean = svgString.trim();

  // Strip markdown code fences if wrapped in ```xml, ```svg, ```html, etc.
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:xml|svg|html|javascript|js|tsx|jsx|json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  // 1. Trích xuất đúng khối <svg>...</svg>
  const match = clean.match(/<svg[\s\S]*?<\/svg>/i);
  if (match) {
    clean = match[0];
  } else if (!clean.includes('<svg') && (clean.includes('ctx.') || clean.includes('canvas'))) {
    // If JS canvas code was generated, return as-is for canvas execution
    return clean;
  } else {
    clean = clean.replace(/```xml|```svg|```html|```/gi, '').trim();
  }

  // Ensure essential SVG attributes exist so it never collapses to 0x0
  if (clean.includes('<svg')) {
    if (!clean.includes('xmlns=')) {
      clean = clean.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!clean.includes('viewBox=')) {
      clean = clean.replace(/<svg/i, '<svg viewBox="0 0 600 450"');
    }
    if (!clean.includes('width=')) {
      clean = clean.replace(/<svg/i, '<svg width="100%"');
    }
    if (!clean.includes('height=')) {
      clean = clean.replace(/<svg/i, '<svg height="100%"');
    }
  }

  // 2. Xóa các thẻ text dài (thường là đề bài hoặc lời giải chứa từ 20 ký tự trở lên)
  clean = clean.replace(/<text[^>]*>([^<]{20,})<\/text>/gi, '');

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
        ? `BẢNG MÀU ĐỀ THI / IN ẤN (MONOCHROME PRINT MODE):
1. Nền và màu sắc: Nền trắng tinh (#ffffff). Toàn bộ nét vẽ đều màu đen stroke="#000000" với stroke-width="2.2".
2. Nét phụ / đường gióng / đường cao: stroke="#000000", stroke-dasharray="4 4", stroke-width="1.5".
3. Điểm đỉnh (Dots): Vòng tròn r="3.5", fill="#000000".
4. Chữ tên đỉnh và số đo: fill="#000000", font-weight="bold", font-family="sans-serif".
5. Đối tượng thực tế (mặt đất, bờ tường, cây, thang): Dùng nét vẽ đơn sắc đen trắng, gạch bóng mờ hoặc nét đứt gạch chéo (pattern/hatch), TUYỆT ĐỐI KHÔNG dùng màu xanh, cam, vàng hay các màu sặc sỡ để tối ưu cho việc in đề thi A4.`
        : `BẢNG MÀU BÀI GIẢNG TRỰC QUAN (COLOR PEDAGOGY MODE):
1. Nét vẽ hình học chính (các cạnh tam giác, hình chiếu): Đồng nhất 1 màu duy nhất stroke="#2563eb" (Blue 600), độ dày stroke-width="2.5".
2. Nét phụ / đường gióng / nét đứt: Màu stroke="#94a3b8" (Slate 400), stroke-dasharray="4 4", stroke-width="1.5".
3. Điểm đỉnh (Dots): Vòng tròn bán kính r="4", fill="#1e293b".
4. Chữ tên đỉnh (A, B, C...): Màu fill="#0f172a", font-weight="bold", font-size="16", font-family="sans-serif".
5. Ký hiệu góc & số đo góc: Đồng nhất màu stroke="#d97706" và fill="#d97706" (Amber 600) cho toàn bộ các góc (KHÔNG dùng mỗi góc một màu khác nhau).`;

    const systemInstruction = `Bạn là một chuyên gia đồ họa vector và hình học toán học. Nhiệm vụ duy nhất: Đọc đề bài toán (từ văn bản hoặc ảnh OCR) và xuất ra MÃ SVG CHUẨN XÁC, CÂN ĐỐI để hiển thị trên Canvas / Web.

NGHIÊM CẤM: Không viết lời mở đầu, không tóm tắt đề bài, không giải thích các bước giải, không viết chữ markdown ngoài thẻ <svg>.
BẮT BUỘC:
1. Đầu ra phải bắt đầu chính xác bằng '<svg' và kết thúc chính xác bằng '</svg>'.
2. Bắt buộc có các thuộc tính: viewBox="0 0 600 450" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg".
3. Tự động căn giữa toàn bộ mô hình hình học theo tọa độ tâm (width/2 = 300, height/2 = 225) và để lề an toàn tối thiểu 40px xung quanh để không bị lệch hay cắt viền.

${colorPaletteInstruction}

QUY TẮC NỘI DUNG CHỮ TRONG HÌNH:
+ TUYỆT ĐỐI KHÔNG tạo các thẻ <text> chứa đề bài, tóm tắt, lời giải hoặc đoạn văn dài hơn 20 ký tự.
+ CHỈ ĐƯỢC PHÉP dùng thẻ <text> cho 3 mục đích duy nhất:
  1. Tên điểm đỉnh hình học (ngắn gọn từ 1 đến 3 ký tự, ví dụ: 'A', 'B', 'C', 'H', 'S', 'O').
  2. Số đo góc (ví dụ: '60°', '30°', '45°', 'α', 'β').
  3. Độ dài kích thước cạnh / chiều cao ngắn (ví dụ: '4m', '38m', 'h = ?', 'x', '10 cm').
+ Tất cả các thẻ <text> phải có font-family="sans-serif", font-weight="bold", font-size="15".

QUY TẮC TỌA ĐỘ VÀ CĂN CHỈNH BỐ CỤC:
+ Nét vẽ rõ ràng, độ tương phản cao, nổi bật trên nền trắng (#ffffff).
+ Đánh dấu góc vuông: Sử dụng thẻ <path> hoặc <rect> nhỏ (kích thước cạnh khoảng 12px) để thể hiện ký hiệu góc vuông chuẩn toán học.
+ Đánh dấu cung góc: Sử dụng thẻ <path> hình cung (arc) kèm nhãn số đo góc bên cạnh.`;

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
    const cleanedSvg = sanitizeSvg(rawText);

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
