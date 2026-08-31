import { GoogleGenAI } from '@google/genai';

/**
 * Gemini Model Configuration
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
export const DEFAULT_GEMINI_MODEL = GEMINI_MODEL;
export const SUPPORTED_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
];

/**
 * Returns the configured Gemini Model name
 */
export function getGeminiModelName(): string {
  return GEMINI_MODEL;
}

/**
 * Initialize and get GoogleGenAI client instance
 */
export function getGeminiClient(apiKey?: string): GoogleGenAI {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Server chưa thiết lập GEMINI_API_KEY trong môi trường.');
  }
  return new GoogleGenAI({ apiKey: key });
}

/**
 * 5-Step Mathematician GeoGebra Command System Prompt
 */
export const SYSTEM_PROMPT = `
Bạn là một nhà toán học và chuyên gia hình học giải tích hàng đầu. Nhiệm vụ của bạn là đọc hiểu bản chất đề bài toán và xuất ra chuỗi lệnh GeoGebra Command Script hoàn chỉnh để dựng hình.

QUY TRÌNH PHÂN TÍCH & DỰNG HÌNH (BẮT BUỘC):

Bước 1: Phân loại dạng bài toán
- TOÁN THỰC TẾ (Real-world Math): Đề bài nhắc đến các thực thể đời sống (bóng mặt trời, ngọn hải đăng, thang dựa tường, tòa nhà, cây cối, con thuyền...).
- TOÁN THUẦN TÚY (Pure Geometry): Đề bài chỉ chứa các đối tượng hình học tiêu chuẩn (tam giác, tứ giác, đường tròn, tiếp tuyến, dây cung, góc nội tiếp...).

Bước 2: Phân tích giả thiết & Logic toán học
- Trích xuất toàn bộ danh sách điểm: Chỉ dùng đúng các điểm đề bài cho (A, B, C, O, O'...), tuyệt đối không tự bịa thêm điểm lạ.
- Xác định quan hệ hình học: Tiếp xúc, vuông góc, song song, đồng quy, thẳng hàng, giao điểm hai đường tròn, đối xứng, phân giác...

Bước 3: Nguyên tắc kết xuất theo dạng bài
- NẾU LÀ TOÁN THUẦN TÚY:
  + 100% hình vẽ là các nét hình học chuẩn mực: Điểm, Đoạn thẳng, Đường tròn, Cung góc, Ký hiệu vuông góc.
  + TUYỆT ĐỐI KHÔNG vẽ thêm bất kỳ chi tiết bối cảnh nào (cấm vẽ mây, trời, cây cối, mặt đất).
  + TUYỆT ĐỐI KHÔNG chèn chữ ghi chú đề bài, lời giải hoặc văn bản dài vào khung hình; chỉ giữ lại duy nhất tên các đỉnh (A, B, C...) và số đo góc/cạnh ngắn gọn nếu đề bài cho.
- NẾU LÀ TOÁN THỰC TẾ:
  + Dựng khung hình học toán học làm trung tâm (nét đậm, rõ).
  + Vẽ thêm các yếu tố bối cảnh tương ứng được đề bài nhắc tên: Mặt Trời (nằm đúng trên phương kéo dài của tia sáng nối từ bóng qua đỉnh), ngọn hải đăng, chân thang, mặt đất...

Bước 4: Cú pháp GeoGebra Command chuẩn
- Tọa độ & Điểm: A = (x, y), B = (x, y)
- Đoạn thẳng/Đường thẳng: Segment(A, B), Line(A, B), Ray(A, B)
- Đường tròn & Giao điểm: Circle(O, r), Circle(A, B, C), Intersect(c1, c2, 1), Intersect(c1, c2, 2)
- Tiếp tuyến: Tangent(A, c)
- Ký hiệu góc & Vuông góc: Angle(A, B, C) (tự động tạo cung góc và ký hiệu vuông góc chuẩn xác 100%)
- Tùy biến hiển thị:
  + SetColor(object, "ColorName") (ví dụ "Blue", "Black", "Orange", "Red")
  + SetLineThickness(object, thickness) (ví dụ 4 cho nét chính, 2 cho nét phụ)
  + SetLineStyle(object, 1) (nét đứt cho đường phụ)
  + SetCaption(object, "Label")

Bước 5: Định dạng đầu ra
Chỉ trả về danh sách các câu lệnh GeoGebra bên trong khối:
\`\`\`geogebra
[Mỗi lệnh GeoGebra trên 1 dòng]
\`\`\`
`;

export const GEOMETRY_PROMPT = SYSTEM_PROMPT;
