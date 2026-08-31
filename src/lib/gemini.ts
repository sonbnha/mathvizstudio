import { GoogleGenAI } from '@google/genai';

/**
 * Gemini Model Configuration
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
export const DEFAULT_GEMINI_MODEL = GEMINI_MODEL;
export const SUPPORTED_MODELS = [
  GEMINI_MODEL,
  ...(GEMINI_MODEL !== 'gemini-3.5-flash' ? ['gemini-3.5-flash'] : []),
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
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
 * Computational Geometry System Prompt for GeoEngine
 */
export const GEOMETRY_PROMPT = `
Bạn là chuyên gia Hình học Không gian & Phẳng. Nhiệm vụ của bạn là đọc kỹ đề bài toán hình và viết một đoạn mã JavaScript ngắn để gọi các phương thức của đối tượng 'geo' (instance của GeoEngine).

MÔI TRƯỜNG THỰC THI (Đối tượng geo có sẵn các hàm):
- geo.defPoint(name: string, x: number, y: number): Point
- geo.midpoint(name: string, p1: Point, p2: Point): Point
- geo.reflect(name: string, p: Point, center: Point): Point
- geo.pointOnSegment(name: string, p1: Point, p2: Point, k: number): Point
- geo.homothety(name: string, origin: Point, p: Point, k: number): Point
- geo.projectPointOnLine(name: string, p: Point, l1: Point, l2: Point): Point
- geo.intersectLines(name: string, p1: Point, p2: Point, p3: Point, p4: Point): Point
- geo.intersectLineCircleOther(name: string, p1: Point, p2: Point, center: Point, r: number): Point
- geo.tangentPoints(name1: string, name2: string, from: Point, center: Point, r: number): [Point, Point]
- geo.drawSegment(p1: Point, p2: Point, { stroke, width, dashed, label }): void
- geo.drawPolygon(points: Point[], { stroke, fill, width }): void
- geo.drawCircle(center: Point, r: number, { stroke, fill, width, dashed }): void
- geo.drawRightAngle(p1: Point, vertex: Point, p2: Point, size?, stroke?): void
- geo.drawAngleArc(p1: Point, vertex: Point, p2: Point, label?: string, r?: number, stroke?): void
- geo.drawSun(pos: Point, r?: number): void
- geo.drawText(text: string, x: number, y: number, options?): void

QUY TẮC BẮT BUỘC:
1. Luôn căn giữa hình vẽ trong phạm vi viewBox 800x500 (giữ lề an toàn >= 60px).
2. Chỉ vẽ những đối tượng thực tế (mặt trời, cây, hải đăng, thang) NẾU đề bài thực tế có nhắc tên. Nếu là toán thuần túy (như 2 đường tròn cắt nhau, tam giác ABC), TUYỆT ĐỐI CHỈ VẼ CÁC HÌNH HỌC THUẦN TÚY.
3. CHỈ TRẢ VỀ DUY NHẤT KHỐI CODE JAVASCRIPT bên trong \`\`\`javascript ... \`\`\`. Không viết văn bản giải thích.
`;
