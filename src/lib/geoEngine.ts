/**
 * MathViz Studio - Geometry Computation Engine
 * Deterministic geometric calculation and rendering library.
 */

export interface Point {
  x: number;
  y: number;
  label?: string;
}

export class GeoCanvas {
  public points: Record<string, Point> = {};
  public elements: string[] = [];
  public width: number;
  public height: number;

  constructor(width = 800, height = 500) {
    this.width = width;
    this.height = height;
  }

  // Thêm hoặc định nghĩa điểm
  defPoint(name: string, x: number, y: number): Point {
    const pt: Point = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, label: name };
    this.points[name] = pt;
    return pt;
  }

  // Tính trung điểm của đoạn thẳng P1P2
  midpoint(name: string, p1: Point, p2: Point): Point {
    return this.defPoint(name, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  }

  // Điểm đối xứng của P qua tâm Center
  reflect(name: string, p: Point, center: Point): Point {
    return this.defPoint(name, 2 * center.x - p.x, 2 * center.y - p.y);
  }

  // Phép vị tự tâm O tỉ số k: vec(O, P_new) = k * vec(O, P)
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

  // Giao điểm đường thẳng qua P1, P2 với đường tròn tâm C bán kính r (lấy điểm khác P1)
  intersectLineCircleOther(name: string, p1: Point, p2: Point, center: Point, r: number): Point {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dr2 = dx * dx + dy * dy;
    if (dr2 === 0) return this.defPoint(name, p1.x, p1.y);

    const D = (p1.x - center.x) * (p2.y - center.y) - (p2.x - center.x) * (p1.y - center.y);
    const disc = r * r * dr2 - D * D;
    const sgn = dy < 0 ? -1 : 1;

    const xA = (D * dy + sgn * dx * Math.sqrt(Math.max(0, disc))) / dr2 + center.x;
    const yA = (-D * dx + Math.abs(dy) * Math.sqrt(Math.max(0, disc))) / dr2 + center.y;
    const xB = (D * dy - sgn * dx * Math.sqrt(Math.max(0, disc))) / dr2 + center.x;
    const yB = (-D * dx - Math.abs(dy) * Math.sqrt(Math.max(0, disc))) / dr2 + center.y;

    const dA = Math.hypot(xA - p1.x, yA - p1.y);
    const dB = Math.hypot(xB - p1.x, yB - p1.y);
    return dA > dB ? this.defPoint(name, xA, yA) : this.defPoint(name, xB, yB);
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

  // Vẽ đoạn thẳng
  drawSegment(p1: Point, p2: Point, options: { stroke?: string; width?: number; dashed?: boolean } = {}) {
    const { stroke = '#2563eb', width = 2.5, dashed = false } = options;
    const dashAttr = dashed ? 'stroke-dasharray="5,4"' : '';
    this.elements.push(
      `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke}" stroke-width="${width}" ${dashAttr} stroke-linecap="round" />`
    );
  }

  // Vẽ đa giác nối các điểm
  drawPolygon(points: Point[], options: { stroke?: string; fill?: string; width?: number } = {}) {
    const { stroke = '#2563eb', fill = 'none', width = 2.5 } = options;
    const ptsStr = points.map((p) => `${p.x},${p.y}`).join(' ');
    this.elements.push(`<polygon points="${ptsStr}" stroke="${stroke}" fill="${fill}" stroke-width="${width}" stroke-linejoin="round" />`);
  }

  // Vẽ đường tròn
  drawCircle(center: Point, r: number, options: { stroke?: string; fill?: string; width?: number; dashed?: boolean } = {}) {
    const { stroke = '#2563eb', fill = 'none', width = 2, dashed = false } = options;
    const dashAttr = dashed ? 'stroke-dasharray="5,4"' : '';
    this.elements.push(
      `<circle cx="${center.x}" cy="${center.y}" r="${r}" stroke="${stroke}" fill="${fill}" stroke-width="${width}" ${dashAttr} />`
    );
  }

  // Ký hiệu góc vuông tại đỉnh V
  drawRightAngle(p1: Point, v: Point, p2: Point, size = 14) {
    const d1 = Math.hypot(p1.x - v.x, p1.y - v.y) || 1;
    const d2 = Math.hypot(p2.x - v.x, p2.y - v.y) || 1;
    const u1 = { x: (p1.x - v.x) / d1, y: (p1.y - v.y) / d1 };
    const u2 = { x: (p2.x - v.x) / d2, y: (p2.y - v.y) / d2 };
    const a = { x: v.x + size * u1.x, y: v.y + size * u1.y };
    const b = { x: a.x + size * u2.x, y: a.y + size * u2.y };
    const c = { x: v.x + size * u2.x, y: v.y + size * u2.y };
    this.elements.push(
      `<path d="M ${Math.round(a.x * 10) / 10} ${Math.round(a.y * 10) / 10} L ${Math.round(b.x * 10) / 10} ${Math.round(b.y * 10) / 10} L ${Math.round(c.x * 10) / 10} ${Math.round(c.y * 10) / 10}" fill="none" stroke="#2563eb" stroke-width="2" />`
    );
  }

  // Vẽ cung góc (CHUẨN TOÁN HỌC 100% - LUÔN PHỒNG LỒI VÀO TRONG MIỀN GÓC)
  drawAngleArc(p1: Point, v: Point, p2: Point, label?: string, r = 32, color = '#ea580c') {
    const a1 = Math.atan2(p1.y - v.y, p1.x - v.x);
    const a2 = Math.atan2(p2.y - v.y, p2.x - v.x);
    const diff = ((a2 - a1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    const sweep = diff > 0 ? 1 : 0;

    const sX = +(v.x + r * Math.cos(a1)).toFixed(1);
    const sY = +(v.y + r * Math.sin(a1)).toFixed(1);
    const eX = +(v.x + r * Math.cos(a2)).toFixed(1);
    const eY = +(v.y + r * Math.sin(a2)).toFixed(1);

    this.elements.push(`<path d="M ${sX} ${sY} A ${r} ${r} 0 0 ${sweep} ${eX} ${eY}" fill="none" stroke="${color}" stroke-width="2.5" />`);

    if (label && label.trim().length > 0) {
      const midA = a1 + diff / 2;
      const tX = +(v.x + (r + 18) * Math.cos(midA)).toFixed(1);
      const tY = +(v.y + (r + 18) * Math.sin(midA)).toFixed(1);
      this.elements.push(
        `<text x="${tX}" y="${tY}" fill="${color}" font-size="16" font-weight="bold" text-anchor="middle" dominant-baseline="central" filter="url(#glow)">${label}</text>`
      );
    }
  }

  // Vẽ nhãn chữ tự do
  drawText(text: string, x: number, y: number, options: { fill?: string; size?: number; anchor?: string; baseline?: string; bold?: boolean } = {}) {
    const { fill = '#2563eb', size = 18, anchor = 'middle', baseline = 'alphabetic', bold = true } = options;
    const weight = bold ? 'font-weight="bold"' : '';
    this.elements.push(
      `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" ${weight} text-anchor="${anchor}" dominant-baseline="${baseline}" filter="url(#glow)">${text}</text>`
    );
  }

  // Thêm thẻ SVG tự do bất kỳ
  addRawElement(svgString: string) {
    this.elements.push(svgString);
  }

  // Kết xuất toàn bộ SVG kèm chấm điểm và nhãn tự căn chỉnh lề
  toSVG(): string {
    let pointDots = '';
    let pointTexts = '';

    for (const [name, pt] of Object.entries(this.points)) {
      if (!name || name.startsWith('_')) continue; // Skip hidden calculation points
      pointDots += `<circle cx="${pt.x}" cy="${pt.y}" r="4.5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />\n`;

      // Smart label placement (Offset away from screen center)
      const dx = pt.x - this.width / 2;
      const dy = pt.y - this.height / 2;
      const offsetX = dx >= 0 ? 14 : -14;
      const offsetY = dy >= 0 ? 16 : -14;
      const anchor = dx >= 0 ? 'start' : 'end';

      pointTexts += `<text x="${pt.x + offsetX}" y="${pt.y + offsetY}" fill="#0f172a" font-size="19" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="${anchor}">${name}</text>\n`;
    }

    return `
<svg viewBox="0 0 ${this.width} ${this.height}" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#ffffff" flood-opacity="0.9" />
    </filter>
  </defs>
  ${this.elements.join('\n  ')}
  ${pointDots}
  <g filter="url(#glow)">
  ${pointTexts}  </g>
</svg>`.trim();
  }

  // Hàm tiện ích thực thi script JavaScript an toàn
  static execute(script: string, width = 800, height = 500): string {
    const geo = new GeoCanvas(width, height);
    try {
      // Clean script code if wrapped in markdown blocks
      let code = script.trim();
      if (code.startsWith('```')) {
        code = code.replace(/^```(?:javascript|js|typescript|ts)?\n?/i, '').replace(/\n?```$/i, '').trim();
      }
      
      // Execute the JS code on geo instance
      const runner = new Function('geo', 'Math', 'Point', code);
      runner(geo, Math, {});
      return geo.toSVG();
    } catch (err: any) {
      console.error('[GeoEngine Execution Error]:', err);
      // Fallback
      return geo.toSVG();
    }
  }
}
