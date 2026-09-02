import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const KATEX_DEFS_BLOCK = `<defs>
    <style>
      @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');
      @import url('https://fonts.googleapis.com/css2?family=KaTeX_Main:ital,wght@0,400;0,700;1,400&amp;display=swap');
      
      .math-label {
        font-family: 'KaTeX_Math', 'KaTeX_Main', 'Times New Roman', serif;
        font-style: italic;
        font-size: 15px;
        text-anchor: middle;
        dominant-baseline: central;
      }
      .math-number, .math-unit {
        font-family: 'KaTeX_Main', 'Times New Roman', serif;
        font-style: normal;
        font-size: 13px;
        text-anchor: middle;
        dominant-baseline: central;
      }
    </style>
  </defs>`;

// Helper function to sanitize and extract ONLY valid, clean SVG content with KaTeX styles
function sanitizeSvg(svgString: string): string {
  // 1. Trích xuất đúng khối <svg>...</svg>
  const match = svgString.match(/<svg[\s\S]*?<\/svg>/i);
  let clean = match ? match[0] : svgString.replace(/```xml|```svg|```/g, '').trim();

  // 2. Xóa các thẻ text dài (thường là đề bài hoặc lời giải chứa từ 20 ký tự trở lên)
  clean = clean.replace(/<text[^>]*>([^<]{20,})<\/text>/gi, '');

  // 3. Đảm bảo có định nghĩa KaTeX Math font defs
  if (!clean.includes('math-label') || !clean.includes('KaTeX_Main')) {
    if (clean.includes('<defs>')) {
      clean = clean.replace('<defs>', `<defs>\n    <style>\n      @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');\n      @import url('https://fonts.googleapis.com/css2?family=KaTeX_Main:ital,wght@0,400;0,700;1,400&amp;display=swap');\n      .math-label { font-family: 'KaTeX_Math', 'KaTeX_Main', 'Times New Roman', serif; font-style: italic; font-size: 15px; text-anchor: middle; dominant-baseline: central; }\n      .math-number, .math-unit { font-family: 'KaTeX_Main', 'Times New Roman', serif; font-style: normal; font-size: 13px; text-anchor: middle; dominant-baseline: central; }\n    </style>`);
    } else {
      clean = clean.replace(/(<svg[^>]*>)/i, `$1\n  ${KATEX_DEFS_BLOCK}`);
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

    // 3. Gemini API setup
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server chưa thiết lập GEMINI_API_KEY trong môi trường.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const colorPaletteInstruction =
      styleMode === 'monochrome'
        ? `BẢNG MÀU ĐỀ THI / IN ẤN (MONOCHROME PRINT MODE):
1. Nền và màu sắc: Nền trắng tinh (#ffffff). Toàn bộ nét vẽ đều màu đen stroke="#000000" với stroke-width="2.2".
2. Nét phụ / đường gióng / đường cao: stroke="#000000", stroke-dasharray="4 4", stroke-width="1.5".
3. Điểm đỉnh (Dots): Vòng tròn r="3.5", fill="#000000".
4. Chữ tên đỉnh và số đo: fill="#000000", class="math-label" cho tên điểm đỉnh, class="math-number" cho số đo.
5. Đối tượng thực tế (mặt đất, bờ tường, cây, thang): Dùng nét vẽ đơn sắc đen trắng, gạch bóng mờ hoặc nét đứt gạch chéo (pattern/hatch), TUYỆT ĐỐI KHÔNG dùng màu xanh, cam, vàng hay các màu sặc sỡ để tối ưu cho việc in đề thi A4.`
        : `BẢNG MÀU BÀI GIẢNG TRỰC QUAN (COLOR PEDAGOGY MODE):
1. Nét vẽ hình học chính (các cạnh tam giác, hình chiếu): Đồng nhất 1 màu duy nhất stroke="#2563eb" (Blue 600), độ dày stroke-width="2.5".
2. Nét phụ / đường gióng / nét đứt: Màu stroke="#94a3b8" (Slate 400), stroke-dasharray="4 4", stroke-width="1.5".
3. Điểm đỉnh (Dots): Vòng tròn bán kính r="4", fill="#1e293b".
4. Chữ tên đỉnh (A, B, C...): Màu fill="#0f172a", font-weight="bold", class="math-label".
5. Ký hiệu góc & số đo góc: Đồng nhất màu stroke="#d97706" và fill="#d97706" (Amber 600) cho toàn bộ các góc, class="math-number".`;

    const systemInstruction = `Bạn là một trình biên dịch đồ họa vector. Nhiệm vụ duy nhất: Đọc đề bài toán (từ văn bản hoặc tự động đọc nội dung đề bài trong ảnh OCR nếu có) và xuất ra MÃ SVG HỢP LỆ.

NGHIÊM CẤM: Không viết lời mở đầu, không tóm tắt đề bài, không giải thích các bước giải, không viết chữ markdown ngoài thẻ <svg>.
BẮT BUỘC: Đầu ra phải bắt đầu chính xác bằng '<svg' và kết thúc chính xác bằng '</svg>'.

${colorPaletteInstruction}

QUY TẮC ĐỊNH DẠNG FONT CHỮ TOÁN HỌC LATEX (KATEX MATH):
- LUÔN CHÈN ĐỊNH NGHĨA FONT TOÁN HỌC TRONG THẺ <defs> Ở ĐẦU SVG:
  <defs>
    <style>
      @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');
      @import url('https://fonts.googleapis.com/css2?family=KaTeX_Main:ital,wght@0,400;0,700;1,400&amp;display=swap');
      
      .math-label {
        font-family: 'KaTeX_Math', 'KaTeX_Main', 'Times New Roman', serif;
        font-style: italic;
        font-size: 15px;
        text-anchor: middle;
        dominant-baseline: central;
      }
      .math-number, .math-unit {
        font-family: 'KaTeX_Main', 'Times New Roman', serif;
        font-style: normal;
        font-size: 13px;
        text-anchor: middle;
        dominant-baseline: central;
      }
    </style>
  </defs>

- QUY TẮC GÁN CLASS CHO CÁC THẺ <text>:
  + Tên điểm đỉnh, biến số (A, B, C, D, H, S, x, y, h, α...): Dùng class="math-label" (chữ nghiêng chuẩn toán học LaTeX).
  + Giá trị số đo, góc, kích thước (30°, 45°, 60°, 5m, 12cm, 3,5m): Dùng class="math-number" (chữ đứng chuẩn KaTeX).

QUY TẮC NỘI DUNG CHỮ TRONG SVG:
+ TUYỆT ĐỐI KHÔNG tạo các thẻ <text> chứa nội dung đề bài, tóm tắt đề, công thức tính toán hoặc các bước giải bài toán.
+ CHỈ ĐƯỢC PHÉP dùng thẻ <text> cho 3 mục đích duy nhất:
  1. Tên điểm hình học (ví dụ: A, B, C, H) với class="math-label".
  2. Số đo góc (ví dụ: 60°, 45°, α) với class="math-number".
  3. Nhãn kích thước ngắn cạnh đối tượng (ví dụ: 5m, 12cm, h = ?, x) với class="math-number".
+ Toàn bộ khung canvas SVG chỉ tập trung vào hình vẽ đối tượng thực tế và mô hình hình học.

QUY TẮC BẢO VỆ NHÃN SỐ ĐO (CHỐNG ĐÈ LÊN ĐƯỜNG KẺ 100%):
1. Kỹ thuật Text-Halo (Mặt nạ nền chữ): Mọi thẻ <text> hiển thị số đo (ví dụ: "3,5", "1,5m", "x") BẮT BUỘC phải kèm thuộc tính viền trắng dày để tự động xóa đường kẻ chạy ngang qua:
   paint-order="stroke fill" stroke="#ffffff" stroke-width="6" stroke-linejoin="round"
2. Tọa độ nhãn:
   - Cạnh đứng: Dịch sang trái hoặc phải đoạn thẳng ít nhất 16px.
   - Cạnh ngang: Dịch lên trên hoặc xuống dưới đoạn thẳng ít nhất 16px.
   - Cạnh xiên: Đặt nhãn tại trung điểm nhưng dịch theo vector pháp tuyến (vuông góc) ra phía ngoài ít nhất 18px.
3. Vị trí tên điểm (A, B, C...):
   - Đặt lệch ra ngoài đỉnh ít nhất 12px, không để chấm tròn đỉnh (dot) che khuất chữ.
4. Vị trí nhãn góc (như góc B, góc C):
   - Nhãn chữ/số đo góc phải nằm hẳn vào trong lòng cung tròn hoặc nằm gọn bên trong miền tam giác, không dính vào đường cung góc.
5. Thứ tự layer trong SVG:
   - Toàn bộ các thẻ <text> phải luôn được đặt ở cuối cùng trong file SVG (ngay trước thẻ đóng </svg>) để layer chữ luôn nổi lên trên cùng của hình vẽ.

Yêu cầu kỹ thuật đồ họa SVG:
1. Khung hình (viewBox): viewBox="0 0 650 420"
2. Phong cách: Trực quan, hiện đại, phối màu sư phạm rõ ràng (stroke/fill tương phản tốt).
3. Góc vuông: Ký hiệu góc vuông chính xác tại các giao điểm vuông góc.`;

    const contents: Array<string | { inlineData: { data: string; mimeType: string } }> = [];

    if (promptText) {
      contents.push(promptText);
    }

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          data: cleanBase64,
          mimeType,
        },
      });
    }

    const MODEL_CASCADE = [
      process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
    ].filter((v, i, a) => a.indexOf(v) === i);

    let response: any = null;
    let lastError: any = null;
    let usedModel = MODEL_CASCADE[0];
    const maxRetriesPerModel = 2;

    for (const modelName of MODEL_CASCADE) {
      for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
        try {
          console.log(
            `[AI Cascade] Đang thử với model: ${modelName} (Lần thử ${attempt + 1}/${maxRetriesPerModel + 1})...`
          );
          response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              temperature: 0.1,
            },
          });
          if (response?.text) {
            usedModel = modelName;
            console.log(`[AI Cascade] Thành công với model: ${modelName}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          const statusCode = err?.status || err?.statusCode || err?.response?.status;
          const errMsg = String(err?.message || '').toLowerCase();

          const isSpike =
            statusCode === 503 ||
            statusCode === 429 ||
            errMsg.includes('503') ||
            errMsg.includes('429') ||
            errMsg.includes('high demand') ||
            errMsg.includes('overloaded') ||
            errMsg.includes('resource exhausted');

          if (isSpike && attempt < maxRetriesPerModel) {
            const delay = (attempt + 1) * 1200 + Math.random() * 500;
            console.warn(
              `[AI Cascade] Model ${modelName} gặp lỗi tạm thời (${statusCode || 'Spike'}). Thử lại sau ${Math.round(delay)}ms...`
            );
            await new Promise((res) => setTimeout(res, delay));
            continue;
          }

          console.warn(
            `[AI Cascade] Model ${modelName} gặp lỗi (${statusCode || 'Unknown'}): ${err?.message || ''}. Chuyển model kế tiếp trong chuỗi cascade...`
          );
          break;
        }
      }
      if (response?.text) {
        break;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Toàn bộ cụm model đều không khả dụng.');
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
    console.error('Error generating math SVG:', error);
    return NextResponse.json(
      { error: error?.message || 'Đã xảy ra lỗi trong quá trình sinh hình SVG.' },
      { status: 500 }
    );
  }
}
