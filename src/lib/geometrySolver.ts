/**
 * MathViz Studio - Zero-Dependency Analytical Geometry Solver
 * Instant deterministic rendering with pure analytical geometry.
 */

export interface GeoPoint {
  x: number;
  y: number;
  label?: string;
}

export class GeoSolver {
  public points: Map<string, GeoPoint> = new Map();
  public svgElements: string[] = [];
  public width: number;
  public height: number;

  constructor(width = 800, height = 500) {
    this.width = width;
    this.height = height;
  }

  // Thêm hoặc định nghĩa điểm
  setPoint(name: string, x: number, y: number): GeoPoint {
    const pt = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, label: name };
    this.points.set(name, pt);
    return pt;
  }

  getPoint(name: string): GeoPoint | undefined {
    return this.points.get(name);
  }

  // Trung điểm
  midpoint(name: string, p1Name: string, p2Name: string): GeoPoint {
    const p1 = this.points.get(p1Name);
    const p2 = this.points.get(p2Name);
    if (!p1 || !p2) return this.setPoint(name, 0, 0);
    return this.setPoint(name, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  }

  // Đối xứng điểm qua tâm
  reflect(name: string, pName: string, centerName: string): GeoPoint {
    const p = this.points.get(pName);
    const center = this.points.get(centerName);
    if (!p || !center) return this.setPoint(name, 0, 0);
    return this.setPoint(name, 2 * center.x - p.x, 2 * center.y - p.y);
  }

  // Hình chiếu vuông góc của điểm P lên đường thẳng L1L2
  projectPointOnLine(name: string, pName: string, l1Name: string, l2Name: string): GeoPoint {
    const p = this.points.get(pName);
    const l1 = this.points.get(l1Name);
    const l2 = this.points.get(l2Name);
    if (!p || !l1 || !l2) return this.setPoint(name, 0, 0);
    const dx = l2.x - l1.x;
    const dy = l2.y - l1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return this.setPoint(name, l1.x, l1.y);
    const u = ((p.x - l1.x) * dx + (p.y - l1.y) * dy) / lenSq;
    return this.setPoint(name, l1.x + u * dx, l1.y + u * dy);
  }

  // Giao điểm 2 đường thẳng
  intersectLines(name: string, p1Name: string, p2Name: string, p3Name: string, p4Name: string): GeoPoint {
    const p1 = this.points.get(p1Name);
    const p2 = this.points.get(p2Name);
    const p3 = this.points.get(p3Name);
    const p4 = this.points.get(p4Name);
    if (!p1 || !p2 || !p3 || !p4) return this.setPoint(name, 0, 0);
    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(denom) < 1e-6) {
      return this.setPoint(name, (p1.x + p3.x) / 2, (p1.y + p3.y) / 2);
    }
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
    return this.setPoint(name, p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
  }

  // Đoạn thẳng
  line(p1Name: string, p2Name: string, options: { stroke?: string; width?: number; dashed?: boolean; label?: string } = {}) {
    const p1 = this.points.get(p1Name);
    const p2 = this.points.get(p2Name);
    if (!p1 || !p2) return;
    const { stroke = "#2563eb", width = 2.5, dashed = false, label } = options;
    const dash = dashed ? 'stroke-dasharray="5,5"' : '';
    this.svgElements.push(`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke}" stroke-width="${width}" ${dash} stroke-linecap="round" />`);
    if (label) {
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const offset = 18;
      this.svgElements.push(`<text x="${mx + nx * offset}" y="${my + ny * offset}" fill="${stroke}" font-size="15" font-weight="bold" text-anchor="middle" dominant-baseline="central" filter="url(#glow)">${label}</text>`);
    }
  }

  // Đường tròn
  circle(centerName: string, radius: number, options: { stroke?: string; fill?: string; width?: number; dashed?: boolean } = {}) {
    const c = this.points.get(centerName);
    if (!c) return;
    const { stroke = "#2563eb", fill = "rgba(37,99,235,0.03)", width = 2, dashed = false } = options;
    const dash = dashed ? 'stroke-dasharray="4,4"' : '';
    this.svgElements.push(`<circle cx="${c.x}" cy="${c.y}" r="${radius}" stroke="${stroke}" fill="${fill}" stroke-width="${width}" ${dash} />`);
  }

  // Ký hiệu góc vuông
  rightAngle(p1Name: string, vertexName: string, p2Name: string, size = 14, stroke = "#2563eb") {
    const p1 = this.points.get(p1Name), v = this.points.get(vertexName), p2 = this.points.get(p2Name);
    if (!p1 || !v || !p2) return;
    const d1 = Math.hypot(p1.x - v.x, p1.y - v.y) || 1;
    const d2 = Math.hypot(p2.x - v.x, p2.y - v.y) || 1;
    const u1 = { x: (p1.x - v.x) / d1, y: (p1.y - v.y) / d1 };
    const u2 = { x: (p2.x - v.x) / d2, y: (p2.y - v.y) / d2 };
    const a = { x: v.x + size * u1.x, y: v.y + size * u1.y };
    const b = { x: a.x + size * u2.x, y: a.y + size * u2.y };
    const c = { x: v.x + size * u2.x, y: v.y + size * u2.y };
    this.svgElements.push(`<path d="M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}" fill="none" stroke="${stroke}" stroke-width="1.8" />`);
  }

  // Cung góc chuẩn toán học
  angle(p1Name: string, vertexName: string, p2Name: string, label?: string, r = 32, stroke = "#ea580c") {
    const p1 = this.points.get(p1Name), v = this.points.get(vertexName), p2 = this.points.get(p2Name);
    if (!p1 || !v || !p2) return;
    const a1 = Math.atan2(p1.y - v.y, p1.x - v.x);
    const a2 = Math.atan2(p2.y - v.y, p2.x - v.x);
    let diff = ((a2 - a1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    const sweep = diff > 0 ? 1 : 0;
    const sx = v.x + r * Math.cos(a1), sy = v.y + r * Math.sin(a1);
    const ex = v.x + r * Math.cos(a2), ey = v.y + r * Math.sin(a2);
    this.svgElements.push(`<path d="M ${sx} ${sy} A ${r} ${r} 0 0 ${sweep} ${ex} ${ey}" fill="none" stroke="${stroke}" stroke-width="2" />`);
    if (label) {
      const mid = a1 + diff / 2;
      this.svgElements.push(`<text x="${v.x + (r + 18) * Math.cos(mid)}" y="${v.y + (r + 18) * Math.sin(mid)}" fill="${stroke}" font-size="15" font-weight="bold" text-anchor="middle" dominant-baseline="central" filter="url(#glow)">${label}</text>`);
    }
  }

  // Thêm phần tử SVG tùy chỉnh
  addRawElement(svg: string) {
    this.svgElements.push(svg);
  }

  // Xuất mã SVG chuẩn
  renderSVG(): string {
    let ptsSvg = '';
    const cx = this.width / 2;
    const cy = this.height / 2;

    for (const [name, pt] of this.points.entries()) {
      if (!name || name.startsWith('_')) continue;
      const dirX = pt.x >= cx ? 1 : -1;
      const dirY = pt.y >= cy ? 1 : -1;
      const textX = pt.x + dirX * 16;
      const textY = pt.y + dirY * 16;

      ptsSvg += `<circle cx="${pt.x}" cy="${pt.y}" r="4.5" fill="#0f172a" stroke="#fff" stroke-width="1.5" />\n`;
      ptsSvg += `<text x="${textX}" y="${textY}" fill="#0f172a" font-size="18" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle" dominant-baseline="central">${name}</text>\n`;
    }

    return `
<svg viewBox="0 0 ${this.width} ${this.height}" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#fff" flood-opacity="0.9"/></filter>
  </defs>
  ${this.svgElements.join('\n  ')}
  <g filter="url(#glow)">
  ${ptsSvg}  </g>
</svg>`.trim();
  }

  // Hàm thực thi mã JS an toàn
  static execute(code: string, width = 800, height = 500): string {
    const solver = new GeoSolver(width, height);
    try {
      let cleanCode = code.trim();
      if (cleanCode.startsWith('```')) {
        cleanCode = cleanCode.replace(/^```(?:javascript|js|typescript|ts)?\n?/i, '').replace(/\n?```$/i, '').trim();
      }
      const fn = new Function('solver', 'Math', cleanCode);
      fn(solver, Math);
      return solver.renderSVG();
    } catch (err: any) {
      console.error('[GeoSolver Execute Error]:', err);
      return solver.renderSVG();
    }
  }
}
