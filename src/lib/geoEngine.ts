/**
 * MathViz Studio - Computational Geometry Engine
 * Deterministic geometric calculation and rendering library.
 */

export interface Point {
  x: number;
  y: number;
  label?: string;
}

export class GeoEngine {
  public points: Map<string, Point> = new Map();
  public elements: string[] = [];
  public width: number;
  public height: number;

  constructor(width = 800, height = 500) {
    this.width = width;
    this.height = height;
  }

  // 1. Quản lý điểm
  defPoint(name: string, x: number, y: number): Point {
    const pt = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, label: name };
    this.points.set(name, pt);
    return pt;
  }

  getPoint(name: string): Point {
    const pt = this.points.get(name);
    if (!pt) throw new Error(`Điểm ${name} chưa được định nghĩa`);
    return pt;
  }

  // 2. Các phép dựng hình học cơ bản
  midpoint(name: string, p1: Point, p2: Point): Point {
    return this.defPoint(name, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  }

  // Đối xứng điểm P qua tâm Center
  reflect(name: string, p: Point, center: Point): Point {
    return this.defPoint(name, 2 * center.x - p.x, 2 * center.y - p.y);
  }

  // Điểm chia đoạn thẳng theo tỉ số k (P = P1 + k*(P2 - P1))
  pointOnSegment(name: string, p1: Point, p2: Point, k: number): Point {
    return this.defPoint(name, p1.x + k * (p2.x - p1.x), p1.y + k * (p2.y - p1.y));
  }

  // Phép vị tự tâm O tỉ số k
  homothety(name: string, origin: Point, p: Point, k: number): Point {
    return this.defPoint(name, origin.x + k * (p.x - origin.x), origin.y + k * (p.y - origin.y));
  }

  // Hình chiếu vuông góc của điểm P lên đường thẳng đi qua L1, L2
  projectPointOnLine(name: string, p: Point, l1: Point, l2: Point): Point {
    const dx = l2.x - l1.x;
    const dy = l2.y - l1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return this.defPoint(name, l1.x, l1.y);
    const u = ((p.x - l1.x) * dx + (p.y - l1.y) * dy) / lenSq;
    return this.defPoint(name, l1.x + u * dx, l1.y + u * dy);
  }

  // Giao điểm 2 đường thẳng P1P2 và P3P4
  intersectLines(name: string, p1: Point, p2: Point, p3: Point, p4: Point): Point {
    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(denom) < 1e-6) {
      return this.defPoint(name, (p1.x + p3.x) / 2, (p1.y + p3.y) / 2);
    }
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
    return this.defPoint(name, p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
  }

  // Giao điểm của đường thẳng (P1, P2) với đường tròn (Center, R) lấy điểm KHÁC P1
  intersectLineCircleOther(name: string, p1: Point, p2: Point, center: Point, r: number): Point {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dr2 = dx * dx + dy * dy;
    const D = (p1.x - center.x) * (p2.y - center.y) - (p2.x - center.x) * (p1.y - center.y);
    const disc = r * r * dr2 - D * D;
    const sgn = dy < 0 ? -1 : 1;
    const safeDisc = Math.max(0, disc);

    const xA = (D * dy + sgn * dx * Math.sqrt(safeDisc)) / dr2 + center.x;
    const yA = (-D * dx + Math.abs(dy) * Math.sqrt(safeDisc)) / dr2 + center.y;
    const xB = (D * dy - sgn * dx * Math.sqrt(safeDisc)) / dr2 + center.x;
    const yB = (-D * dx - Math.abs(dy) * Math.sqrt(safeDisc)) / dr2 + center.y;

    const distA = Math.hypot(xA - p1.x, yA - p1.y);
    const distB = Math.hypot(xB - p1.x, yB - p1.y);
    return distA > distB ? this.defPoint(name, xA, yA) : this.defPoint(name, xB, yB);
  }

  // Tiếp điểm từ điểm ngoài From đến đường tròn tâm Center bán kính r
  tangentPoints(name1: string, name2: string, from: Point, center: Point, r: number): [Point, Point] {
    const d = Math.hypot(from.x - center.x, from.y - center.y);
    if (d <= r) {
      return [this.defPoint(name1, center.x, center.y - r), this.defPoint(name2, center.x, center.y + r)];
    }
    const angleCenterToFrom = Math.atan2(from.y - center.y, from.x - center.x);
    const angleDelta = Math.acos(r / d);

    const a1 = angleCenterToFrom + angleDelta;
    const a2 = angleCenterToFrom - angleDelta;

    const t1 = this.defPoint(name1, center.x + r * Math.cos(a1), center.y + r * Math.sin(a1));
    const t2 = this.defPoint(name2, center.x + r * Math.cos(a2), center.y + r * Math.sin(a2));
    return [t1, t2];
  }

  // 3. Các hàm vẽ hình học chuẩn
  drawSegment(p1: Point, p2: Point, options: { stroke?: string; width?: number; dashed?: boolean; label?: string } = {}) {
    const { stroke = '#2563eb', width = 2.5, dashed = false, label } = options;
    const dashAttr = dashed ? 'stroke-dasharray="5,5"' : '';
    this.elements.push(`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke}" stroke-width="${width}" ${dashAttr} stroke-linecap="round" />`);

    if (label) {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const offset = 18;
      this.elements.push(`<text x="${midX + nx * offset}" y="${midY + ny * offset}" fill="${stroke}" font-size="16" font-weight="bold" text-anchor="middle" dominant-baseline="central" filter="url(#glow)">${label}</text>`);
    }
  }

  drawPolygon(points: Point[], options: { stroke?: string; fill?: string; width?: number } = {}) {
    const { stroke = '#2563eb', fill = 'none', width = 2.5 } = options;
    const ptsStr = points.map((p) => `${p.x},${p.y}`).join(' ');
    this.elements.push(`<polygon points="${ptsStr}" stroke="${stroke}" fill="${fill}" stroke-width="${width}" stroke-linejoin="round" />`);
  }

  drawCircle(center: Point, r: number, options: { stroke?: string; fill?: string; width?: number; dashed?: boolean } = {}) {
    const { stroke = '#2563eb', fill = 'rgba(37,99,235,0.03)', width = 2, dashed = false } = options;
    const dashAttr = dashed ? 'stroke-dasharray="4,4"' : '';
    this.elements.push(`<circle cx="${center.x}" cy="${center.y}" r="${r}" stroke="${stroke}" fill="${fill}" stroke-width="${width}" ${dashAttr} />`);
  }

  // Ký hiệu góc vuông chuẩn mực
  drawRightAngle(p1: Point, vertex: Point, p2: Point, size = 14, stroke = '#2563eb') {
    const len1 = Math.hypot(p1.x - vertex.x, p1.y - vertex.y) || 1;
    const len2 = Math.hypot(p2.x - vertex.x, p2.y - vertex.y) || 1;
    const u1 = { x: (p1.x - vertex.x) / len1, y: (p1.y - vertex.y) / len1 };
    const u2 = { x: (p2.x - vertex.x) / len2, y: (p2.y - vertex.y) / len2 };

    const a = { x: vertex.x + size * u1.x, y: vertex.y + size * u1.y };
    const b = { x: a.x + size * u2.x, y: a.y + size * u2.y };
    const c = { x: vertex.x + size * u2.x, y: vertex.y + size * u2.y };

    this.elements.push(`<path d="M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}" fill="none" stroke="${stroke}" stroke-width="1.8" />`);
  }

  // Cung đo góc: CHUẨN TOÁN HỌC 100%, LUÔN PHỒNG LỒI VÀO TRONG MIỀN GÓC
  drawAngleArc(p1: Point, vertex: Point, p2: Point, label?: string, r = 32, stroke = '#ea580c') {
    const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
    const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
    let diff = ((a2 - a1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    const sweep = diff > 0 ? 1 : 0;

    const sX = vertex.x + r * Math.cos(a1);
    const sY = vertex.y + r * Math.sin(a1);
    const eX = vertex.x + r * Math.cos(a2);
    const eY = vertex.y + r * Math.sin(a2);

    this.elements.push(`<path d="M ${sX} ${sY} A ${r} ${r} 0 0 ${sweep} ${eX} ${eY}" fill="none" stroke="${stroke}" stroke-width="2" />`);

    if (label) {
      const midAngle = a1 + diff / 2;
      const textX = vertex.x + (r + 18) * Math.cos(midAngle);
      const textY = vertex.y + (r + 18) * Math.sin(midAngle);
      this.elements.push(`<text x="${textX}" y="${textY}" fill="${stroke}" font-size="16" font-weight="bold" text-anchor="middle" dominant-baseline="central" filter="url(#glow)">${label}</text>`);
    }
  }

  // Thêm hình trang trí toán thực tế (Chỉ dùng khi đề bài yêu cầu)
  drawSun(pos: Point, r = 24) {
    this.elements.push(`
      <g>
        <circle cx="${pos.x}" cy="${pos.y}" r="${r}" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b" stroke-width="2" />
        <circle cx="${pos.x}" cy="${pos.y}" r="${r * 0.6}" fill="#f59e0b" />
        <!-- Tia nắng mặt trời -->
        ${[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return `<line x1="${pos.x + (r + 2) * Math.cos(rad)}" y1="${pos.y + (r + 2) * Math.sin(rad)}" x2="${pos.x + (r + 8) * Math.cos(rad)}" y2="${pos.y + (r + 8) * Math.sin(rad)}" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />`;
        }).join('')}
      </g>
    `);
  }

  // Vẽ nhãn chữ tự do
  drawText(text: string, x: number, y: number, options: { fill?: string; size?: number; anchor?: string; baseline?: string; bold?: boolean } = {}) {
    const { fill = '#2563eb', size = 16, anchor = 'middle', baseline = 'alphabetic', bold = true } = options;
    const weight = bold ? 'font-weight="bold"' : '';
    this.elements.push(
      `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" ${weight} text-anchor="${anchor}" dominant-baseline="${baseline}" filter="url(#glow)">${text}</text>`
    );
  }

  // Thêm phần tử SVG tự do
  addRawElement(svgString: string) {
    this.elements.push(svgString);
  }

  // Kết xuất SVG hoàn chỉnh
  toSVG(): string {
    let pointElements = '';

    for (const [name, pt] of this.points.entries()) {
      if (!name || name.startsWith('_')) continue;
      // Tự động tính hướng đẩy chữ ra ngoài
      const cx = this.width / 2;
      const cy = this.height / 2;
      const dirX = pt.x >= cx ? 1 : -1;
      const dirY = pt.y >= cy ? 1 : -1;
      const textX = pt.x + dirX * 16;
      const textY = pt.y + dirY * 16;

      pointElements += `
        <circle cx="${pt.x}" cy="${pt.y}" r="4.5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
        <text x="${textX}" y="${textY}" fill="#0f172a" font-size="18" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle" dominant-baseline="central">${name}</text>
      `;
    }

    return `
<svg viewBox="0 0 ${this.width} ${this.height}" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#ffffff" flood-opacity="0.9" />
    </filter>
  </defs>
  ${this.elements.join('\n  ')}
  <g filter="url(#glow)">${pointElements}  </g>
</svg>`.trim();
  }

  // Hàm tiện ích thực thi script JavaScript an toàn
  static execute(script: string, width = 800, height = 500): string {
    const geo = new GeoEngine(width, height);
    try {
      let code = script.trim();
      if (code.startsWith('```')) {
        code = code.replace(/^```(?:javascript|js|typescript|ts)?\n?/i, '').replace(/\n?```$/i, '').trim();
      }

      const runner = new Function('geo', 'Math', 'Point', code);
      runner(geo, Math, {});
      return geo.toSVG();
    } catch (err: any) {
      console.error('[GeoEngine Execution Error]:', err);
      return geo.toSVG();
    }
  }
}

// Backward compatibility alias
export const GeoCanvas = GeoEngine;
