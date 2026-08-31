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
    // 1. Authenticate via Header X-License-Key
    const licenseKey = req.headers.get('x-license-key') || req.headers.get('X-License-Key');
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
      where: { key: licenseKey.trim() },
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
- Chữ tên đỉnh (A, B, C...): fill="#0f172a", font-weight="bold", font-size="18", font-family="sans-serif".
- Ký hiệu góc & số đo: stroke="#ea580c" và fill="#ea580c" (Orange 600) font-weight="bold".`;

    const systemInstruction = `Bạn là chuyên gia hàng đầu về Đồ Họa Vector Toán Học (MathViz Engine).
Nhiệm vụ của bạn: Phân tích bài toán (từ văn bản hoặc ảnh OCR) và sinh ra MÃ SVG CHUẨN SƯ PHẠM, ĐẦY ĐỦ, CHÍNH XÁC VÀ NỔI BẬT HÌNH HỌC TOÁN HỌC.

CHỈ THỊ CỐT LÕI QUAN TRỌNG NHẤT:
"Mục tiêu cao nhất của hình vẽ là PHỤC VỤ GIẢI TOÁN HÌNH HỌC. Khung hình học cốt lõi (tam giác, tứ giác, đường tròn, tiếp tuyến, góc vuông, cung góc, tên điểm, số đo) PHẢI LUÔN XUẤT HIỆN ĐẦY ĐỦ VÀ NẰM Ở VỊ TRÍ NỔI BẬT NHẤT trên bản vẽ."

BẮT BUỘC VỀ ĐẦU RA:
1. Đầu ra CHỈ LÀ MÃ SVG bắt đầu bằng '<svg' và kết thúc bằng '</svg>'. Không viết lời mở đầu, không kèm code markdown hay giải thích ngoài thẻ svg.
2. Thẻ SVG gốc bắt buộc: <svg viewBox="0 0 800 500" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">.

I. BỘ QUY TẮC HÌNH HỌC CỐT LÕI (CORE GEOMETRY - ÁP DỤNG CHO MỌI DẠNG BÀI: HÌNH PHẲNG, ĐƯỜNG TRÒN, TOÁN THỰC TẾ):
1. Nét vẽ hình học chính:
   - Các cạnh đa giác, đường tròn, dây cung, tiếp tuyến: Dùng <line>, <path>, <polygon>, <circle> nét đậm (stroke="#2563eb" hoặc stroke="#0f172a", stroke-width="2.5" đến "3.5", stroke-linejoin="round").
   - Đường phụ, đường kéo dài, đường ngắm/chiều cao phụ: Dùng stroke-dasharray="5 4" nét đứt rõ ràng.
   - Với bài toán thực tế (chiếc thang AC, ngọn hải đăng AB...): Cạnh toán học màu xanh dương #2563eb BẮT BUỘC CHẠY LIÊN TỤC TỪ ĐỈNH NÀY ĐẾN ĐỈNH KIA, hình minh họa chỉ là lớp vẽ phụ làm nền phía dưới.
2. Điểm & Nhãn tên điểm:
   - Mọi đỉnh, tâm, giao điểm: Chấm tròn <circle cx="..." cy="..." r="4.5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />.
   - Nhãn tên điểm: Dùng <text font-size="20" font-weight="bold" fill="#0f172a"> (A, B, C, O, I, R, M, N, H, K, S...).
3. Ký hiệu góc & Góc vuông:
   - Góc vuông (90°): Luôn có ô vuông nhỏ (12x12px đến 14x14px) bằng <path d="M ... L ... L ..." fill="none" stroke="#2563eb" stroke-width="2" /> tại mọi góc vuông (chân đường cao, chân tường, chân hải đăng, tiếp điểm tiếp tuyến).
   - THUẬT TOÁN TOÁN HỌC DỰNG CUNG TRÒN GÓC SVG (SVG ANGLE ARC CHUẨN XÁC CHO MỌI ĐỈNH & MỌI HƯỚNG):
     + Để vẽ cung góc tại đỉnh V(x_V, y_V) giữa 2 tia hướng tới P1 và P2 (bán kính r ≈ 28 - 35px):
       * Tính góc cực của tia 1: theta1 = Math.atan2(y_P1 - y_V, x_P1 - x_V)
       * Tính góc cực của tia 2: theta2 = Math.atan2(y_P2 - y_V, x_P2 - x_V)
       * Điểm đầu S trên tia 1: S_x = x_V + r * Math.cos(theta1), S_y = y_V + r * Math.sin(theta1)
       * Điểm cuối E trên tia 2: E_x = x_V + r * Math.cos(theta2), E_y = y_V + r * Math.sin(theta2)
       * Độ chênh lệch góc quét: dTheta = theta2 - theta1. Chuẩn hóa dTheta về [-PI, PI].
       * Quy tắc Sweep Flag: Nếu dTheta > 0 (quay theo chiều kim đồng hồ từ S sang E): sweep_flag = 1. Nếu dTheta < 0: sweep_flag = 0.
       * Lệnh vẽ <path>: <path d="M S_x S_y A r r 0 0 sweep_flag E_x E_y" fill="none" stroke="#ea580c" stroke-width="2.5" />
       * Đảm bảo cung luôn cong phồng lồi ra xa đỉnh V, tuyệt đối không bị lõm úp vào đỉnh.
     + QUY CHUẨN RIÊNG CHO GÓC HẠ (DEPRESSION ANGLE) TẠI ĐỈNH HẢI ĐĂNG / TÒA NHÀ A:
       * Tia 1 (Đường nằm ngang tham chiếu Ax kẻ nét đứt sang phải): theta1 = 0 rad (hướng ngang sang phải từ A).
       * Tia 2 (Tia ngắm AC hướng chéo xuống thuyền C): theta2 = Math.atan2(y_C - y_A, x_C - x_A) (theta2 > 0).
       * Điểm đầu trên tia Ax: S = (x_A + r, y_A).
       * Điểm cuối trên tia AC: E = (x_A + r * Math.cos(theta2), y_A + r * Math.sin(theta2)).
       * Lệnh vẽ cung góc hạ: <path d="M \${x_A + r} \${y_A} A \${r} \${r} 0 0 1 \${E_x} \${E_y}" fill="none" stroke="#ea580c" stroke-width="2.5" />
       * Nhãn góc hạ (vd: "25°", "30°", "α"): Đặt tại góc phân giác theta_mid = theta2 / 2, tọa độ = (x_A + (r + 16) * Math.cos(theta_mid), y_A + (r + 16) * Math.sin(theta_mid)).
     + Vị trí nhãn đo góc (ví dụ: '60°', 'α', '30°'): Đặt trên tia phân giác tại Tọa độ = V + (r + 14) * (u1 + u2) / dist(u1 + u2), nằm gọn gàng bên ngoài cung tròn, không bị đường cong đè lên chữ.
4. Kích thước & Số đo:
   - Số đo ngắn gọn dóng dọc theo cạnh tương ứng (ví dụ: '4m', '1.5m', '45m', '10cm', 'R', 'h = ?', 'd = ?').

II. QUY CHUẨN CHUYÊN SÂU CHO DẠNG HÌNH TRÒN & ĐƯỜNG TRÒN (CIRCLE GEOMETRY):
- Đường tròn (O; R):
  + Tâm O: Chấm tròn đậm + nhãn chữ 'O'.
  + Đường bao tròn: <circle cx="..." cy="..." r="..." fill="none" stroke="#2563eb" stroke-width="2.5" /> (có thể thêm fill="#2563eb" fill-opacity="0.04" để tạo chiều sâu).
- Bán kính R, Đường kính AB (qua O), Dây cung CD: Nối đoạn thẳng rõ ràng từ tâm hoặc giữa 2 điểm trên đường tròn.
- Tiếp tuyến của đường tròn:
  + Tiếp tuyến tại tiếp điểm A: Kẻ đường thẳng tiếp xúc với đường tròn tại A.
  + BẮT BUỘC có ký hiệu vuông góc giữa bán kính OA và tiếp tuyến tại tiếp điểm A.
  + Hai tiếp tuyến cắt nhau từ điểm M ngoài đường tròn: Kẻ MA, MB tiếp xúc tại A và B; nối đoạn OM bằng nét đứt; ký hiệu góc vuông tại A và B.
- Góc ở tâm, Góc nội tiếp, Tứ giác nội tiếp:
  + Kẻ đầy đủ các tia tạo thành góc, cung tròn ký hiệu góc chắn cung.
  + Tứ giác nội tiếp: 4 đỉnh nằm chính xác trên đường tròn.
- Hình quạt tròn / Hình viên phân / Diện tích:
  + Nếu đề bài yêu cầu tính diện tích: Tô màu nền nhẹ fill="#3b82f6" fill-opacity="0.15".

III. QUY TẮC ĐỐI VỚI BÀI TOÁN THỰC TẾ & BÓNG MẶT TRỜI (SUN RAY & SHADOW MATH):
- Lớp 1: Khung tam giác/hình học toán học chính luôn nằm đè lên trên cùng với nét đậm nổi bật.
- Lớp 2: Hình minh họa thực tế phụ (ngọn hải đăng, thang, tường gạch, mặt biển, tòa nhà, tán cây, mặt đất...): Vẽ làm nền mờ phía dưới (opacity 0.35 - 0.7), KHÔNG ĐƯỢC lấn át hay thay thế khung toán học chính.
- THUẬT TOÁN VECTOR CHUẨN ĐỒNG TRỤC CHO BÀI TOÁN BÓNG NẮNG / MẶT TRỜI:
  + Cho tam giác vuông ABC tại B trên mặt đất:
    * B(x_B, y_B): Chân cây / chân vật thể (góc vuông 90° tại chân, y_B ≈ 410 - 425).
    * A(x_A, y_A): Ngọn cây / đỉnh vật thể (thẳng đứng ngay trên B, x_A = x_B, y_A = y_B - h ≈ 180 - 240).
    * C(x_C, y_C): Mút bóng nắng trên mặt đất (y_C = y_B, x_C = x_B + d hoặc x_B - d).
  + Tọa độ Tia Nắng & Tâm Mặt Trời S(x_S, y_S):
    * Vector tia sáng từ C qua A: vec(CA) = (x_A - x_C, y_A - y_C).
    * Đường tia nắng BẮT BUỘC là đoạn thẳng kéo dài từ C qua A lên Mặt Trời S (đồng trục 100%).
    * Tọa độ tâm Mặt Trời S:
      x_S = x_A + 0.5 * (x_A - x_C)
      y_S = y_A + 0.5 * (y_A - y_C)
    * Đảm bảo y_S >= 50 (nếu y_S < 50, hãy scale giảm chiều cao h của tam giác để y_S >= 60, không chạm viền trên).
  + Cú pháp SVG chuẩn xác:
    * Tia nắng mặt trời (nét đứt xuyên suốt từ S qua A đến C):
      <line x1="\${x_S}" y1="\${y_S}" x2="\${x_C}" y2="\${y_C}" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="5 5" />
    * Cạnh huyền hình học AC (nét liền xanh dương chạy từ A đến C):
      <line x1="\${x_A}" y1="\${y_A}" x2="\${x_C}" y2="\${y_C}" stroke="#2563eb" stroke-width="3" />
    * Icon Mặt Trời: Vẽ tại đúng tâm cx="\${x_S}" cy="\${y_S}" với <circle cx="\${x_S}" cy="\${y_S}" r="20" fill="#fbbf24" stroke="#d97706" stroke-width="2" /> và các tia sáng xung quanh.
    * Cung góc tại C: Dùng đúng công thức SVG Arc với điểm đầu/cuối trên 2 cạnh CA và CB, lồi về phía lòng góc, nhãn góc (vd: "60°", "α") đặt trên đường phân giác góc C.

IV. QUY TẮC VÙNG ĐỆM AN TOÀN & BỐ CỤC (SAFE BOUNDING BOX):
- Tọa độ x: từ 50 đến 750 (viewBox rộng 800).
- Tọa độ y: từ 60 đến 440 (viewBox cao 500).
- TUYỆT ĐỐI KHÔNG để bất kỳ nét vẽ hoặc nhãn chữ nào có tọa độ y < 50 hoặc y > 470 để tránh bị cắt viền.

V. QUY TẮC NGHIÊM NGẶT VỀ CHỮ (LOẠI BỎ TOÀN BỘ CHỮ THỪA):
- TUYỆT ĐỐI KHÔNG chèn: Tiêu đề hình, lời giải bài toán, nội dung đề bài, tên đối tượng dài.
- CHỈ ĐƯỢC PHÉP giữ lại DUY NHẤT 3 loại ký hiệu toán học tối giản trong các thẻ <text>:
  1. Tên các điểm/đỉnh: Dạng 1 chữ cái in hoa đơn lẻ như A, B, C, H, O, S, M, N, I, K (font-size="20" font-weight="bold").
  2. Số đo kích thước bài toán: Dạng siêu ngắn gọn kèm đơn vị như "8m", "6m", "50m", "x", "h", "R", "d = ?" (font-size="16" font-weight="bold").
  3. Ký hiệu góc & số đo góc: Dạng ngắn như "30°", "45°", "60°", "α", "β", "φ" (font-size="16" font-weight="bold").

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
