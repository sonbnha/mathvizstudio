/**
 * MathViz Studio - Advanced Analytical Geometry Solver
 * High-precision mathematical geometric analysis & rendering engine.
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

  // 1. Quản lý điểm & Tọa độ
  setPoint(name: string, x: number, y: number): GeoPoint {
    const pt: GeoPoint = {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      label: name,
    };
    this.points.set(name, pt);
    return pt;
  }

  getPoint(name: string): GeoPoint {
    const pt = this.points.get(name);
    if (!pt) {
      // Fallback to prevent crash if a point was omitted
      return { x: 400, y: 250, label: name };
    }
    return pt;
  }

  // 2. Các hàm giải tích hình học nâng cao (Dành cho bài toán phức tạp)

  // Giao điểm của 2 đường tròn (O1, r1) và (O2, r2)
  intersectCircleCircle(name1: string, name2: string, c1Name: string, r1: number, c2Name: string, r2: number) {
    const c1 = this.getPoint(c1Name), c2 = this.getPoint(c2Name);
    const d = Math.hypot(c2.x - c1.x, c2.y - c1.y);
    if (d > r1 + r2 || d < Math.abs(r1 - r2) || d === 0) {
      return {
        p1: this.setPoint(name1, c1.x, c1.y - r1),
        p2: this.setPoint(name2, c2.x, c2.y - r2),
      };
    }

    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const x2 = c1.x + (a * (c2.x - c1.x)) / d;
    const y2 = c1.y + (a * (c2.y - c1.y)) / d;

    const p1 = this.setPoint(name1, x2 + (h * (c2.y - c1.y)) / d, y2 - (h * (c2.x - c1.x)) / d);
    const p2 = this.setPoint(name2, x2 - (h * (c2.y - c1.y)) / d, y2 + (h * (c2.x - c1.x)) / d);
    return { p1, p2 };
  }

  // Giao điểm thứ 2 của đường thẳng (P1, P2) với đường tròn (Center, R) - Lấy điểm KHÁC P1
  intersectLineCircleOther(name: string, p1Name: string, p2Name: string, centerName: string, r: number): GeoPoint {
    const p1 = this.getPoint(p1Name), p2 = this.getPoint(p2Name), center = this.getPoint(centerName);
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const dr2 = dx * dx + dy * dy;
    if (dr2 === 0) return this.setPoint(name, p1.x, p1.y);

    const D = (p1.x - center.x) * (p2.y - center.y) - (p2.x - center.x) * (p1.y - center.y);
    const disc = Math.max(0, r * r * dr2 - D * D);
    const sgn = dy < 0 ? -1 : 1;

    const xA = (D * dy + sgn * dx * Math.sqrt(disc)) / dr2 + center.x;
    const yA = (-D * dx + Math.abs(dy) * Math.sqrt(disc)) / dr2 + center.y;
    const xB = (D * dy - sgn * dx * Math.sqrt(disc)) / dr2 + center.x;
    const yB = (-D * dx - Math.abs(dy) * Math.sqrt(disc)) / dr2 + center.y;

    const distA = Math.hypot(xA - p1.x, yA - p1.y);
    const distB = Math.hypot(xB - p1.x, yB - p1.y);
    return distA > distB ? this.setPoint(name, xA, yA) : this.setPoint(name, xB, yB);
  }

  // Điểm đối xứng của P qua tâm I (Đường kính / Trung điểm)
  reflect(name: string, pName: string, centerName: string): GeoPoint {
    const p = this.getPoint(pName), c = this.getPoint(centerName);
    return this.setPoint(name, 2 * c.x - p.x, 2 * c.y - p.y);
  }

  // Trung điểm của P1 và P2
  midpoint(name: string, p1Name: string, p2Name: string): GeoPoint {
    const p1 = this.getPoint(p1Name), p2 = this.getPoint(p2Name);
    return this.setPoint(name, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  }

  // Kéo dài đoạn thẳng P1 -> P2 theo hệ số k (k > 1 là kéo dài ra ngoài)
  extendPoint(name: string, p1Name: string, p2Name: string, k: number): GeoPoint {
    const p1 = this.getPoint(p1Name), p2 = this.getPoint(p2Name);
    return this.setPoint(name, p1.x + k * (p2.x - p1.x), p1.y + k * (p2.y - p1.y));
  }

  // Hình chiếu vuông góc của điểm P lên đường thẳng L1L2
  projectPointOnLine(name: string, pName: string, l1Name: string, l2Name: string): GeoPoint {
    const p = this.getPoint(pName), l1 = this.getPoint(l1Name), l2 = this.getPoint(l2Name);
    const dx = l2.x - l1.x, dy = l2.y - l1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return this.setPoint(name, l1.x, l1.y);
    const u = ((p.x - l1.x) * dx + (p.y - l1.y) * dy) / lenSq;
    return this.setPoint(name, l1.x + u * dx, l1.y + u * dy);
  }

  // Giao điểm 2 đường thẳng P1P2 và P3P4
  intersectLines(name: string, p1Name: string, p2Name: string, p3Name: string, p4Name: string): GeoPoint {
    const p1 = this.getPoint(p1Name), p2 = this.getPoint(p2Name);
    const p3 = this.getPoint(p3Name), p4 = this.getPoint(p4Name);
    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(denom) < 1e-6) {
      return this.setPoint(name, (p1.x + p3.x) / 2, (p1.y + p3.y) / 2);
    }
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
    return this.setPoint(name, p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
  }

  // 3. Các hàm vẽ hình học chuẩn
  line(p1Name: string, p2Name: string, options: { stroke?: string; width?: number; dashed?: boolean; label?: string } = {}) {
    const p1 = this.getPoint(p1Name), p2 = this.getPoint(p2Name);
    const { stroke = "#2563eb", width = 2.5, dashed = false, label } = options;
    const dash = dashed ? 'stroke-dasharray="5,5"' : '';
    this.svgElements.push(`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke}" stroke-width="${width}" ${dash} stroke-linecap="round" />`);
    if (label) {
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const offset = 18;
      this.svgElements.push(`<text x="${mx + nx * offset}" y="${my + ny * offset}" fill="${stroke}" font-size="15" font-weight="bold" text-anchor="middle" dominant-baseline="central" filter="url(#glow)">${label}</text>`);
    }
  }

  circle(centerName: string, radius: number, options: { stroke?: string; fill?: string; width?: number; dashed?: boolean } = {}) {
    const c = this.getPoint(centerName);
    const { stroke = "#2563eb", fill = "rgba(37,99,235,0.02)", width = 2, dashed = false } = options;
    const dash = dashed ? 'stroke-dasharray="5,5"' : '';
    this.svgElements.push(`<circle cx="${c.x}" cy="${c.y}" r="${radius}" stroke="${stroke}" fill="${fill}" stroke-width="${width}" ${dash} />`);
  }

  rightAngle(p1Name: string, vertexName: string, p2Name: string, size = 14, stroke = "#2563eb") {
    const p1 = this.getPoint(p1Name), v = this.getPoint(vertexName), p2 = this.getPoint(p2Name);
    const d1 = Math.hypot(p1.x - v.x, p1.y - v.y) || 1;
    const d2 = Math.hypot(p2.x - v.x, p2.y - v.y) || 1;
    const u1 = { x: (p1.x - v.x) / d1, y: (p1.y - v.y) / d1 };
    const u2 = { x: (p2.x - v.x) / d2, y: (p2.y - v.y) / d2 };
    const a = { x: v.x + size * u1.x, y: v.y + size * u1.y };
    const b = { x: a.x + size * u2.x, y: a.y + size * u2.y };
    const c = { x: v.x + size * u2.x, y: v.y + size * u2.y };
    this.svgElements.push(`<path d="M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}" fill="none" stroke="${stroke}" stroke-width="1.8" />`);
  }

  angle(p1Name: string, vertexName: string, p2Name: string, label?: string, r = 32, stroke = "#ea580c") {
    const p1 = this.getPoint(p1Name), v = this.getPoint(vertexName), p2 = this.getPoint(p2Name);
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

  // 4. Các hàm bổ trợ Toán thực tế (Chỉ dùng khi đề bài có chi tiết thực tế)
  drawSun(posName: string, r = 24) {
    const p = this.getPoint(posName);
    this.svgElements.push(`
      <g>
        <circle cx="${p.x}" cy="${p.y}" r="${r}" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b" stroke-width="2" />
        <circle cx="${p.x}" cy="${p.y}" r="${r * 0.6}" fill="#f59e0b" />
        ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
          const rad = (deg * Math.PI) / 180;
          return `<line x1="${p.x + (r + 2) * Math.cos(rad)}" y1="${p.y + (r + 2) * Math.sin(rad)}" x2="${p.x + (r + 8) * Math.cos(rad)}" y2="${p.y + (r + 8) * Math.sin(rad)}" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />`;
        }).join('')}
      </g>
    `);
  }

  drawLighthouse(bottomName: string, topName: string) {
    const b = this.getPoint(bottomName), t = this.getPoint(topName);
    this.svgElements.push(`
      <polygon points="${b.x - 22},${b.y} ${b.x + 22},${b.y} ${t.x + 12},${t.y + 16} ${t.x - 12},${t.y + 16}" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5" />
      <polygon points="${t.x - 16},${t.y + 16} ${t.x + 16},${t.y + 16} ${t.x},${t.y - 8}" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5" />
    `);
  }

  drawGround(y: number) {
    this.svgElements.push(`<line x1="30" y1="${y}" x2="770" y2="${y}" stroke="#64748b" stroke-width="3" stroke-linecap="round" />`);
  }

  // Thêm phần tử SVG tùy chỉnh
  addRawElement(svg: string) {
    this.svgElements.push(svg);
  }

  // Kết xuất SVG hoàn chỉnh
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
