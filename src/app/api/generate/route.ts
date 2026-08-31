import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';

export const maxDuration = 30;

// Helper function to sanitize and extract ONLY valid, clean SVG content
function sanitizeSvg(svgString: string): string {
  try {
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

    // 2. Đảm bảo các thuộc tính thiết yếu của thẻ SVG
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

    // 3. Xóa các thẻ text dài (thường là đề bài hoặc lời giải thừa từ 20 ký tự trở lên)
    clean = clean.replace(/<text[^>]*>([^<]{20,})<\/text>/gi, '');

    return clean.trim();
  } catch (err) {
    console.warn('[sanitizeSvg Error]:', err);
    return svgString;
  }
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
        { error: 'Cần cung cấp ít nhất một đoạn văn bản hoặc một hình ảnh bài toán.' },
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
  + Cây xanh: Tán lá fill="#22c55e" stroke="#16a34a" fill-opacity="0.25", thân cây fill="#854d0e" stroke="#713f12".
  + Cột hải đăng / tòa nhà / tường: Phối màu trang nhã (fill="#f8fafc" stroke="#94a3b8").
  + Thang: Gióng thang màu cam gỗ stroke="#d97706" stroke-width="3.5", các bậc thang stroke="#b45309" stroke-width="2.5".
  + Thuyền buồm: Thân thuyền màu gỗ fill="#854d0e", cánh buồm trắng fill="#f8fafc" stroke="#64748b".
  + Mặt đất: Đường chuẩn nằm ngang stroke="#64748b" stroke-width="2.5".
- Điểm đỉnh: Vòng tròn r="4.5" fill="#1e293b".
- Chữ tên đỉnh (A, B, C...): fill="#0f172a", font-weight="bold", font-size="18", font-family="sans-serif".
- Ký hiệu góc & số đo: stroke="#ea580c" và fill="#ea580c" (Orange 600) font-weight="bold".`;

    const systemInstruction = `Bạn là chuyên gia hàng đầu về Đồ Họa Vector Toán Học Sư Phạm (MathViz Engine).
Nhiệm vụ của bạn: Phân tích bài toán (từ văn bản hoặc ảnh OCR) và sinh ra MÃ SVG CHUẨN SƯ PHẠM, ĐẸP MẮT, NỔI BẬT KHUNG HÌNH HỌC TOÁN HỌC.

CHỈ THỊ CỐT LÕI QUAN TRỌNG NHẤT:
"Mục tiêu cao nhất của hình vẽ là PHỤC VỤ GIẢI TOÁN HÌNH HỌC. Khung hình học cốt lõi (tam giác vuông, đa giác, các cạnh, góc vuông, tên đỉnh A-B-C, số đo) PHẢI LUÔN NẰM Ở VỊ TRÍ NỔI BẬT VÀ SẮC NÉT NHẤT trên bản vẽ."

BẮT BUỘC VỀ ĐẦU RA:
1. Đầu ra CHỈ LÀ MÃ SVG bắt đầu bằng '<svg' và kết thúc bằng '</svg>'. Không viết lời mở đầu, không kèm code markdown hay giải thích ngoài thẻ svg.
2. Thẻ SVG gốc bắt buộc: <svg viewBox="0 0 800 500" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">.

KIẾN TRÚC PHÂN LỚP SVG (2-LAYER ARCHITECTURE):

LỚP 1: HÌNH HỌC TOÁN HỌC CỐT LÕI (NẰM TRÊN CÙNG - VẼ NÉT ĐẬM, NỔI BẬT NHẤT):
1. Khung tam giác/đa giác chính (Main Geometry Lines):
   - Nét vẽ chính stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round".
   - Nối trọn vẹn các đỉnh mô hình hóa bài toán:
     * Bài toán cái thang: Tam giác ABC vuông tại chân tường B (A là đỉnh thang trên tường, C là chân thang trên mặt đất, AC là cạnh thang).
     * Bài toán bóng cây: Tam giác ABC vuông tại gốc cây B (A là ngọn cây, C là mút bóng nắng, AC là phương tia nắng).
     * Bài toán hải đăng: Tam giác ABC vuông tại chân hải đăng B (A là ngọn hải đăng, C là vị trí thuyền, AC là tia ngắm).
2. Ký hiệu góc vuông và cung đo góc:
   - Ký hiệu góc vuông: Luôn vẽ ô vuông chuẩn 14x14px tại mọi vị trí vuông góc (chân tường, chân cây, chân hải đăng).
   - Ký hiệu cung góc: Cung tròn cong mượt mà bằng thẻ <path d="M ... A ..." fill="none" stroke="#ea580c" stroke-width="2.2" /> kèm nhãn số đo góc bên cạnh (ví dụ: '30°', '60°', 'α').
3. Điểm đỉnh và Nhãn kích thước:
   - Điểm đỉnh: <circle cx="..." cy="..." r="4.5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" /> tại mỗi đỉnh A, B, C...
   - Tên đỉnh: <text font-size="20" font-weight="bold" fill="#0f172a"> đặt ngoài hình cách đỉnh 15px.
   - Nhãn kích thước ngắn gọn: '4m', 'h = ?', 'd = ?', '8m' nằm song song với cạnh tương ứng.

LỚP 2: ĐỒ HỌA MINH HỌA TOÁN THỰC TẾ (NẰM DƯỚI LÀM NỀN TRỰC QUAN):
- BÀI TOÁN CÁI THANG:
  + Vẽ bức tường đứng có họa tiết gạch nhẹ nhàng bên cạnh cạnh AB.
  + Vẽ chiếc thang với 2 thanh gióng màu cam gỗ và 4-6 bậc thang vuông góc với thân thang dọc theo cạnh AC.
- BÀI TOÁN BÓNG NẮNG & MẶT TRỜI:
  + Vẽ cây xanh hoặc cột cờ tại cạnh AB (thân nâu, tán lá xanh tự nhiên).
  + TÂM MẶT TRỜI S(x_S, y_S) BẮT BUỘC NẰM TRÊN ĐƯỜNG THẲNG KÉO DÀI TỪ C QUA A (x_S = x_A + (x_A - x_C)*0.4, y_S = y_A + (y_A - y_C)*0.4, y_S ≥ 70).
  + Tia nắng nối dài: <line x1="x_S" y1="y_S" x2="x_C" y2="y_C" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6 4" />.
  + Icon Mặt Trời: Vòng tròn vàng r=20 kèm các tia nắng phát quang tại tâm S.
- BÀI TOÁN NGỌN HẢI ĐĂNG / THUYỀN BIỂN:
  + Tháp hải đăng đỏ trắng tại cạnh AB, thuyền buồm tại điểm C trên mặt biển.
  + Vẽ đường ngắm nằm ngang nét đứt từ A và cung góc hạ nếu đề bài cho.
- TOÁN HÌNH HỌC THUẦN TÚY (Tam giác, đường tròn, tứ giác):
  + Vẽ 100% hình học chuẩn SGK trên nền trắng, không vẽ thêm chi tiết đời sống không liên quan.

QUY TẮC BỐ CỤC & TỌA ĐỘ AN TOÀN:
- Căn giữa toàn bộ mô hình trong khung viewBox="0 0 800 500" (tọa độ x: 80 - 720, y: 70 - 430).
- Chừa lề an toàn tối thiểu 40px xung quanh để chữ tên đỉnh và Mặt Trời không bị cắt viền.

${colorPaletteInstruction}
`;

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

    // Priority model fallback chain
    const defaultModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const MODELS = [
      defaultModel,
      ...(defaultModel !== 'gemini-3.6-flash' ? ['gemini-3.6-flash'] : []),
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
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
          const testClean = sanitizeSvg(result.text);
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
      success: true,
      svg: cleanedSvg,
      remainingCredits,
    });
  } catch (error: any) {
    console.error('DEBUG CHI TIẾT LỖI TẠI GENERATE API:', error);
    const actualMessage =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.error?.message ||
      error?.message ||
      (typeof error === 'string' ? error : JSON.stringify(error));

    const errorStatus = error?.status || error?.statusCode || 500;

    return NextResponse.json(
      {
        error: actualMessage,
        details: String(error?.stack || error),
      },
      { status: errorStatus >= 400 && errorStatus < 600 ? errorStatus : 500 }
    );
  }
}
