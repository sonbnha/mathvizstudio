import { GoogleGenAI } from '@google/genai';

/**
 * Chuỗi model fallback nghiêm ngặt theo yêu cầu
 */
export const MODEL_CASCADE = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
];

export const STORAGE_KEY_USER_GEMINI = 'user_gemini_api_key';

/**
 * Lấy API key khả dụng: ưu tiên key truyền vào -> key lưu trong localStorage -> NEXT_PUBLIC_GEMINI_API_KEY
 */
export function getEffectiveApiKey(explicitKey?: string): string {
  if (explicitKey && explicitKey.trim()) {
    return explicitKey.trim();
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_USER_GEMINI);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  }
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
}

export interface GenerateMathOptions {
  prompt: string;
  imageInlineData?: { data: string; mimeType: string };
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  apiKey?: string;
}

/**
 * Hàm gọi Google Gemini API trực tiếp từ Client với cơ chế Cascade Fallback tự động
 */
export async function generateMathWithFallback({
  prompt,
  imageInlineData,
  systemInstruction,
  temperature = 0.2,
  maxOutputTokens,
  apiKey,
}: GenerateMathOptions): Promise<{ text: string; modelUsed: string }> {
  const effectiveKey = getEffectiveApiKey(apiKey);
  if (!effectiveKey) {
    throw new Error(
      'Chưa cấu hình NEXT_PUBLIC_GEMINI_API_KEY hoặc chưa nhập Gemini API Key cá nhân. Vui lòng bấm nút "Gemini Key" ở góc trên bên phải để nhập Key tiếp tục.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey: effectiveKey,
  });

  let lastError: any = null;

  for (const modelName of MODEL_CASCADE) {
    try {
      console.log(`[Client AI] Đang thử với model: ${modelName}...`);

      const contents: any[] = [];
      if (imageInlineData) {
        contents.push({
          inlineData: {
            data: imageInlineData.data,
            mimeType: imageInlineData.mimeType,
          },
        });
      }
      contents.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: temperature,
          ...(maxOutputTokens ? { maxOutputTokens } : {}),
        },
      });

      if (response && response.text) {
        console.log(`[Client AI] Thành công với model: ${modelName}`);
        return { text: response.text, modelUsed: modelName };
      }
    } catch (err: any) {
      console.warn(`[Client AI] Model ${modelName} thất bại:`, err?.message || err);
      lastError = err;
      // Tiếp tục vòng lặp fallback sang model kế tiếp
    }
  }

  throw new Error(
    `Tất cả model trong chuỗi đều thất bại. Lỗi cuối: ${lastError?.message || lastError}`
  );
}

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

/**
 * Trích xuất và làm sạch chuỗi SVG, đảm bảo có KaTeX font defs
 */
export function sanitizeSvg(svgString: string): string {
  const match = svgString.match(/<svg[\s\S]*?<\/svg>/i);
  let clean = match ? match[0] : svgString.replace(/```xml|```svg|```/g, '').trim();

  clean = clean.replace(/<text[^>]*>([^<]{20,})<\/text>/gi, '');

  if (!clean.includes('math-label') || !clean.includes('KaTeX_Main')) {
    if (clean.includes('<defs>')) {
      clean = clean.replace(
        '<defs>',
        `<defs>\n    <style>\n      @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');\n      @import url('https://fonts.googleapis.com/css2?family=KaTeX_Main:ital,wght@0,400;0,700;1,400&amp;display=swap');\n      .math-label { font-family: 'KaTeX_Math', 'KaTeX_Main', 'Times New Roman', serif; font-style: italic; font-size: 15px; text-anchor: middle; dominant-baseline: central; }\n      .math-number, .math-unit { font-family: 'KaTeX_Main', 'Times New Roman', serif; font-style: normal; font-size: 13px; text-anchor: middle; dominant-baseline: central; }\n    </style>`
      );
    } else {
      clean = clean.replace(/(<svg[^>]*>)/i, `$1\n  ${KATEX_DEFS_BLOCK}`);
    }
  }

  return clean.trim();
}

/**
 * Xây dựng system instruction cho mô hình hình học
 */
export function buildGeometrySystemInstruction(styleMode: 'color' | 'monochrome'): string {
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

  return `Bạn là một trình biên dịch đồ họa vector. Nhiệm vụ duy nhất: Đọc đề bài toán (từ văn bản hoặc tự động đọc nội dung đề bài trong ảnh OCR nếu có) và xuất ra MÃ SVG HỢP LỆ.

NGHIÊM CẤM: Không viết lời mở đầu, không tóm tắt đề bài, không giải thích các bước giải, không viết chữ markdown ngoài thẻ <svg>.
BẮT BUỘC: Đầu ra phải bắt đầu chính xác bằng '<svg' và kết thúc chính xác bằng '</svg>'.

${colorPaletteInstruction}

QUY TẮC ĐỊNH DẠNG FONT CHỮ TOÁN HỌC LATEX (KATEX MATH):
- LUÔN CHÈN ĐỊNH NGHĨA FONT TOÁN HỌC TRONG THẺ <defs> Ở ĐẦU SVG:
  ${KATEX_DEFS_BLOCK}

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
}

/**
 * Trích xuất chữ đề bài từ ảnh (OCR) trực tiếp trên Client
 */
export async function extractOcrTextFromImage({
  imageBase64,
  mimeType = 'image/png',
  apiKey,
}: {
  imageBase64: string;
  mimeType?: string;
  apiKey?: string;
}): Promise<string> {
  const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const systemInstruction = `Bạn là chuyên gia OCR tài liệu toán học sư phạm. Nhiệm vụ của bạn là nhận diện và trích xuất nguyên văn toàn bộ đề bài/nội dung câu hỏi từ ảnh được cung cấp.
- Giữ nguyên văn phong, câu chữ tiếng Việt, các ký hiệu và công thức toán học dưới định dạng LaTeX chuẩn ($...$ hoặc $$...$$).
- Không thêm bất kỳ lời chào, giải thích, bình luận hay lời giải nào ngoài nội dung đề bài trong ảnh.
- Bỏ qua các chi tiết thừa như số trang, watermark, tên trung tâm không thuộc nội dung câu hỏi.`;

  const result = await generateMathWithFallback({
    prompt: 'Hãy đọc và trích xuất chính xác toàn bộ nội dung câu hỏi/đề bài toán trong hình ảnh này.',
    imageInlineData: {
      data: cleanData,
      mimeType,
    },
    systemInstruction,
    temperature: 0.1,
    apiKey,
  });

  return result.text.trim();
}

/**
 * Sinh hình học SVG trực tiếp trên Client
 */
export async function generateGeometrySvgClient({
  prompt,
  imageBase64,
  mimeType = 'image/png',
  styleMode = 'color',
  apiKey,
}: {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
  styleMode?: 'color' | 'monochrome';
  apiKey?: string;
}): Promise<{ svg: string; modelUsed: string }> {
  const systemInstruction = buildGeometrySystemInstruction(styleMode);
  let imageInlineData: { data: string; mimeType: string } | undefined;

  if (imageBase64) {
    const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    imageInlineData = {
      data: cleanData,
      mimeType,
    };
  }

  const promptText = prompt.trim() || 'Hãy đọc đề bài từ ảnh đính kèm và vẽ hình học minh họa bằng SVG.';

  const result = await generateMathWithFallback({
    prompt: promptText,
    imageInlineData,
    systemInstruction,
    temperature: 0.1,
    apiKey,
  });

  const cleanedSvg = sanitizeSvg(result.text);
  return {
    svg: cleanedSvg,
    modelUsed: result.modelUsed,
  };
}
