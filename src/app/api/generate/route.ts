import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { optimizeSvg } from '@/lib/svgOptimizer';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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

    const systemInstruction = `Bạn là chuyên gia hàng đầu về Đồ Họa Vector Toán Học (MathViz Engine).
Nhiệm vụ của bạn: Phân tích bài toán (từ văn bản hoặc ảnh OCR) và sinh ra MÃ SVG CHUẨN SƯ PHẠM, ĐẸP MẮT, CHÍNH XÁC VÀ NỔI BẬT KHUNG HÌNH HỌC TOÁN HỌC.

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
2. Điểm & Nhãn tên điểm (Tránh đè chữ lên nét vẽ):
   - Mọi đỉnh, tâm, giao điểm: Chấm tròn <circle cx="..." cy="..." r="4.5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />.
   - Nhãn tên điểm (A, B, C, O, I, R, M, N, H, K, S...): Dùng <text font-size="20" font-weight="bold" fill="#0f172a">, BẮT BUỘC DỊCH RA NGOÀI tam giác/đa giác tối thiểu 18px - 24px:
     + Đỉnh A ở trên cùng: x = x_A, y = y_A - 18 (text-anchor="middle").
     + Chân B ở góc dưới bên trái: x = x_B - 22, y = y_B + 20 (text-anchor="end").
     + Mút C ở góc dưới bên phải: x = x_C + 22, y = y_C + 20 (text-anchor="start").
3. Ký hiệu góc & Góc vuông:
   - Góc vuông (90°): Luôn có ô vuông nhỏ (12x12px đến 14x14px) bằng <path d="M ... L ... L ..." fill="none" stroke="#2563eb" stroke-width="2" /> tại mọi góc vuông (chân đường cao, chân tường, chân hải đăng, tiếp điểm tiếp tuyến).
   - THUẬT TOÁN TOÁN HỌC CHUẨN XÁC DỰNG CUNG TRÒN GÓC SVG (SVG ANGLE ARC CHỐNG LÕM):
     + Quét từ Vector 1 (u1 hướng tới P1) sang Vector 2 (u2 hướng tới P2) quanh đỉnh V bán kính r = 32px:
       * a1 = Math.atan2(P1.y - V.y, P1.x - V.x)
       * a2 = Math.atan2(P2.y - V.y, P2.x - V.x)
       * diff = ((a2 - a1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI
       * sweep_flag = diff > 0 ? 1 : 0
       * Đường vẽ: <path d="M \${V.x + r*Math.cos(a1)} \${V.y + r*Math.sin(a1)} A \${r} \${r} 0 0 \${sweep_flag} \${V.x + r*Math.cos(a2)} \${V.y + r*Math.sin(a2)}" fill="none" stroke="#ea580c" stroke-width="2.5" />
       * Nhãn góc (vd: "60°", "30°", "α"): Đặt tại hướng phân giác a_mid = a1 + diff/2 với khoảng cách r + 16px từ đỉnh V.
     + Cung luôn là một phần của đường tròn tâm V, có bề lồi hướng ra phía trong miền góc và quay lưng lại với đỉnh.
4. Kích thước & Số đo (Text Offset & Collision Avoidance):
   - Cạnh đứng (chiều cao h, AB): Dịch sang bên trái cạnh ít nhất 22px (text-anchor="end").
   - Cạnh đáy (bóng nắng, khoảng cách BC): Dịch xuống dưới đáy ít nhất 24px (text-anchor="middle").
   - Cạnh nghiêng / Cạnh huyền: Dịch vuông góc ra ngoài tối thiểu 20px, tuyệt đối không để số đo bị nét vẽ cắt ngang qua chữ.

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

III. QUY TẮC ĐỐI VỚI BÀI TOÁN THỰC TẾ (REAL-WORLD MATH VISUALIZATION):
- Lớp 1: Khung tam giác/hình học toán học chính luôn nằm đè lên trên cùng với nét đậm nổi bật.
- Lớp 2: Hình minh họa thực tế phụ (ngọn hải đăng, thang, tường gạch, mặt biển, tòa nhà, tán cây, mặt đất...): Vẽ làm nền mờ phía dưới (opacity 0.35 - 0.7), KHÔNG ĐƯỢC lấn át hay thay thế khung toán học chính.
- BÀI TOÁN CHIẾC THANG DỰA TƯỜNG (LADDER ALIGNMENT):
  + Cạnh huyền hình học AC và trục thân của chiếc thang BẮT BUỘC PHẢI TRÙNG NHAU 100%:
    * Đỉnh trên của thang đặt chính xác tại tâm điểm A(x_A, y_A).
    * Chân thang đặt chính xác tại tâm điểm C(x_C, y_C).
    * Đường thẳng hình học nét đậm (stroke="#2563eb" stroke-width="3.5") nối trực tiếp từ A đến C dọc chính giữa thân thang, các bậc thang vẽ vuông góc với trục AC.
- THUẬT TOÁN VECTOR CHUẨN ĐỒNG TRỤC CHO BÀI TOÁN BÓNG NẮNG / MẶT TRỜI:
  + Cho tam giác vuông ABC tại B trên mặt đất:
    * B(x_B, y_B): Chân cây / chân vật thể (góc vuông 90° tại chân, y_B ≈ 410 - 425).
    * A(x_A, y_A): Ngọn cây / đỉnh vật thể (thẳng đứng ngay trên B, x_A = x_B, y_A = y_B - h ≈ 180 - 240).
    * C(x_C, y_C): Mút bóng nắng trên mặt đất (y_C = y_B, x_C = x_B + d hoặc x_B - d).
  + Tọa độ Tia Nắng & Tâm Mặt Trời S(x_S, y_S):
    * Vector tia sáng từ C qua A: vec(CA) = (x_A - x_C, y_A - y_C).
    * Đường tia nắng BẮT BUỘC là đoạn thẳng kéo dài từ C qua A lên Mặt Trời S (đồng trục 100%).
    * Tọa độ tâm Mặt Trời S:
      x_S = x_A + 0.45 * (x_A - x_C)
      y_S = y_A + 0.45 * (y_A - y_C)
    * Đảm bảo y_S ≥ 70px để Mặt Trời không bị chạm trần.
    * Tia nắng nối dài: <line x1="x_S" y1="y_S" x2="x_C" y2="y_C" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6 4" />.
    * Icon Mặt Trời: <circle cx="x_S" cy="y_S" r="20" fill="#fbbf24" stroke="#d97706" stroke-width="2" /> kèm 8 tia sáng ngắn xung quanh tâm S.

IV. BỐ CỤC & TỌA ĐỘ AN TOÀN:
- Căn giữa toàn bộ mô hình trong khung viewBox="0 0 800 500" (tọa độ x: 80 - 720, y: 60 - 440).
- Chừa lề an toàn tối thiểu 40px xung quanh để các chữ tên đỉnh và số đo không bị cắt viền.

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
          const testClean = optimizeSvg(result.text);
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
    const cleanedSvg = optimizeSvg(rawText);

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
