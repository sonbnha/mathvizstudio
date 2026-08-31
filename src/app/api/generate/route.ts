import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';

// Helper function to sanitize and extract ONLY valid, clean SVG content
function sanitizeSvg(svgString: string): string {
  let clean = svgString.trim();

  // Strip markdown code fences if wrapped in ```xml, ```svg, ```html, etc.
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:xml|svg|html|javascript|js|json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  // 1. Trích xuất đúng khối <svg>...</svg>
  const match = clean.match(/<svg[\s\S]*?<\/svg>/i);
  if (match) {
    clean = match[0];
  } else {
    clean = clean.replace(/```xml|```svg|```html|```/gi, '').trim();
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

    const systemInstruction = `Bạn là một trình biên dịch đồ họa vector. Nhiệm vụ duy nhất: Đọc đề bài toán (từ văn bản hoặc tự động đọc nội dung đề bài trong ảnh OCR nếu có) và xuất ra MÃ SVG HỢP LỆ.

NGHIÊM CẤM: Không viết lời mở đầu, không tóm tắt đề bài, không giải thích các bước giải, không viết chữ markdown ngoài thẻ <svg>.
BẮT BUỘC: Đầu ra phải bắt đầu chính xác bằng '<svg' và kết thúc chính xác bằng '</svg>'.

${colorPaletteInstruction}

QUY TẮC NỘI DUNG CHỮ TRONG SVG:
+ TUYỆT ĐỐI KHÔNG tạo các thẻ <text> chứa nội dung đề bài, tóm tắt đề, công thức tính toán hoặc các bước giải bài toán.
+ CHỈ ĐƯỢC PHÉP dùng thẻ <text> cho 3 mục đích duy nhất:
  1. Tên điểm đỉnh hình học (ngắn gọn từ 1 đến 3 ký tự, ví dụ: 'A', 'B', 'C', 'H', 'A'', 'S_1').
  2. Số đo góc (ví dụ: '60°', '30°', '45°', 'α', 'β').
  3. Độ dài kích thước cạnh / chiều cao ngắn (ví dụ: '4m', '38m', 'h = ?', 'x', '10 cm').
+ Tất cả các thẻ <text> chứa đoạn văn giải thích dài hơn 20 ký tự đều bị cấm triệt để.

QUY TẮC TỌA ĐỘ VÀ CĂN CHỈNH BỐ CỤC:
+ Sử dụng viewBox="0 0 600 450" chuẩn tỷ lệ 4:3.
+ Để lề (padding) an toàn tối thiểu 40px xung quanh hình để chữ không bị cắt viền.
+ Hình vẽ phải cân đối, rõ ràng, các nét vẽ không chồng chéo làm biến dạng hình ảnh.
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

    // List of models in order of priority
    const defaultModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const MODELS = [
      defaultModel,
      ...(defaultModel !== 'gemini-3.6-flash' ? ['gemini-3.6-flash'] : []),
    ];

    let response: any = null;
    let lastError: any = null;

    for (let i = 0; i < MODELS.length; i++) {
      const currentModel = MODELS[i];
      try {
        console.info(`[Gemini API] Đang thử model: ${currentModel} (Lần thử ${i + 1}/${MODELS.length})...`);
        const result = await ai.models.generateContent({
          model: currentModel,
          contents,
          config: {
            systemInstruction,
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        });

        if (result && result.text) {
          response = result;
          console.info(`[Gemini API] Model ${currentModel} đã phản hồi thành công!`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini API] Model ${currentModel} gặp sự cố:`, err?.message || err);
        
        const errorStatus = err?.status || err?.statusCode;
        const errorMsg = String(err?.message || '').toLowerCase();
        const isRetryable =
          errorStatus === 503 ||
          errorStatus === 429 ||
          errorStatus === 500 ||
          errorMsg.includes('overloaded') ||
          errorMsg.includes('high demand') ||
          errorMsg.includes('resource exhausted');

        if (i < MODELS.length - 1 && isRetryable) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Tất cả các model trong danh sách fallback đều không thể phản hồi.');
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
      svg: cleanedSvg,
      remainingCredits,
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
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

    if (isQuotaOrRateLimit) {
      return NextResponse.json(
        {
          error: 'Hệ thống đang quá tải lượt dùng hoặc hết hạn mức API miễn phí (Rate Limit / Quota Exceeded).',
          code: 'RATE_LIMIT_EXCEEDED',
          isQuotaError: true,
          details: error?.message,
        },
        { status: 429 }
      );
    }

    const isInvalidKey =
      errorStatus === 400 &&
      (errorMsg.includes('api_key_invalid') ||
        errorMsg.includes('api key not valid') ||
        errorMsg.includes('invalid api key') ||
        errorMsg.includes('api_key'));

    if (isInvalidKey) {
      return NextResponse.json(
        {
          error: 'Gemini API Key không hợp lệ hoặc đã bị vô hiệu hóa.',
          code: 'INVALID_API_KEY',
          details: error?.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error?.message || 'Đã xảy ra lỗi trong quá trình sinh hình SVG.',
        details: error?.message,
      },
      { status: errorStatus && errorStatus >= 400 && errorStatus < 600 ? errorStatus : 500 }
    );
  }
}
