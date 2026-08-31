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
 * Advanced GeoSolver Analytical Geometry System Prompt
 */
export const GEOMETRY_PROMPT = `
Bạn là một nhà toán học chuyên nghiệp. Đọc hiểu đề bài toán và viết mã JavaScript gọi các hàm của đối tượng \`solver\` (thuộc lớp GeoSolver) để dựng hình học chính xác 100%.

CÁC HÀM CÓ SẴN CỦA OBJECT \`solver\`:
1. Quản lý điểm & Giải tích:
   - solver.setPoint(name, x, y): Tạo điểm tọa độ cố định
   - solver.intersectCircleCircle(name1, name2, c1Name, r1, c2Name, r2): Tìm 2 giao điểm của 2 đường tròn
   - solver.intersectLineCircleOther(name, p1Name, p2Name, centerName, r): Tìm giao điểm thứ 2 của đường thẳng P1P2 với đường tròn tâm centerName (khác P1)
   - solver.reflect(name, pName, centerName): Lấy điểm đối xứng của P qua tâm center
   - solver.midpoint(name, p1Name, p2Name): Lấy trung điểm của đoạn thẳng P1P2
   - solver.extendPoint(name, p1Name, p2Name, k): Kéo dài từ P1 qua P2 theo tỉ lệ k
   - solver.projectPointOnLine(name, pName, l1Name, l2Name): Hình chiếu vuông góc
   - solver.intersectLines(name, p1Name, p2Name, p3Name, p4Name): Giao điểm 2 đường thẳng

2. Nét vẽ hình học:
   - solver.line(p1, p2, { stroke, width, dashed, label })
   - solver.circle(centerName, radius, { stroke, fill, dashed })
   - solver.rightAngle(p1, vertex, p2, size)
   - solver.angle(p1, vertex, p2, label, r)

3. Bối cảnh thực tế (Chỉ dùng khi đề bài có nhắc đến):
   - solver.drawSun(posName, r)
   - solver.drawLighthouse(bottomName, topName)
   - solver.drawGround(y)

VÍ DỤ MẪU:
Đề bài 12 (Hai đường tròn cắt nhau tại A, B; AO cắt (O) tại C, (O') tại E; AO' cắt (O) tại D, (O') tại F):
\`\`\`javascript
// 1. Dựng tâm 2 đường tròn
solver.setPoint('O', 330, 260);
solver.setPoint('O2', 470, 260); // O' đặt tên là O2
solver.circle('O', 110);
solver.circle('O2', 110);

// 2. Tìm giao điểm A và B
solver.intersectCircleCircle('A', 'B', 'O', 110, 'O2', 110);
solver.line('A', 'B', { dashed: true, stroke: '#64748b' });

// 3. Đường thẳng AO qua O cắt (O) tại C (đối xứng qua O), cắt (O') tại E
solver.reflect('C', 'A', 'O');
solver.intersectLineCircleOther('E', 'A', 'O', 'O2', 110);
solver.line('A', 'E', { stroke: '#0f172a' });

// 4. Đường thẳng AO' qua O' cắt (O') tại F (đối xứng qua O2), cắt (O) tại D
solver.reflect('F', 'A', 'O2');
solver.intersectLineCircleOther('D', 'A', 'O2', 'O', 110);
solver.line('A', 'D', { stroke: '#0f172a' });

// 5. Nối các đoạn thẳng cần chứng minh
solver.line('C', 'F', { stroke: '#ea580c', width: 3 });
solver.line('B', 'D', { stroke: '#059669' });
solver.line('B', 'E', { stroke: '#059669' });
solver.line('D', 'E', { stroke: '#059669' });
\`\`\`

QUY TẮC:
- Khung vẽ 800 x 500. Tọa độ an toàn x: 80 - 720, y: 80 - 420.
- Nếu đề bài toán thuần túy: TUYỆT ĐỐI KHÔNG gọi các hàm thực tế (drawSun, drawGround...).
- Nếu là toán thực tế: Gọi thêm các hàm bối cảnh tương ứng.
- CHỈ TRẢ VỀ DUY NHẤT KHỐI \`\`\`javascript ... \`\`\`.
`;

export const GEOSOLVER_PROMPT = GEOMETRY_PROMPT;
export const SYSTEM_PROMPT = GEOMETRY_PROMPT;
