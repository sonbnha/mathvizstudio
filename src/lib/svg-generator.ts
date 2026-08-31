/**
 * MathViz Studio - Structured Math SVG Generator Engine
 * Generates deterministic, pedagogically perfect, mathematical SVGs from structured JSON specs.
 */

export interface MathPoint {
  label?: string;
  description?: string;
}

export interface MathDimension {
  height?: string;
  base?: string;
  hypotenuse?: string;
  custom?: { [key: string]: string };
}

export interface MathAngle {
  vertex: string;
  value: string;
  position?: 'elevation' | 'depression' | 'interior' | 'exterior';
}

export interface CircleTangent {
  from: string;
  to: string[];
}

export interface MathSpec {
  type: 'SHADOW' | 'LADDER' | 'LIGHTHOUSE' | 'BUILDING' | 'CIRCLE' | 'GENERAL_TRIANGLE' | string;
  points?: { [key: string]: MathPoint | string };
  dimensions?: MathDimension;
  angles?: MathAngle[];
  title?: string;
  style?: 'colorful' | 'monochrome' | 'blueprint' | string;
  rawSvg?: string;
  circleConfig?: {
    center?: string;
    radius?: string;
    tangents?: CircleTangent[];
    chords?: string[];
  };
}

function getPointLabel(points: { [key: string]: any } | undefined, key: string, fallback: string): string {
  if (!points || !points[key]) return fallback;
  if (typeof points[key] === 'string') return points[key];
  return points[key].label || fallback;
}

/**
 * Render a Shadow (Sun Ray & Tree/Pole) problem to SVG
 */
function renderShadowSvg(spec: MathSpec): string {
  const pA = getPointLabel(spec.points, 'A', 'A');
  const pB = getPointLabel(spec.points, 'B', 'B');
  const pC = getPointLabel(spec.points, 'C', 'C');

  const dimHeight = spec.dimensions?.height || 'h = ?';
  const dimBase = spec.dimensions?.base || 'd = ?';
  const dimHypo = spec.dimensions?.hypotenuse || '';

  const angleC = spec.angles?.find((a) => a.vertex === 'C' || a.position === 'elevation')?.value || '60°';

  // Triangle Coordinates (Safe 800x500 box)
  const xB = 260;
  const yB = 415;
  const xA = 260;
  const yA = 180;
  const xC = 560;
  const yC = 415;

  // Sun Homothety (Collinear from C through A)
  const k = 1.4;
  const xS = Math.round(xC + k * (xA - xC));
  const yS = Math.round(yC + k * (yA - yC));

  // Angle Arc at C (sweep-flag = 0 to bulge inward)
  const rArc = 35;
  const alphaRad = Math.atan2(yB - yA, xC - xB); // angle of elevation
  const arcStartX = xC - rArc;
  const arcStartY = yC;
  const arcEndX = Math.round(xC - rArc * Math.cos(alphaRad));
  const arcEndY = Math.round(yC - rArc * Math.sin(alphaRad));

  const labelAngleX = Math.round(xC - (rArc + 20) * Math.cos(alphaRad / 2));
  const labelAngleY = Math.round(yC - (rArc + 20) * Math.sin(alphaRad / 2) - 2);

  return `<svg viewBox="0 0 800 500" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#ffffff" flood-opacity="0.9" />
    </filter>
    <marker id="dimArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#475569" />
    </marker>
  </defs>

  <!-- LỚP 2: MINH HỌA NỀN (DECORATIVE BACKGROUND) -->
  <!-- Bầu trời & Mặt đất -->
  <line x1="80" y1="${yB}" x2="720" y2="${yB}" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />

  <!-- Bóng cây trên mặt đất -->
  <ellipse cx="${(xB + xC) / 2}" cy="${yB}" rx="${(xC - xB) / 2}" ry="4" fill="#64748b" opacity="0.25" />

  <!-- Minh họa Cái Cây -->
  <!-- Thân cây -->
  <rect x="${xB - 7}" y="${yA + 25}" width="14" height="${yB - yA - 25}" fill="#78350f" opacity="0.85" rx="3" />
  <!-- Tán lá -->
  <circle cx="${xB}" cy="${yA + 20}" r="42" fill="#16a34a" opacity="0.85" />
  <circle cx="${xB - 25}" cy="${yA + 35}" r="30" fill="#15803d" opacity="0.85" />
  <circle cx="${xB + 25}" cy="${yA + 35}" r="30" fill="#15803d" opacity="0.85" />
  <circle cx="${xB}" cy="${yA - 10}" r="32" fill="#4ade80" opacity="0.85" />

  <!-- Tia nắng mặt trời (Đồng trục từ tâm Mặt Trời S xuyên qua A xuống C) -->
  <line x1="${xS}" y1="${yS}" x2="${xC}" y2="${yC}" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6 4" />

  <!-- Icon Mặt Trời tại tâm S -->
  <g stroke="#f59e0b" stroke-width="1.5" opacity="0.85">
    <line x1="${xS}" y1="${yS - 28}" x2="${xS}" y2="${yS - 36}" />
    <line x1="${xS}" y1="${yS + 28}" x2="${xS}" y2="${yS + 36}" />
    <line x1="${xS - 28}" y1="${yS}" x2="${xS - 36}" y2="${yS}" />
    <line x1="${xS + 28}" y1="${yS}" x2="${xS + 36}" y2="${yS}" />
    <line x1="${xS - 20}" y1="${yS - 20}" x2="${xS - 26}" y2="${yS - 26}" />
    <line x1="${xS + 20}" y1="${yS + 20}" x2="${xS + 26}" y2="${yS + 26}" />
    <line x1="${xS - 20}" y1="${yS + 20}" x2="${xS - 26}" y2="${yS + 26}" />
    <line x1="${xS + 20}" y1="${yS - 20}" x2="${xS + 26}" y2="${yS - 26}" />
  </g>
  <circle cx="${xS}" cy="${yS}" r="20" fill="#fbbf24" stroke="#d97706" stroke-width="2" />
  <circle cx="${xS}" cy="${yS}" r="13" fill="#fef08a" />

  <!-- LỚP 1: HÌNH HỌC TOÁN HỌC CỐT LÕI (NỔI BẬT NHẤT) -->
  <!-- Khung tam giác vuông chính ABC -->
  <polygon points="${xA},${yA} ${xB},${yB} ${xC},${yC}" fill="none" stroke="#2563eb" stroke-width="3.5" stroke-linejoin="round" />

  <!-- Ký hiệu góc vuông tại B -->
  <path d="M ${xB} ${yB - 16} L ${xB + 16} ${yB - 16} L ${xB + 16} ${yB}" fill="none" stroke="#2563eb" stroke-width="2.5" />

  <!-- Cung tròn góc nâng tại C (sweep-flag = 0) -->
  <path d="M ${arcStartX} ${arcStartY} A ${rArc} ${rArc} 0 0 0 ${arcEndX} ${arcEndY}" fill="none" stroke="#ea580c" stroke-width="2.5" />

  <!-- Các điểm đỉnh -->
  <circle cx="${xA}" cy="${yA}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xB}" cy="${yB}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xC}" cy="${yC}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />

  <!-- Nhãn đỉnh -->
  <g font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="#0f172a" filter="url(#textGlow)">
    <text x="${xA}" y="${yA - 18}" text-anchor="middle">${pA}</text>
    <text x="${xB - 22}" y="${yB + 20}" text-anchor="end">${pB}</text>
    <text x="${xC + 22}" y="${yC + 20}" text-anchor="start">${pC}</text>
  </g>

  <!-- Nhãn góc C -->
  <text x="${labelAngleX}" y="${labelAngleY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="#ea580c" filter="url(#textGlow)">${angleC}</text>

  <!-- Đường dóng và số đo chiều cao AB -->
  <g stroke="#475569" stroke-width="1">
    <line x1="${xB - 45}" y1="${yA}" x2="${xB - 5}" y2="${yA}" />
    <line x1="${xB - 45}" y1="${yB}" x2="${xB - 5}" y2="${yB}" />
    <line x1="${xB - 35}" y1="${yA + 6}" x2="${xB - 35}" y2="${yB - 6}" marker-start="url(#dimArrow)" marker-end="url(#dimArrow)" stroke-width="1.5" stroke="#2563eb" />
  </g>
  <text x="${xB - 42}" y="${(yA + yB) / 2 + 5}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimHeight}</text>

  <!-- Đường dóng và số đo bóng nắng BC -->
  <g stroke="#475569" stroke-width="1">
    <line x1="${xB}" y1="${yB + 10}" x2="${xB}" y2="${yB + 45}" />
    <line x1="${xC}" y1="${yB + 10}" x2="${xC}" y2="${yB + 45}" />
    <line x1="${xB + 6}" y1="${yB + 35}" x2="${xC - 6}" y2="${yB + 35}" marker-start="url(#dimArrow)" marker-end="url(#dimArrow)" stroke-width="1.5" stroke="#2563eb" />
  </g>
  <text x="${(xB + xC) / 2}" y="${yB + 30}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimBase}</text>

  ${dimHypo ? `<!-- Số đo cạnh huyền -->
  <text x="${(xA + xC) / 2 + 18}" y="${(yA + yC) / 2 - 12}" text-anchor="start" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimHypo}</text>` : ''}
</svg>`;
}

/**
 * Render a Ladder problem to SVG
 */
function renderLadderSvg(spec: MathSpec): string {
  const pA = getPointLabel(spec.points, 'A', 'A');
  const pB = getPointLabel(spec.points, 'B', 'B');
  const pC = getPointLabel(spec.points, 'C', 'C');

  const dimHeight = spec.dimensions?.height || 'h = ?';
  const dimBase = spec.dimensions?.base || '1.5m';
  const dimHypo = spec.dimensions?.hypotenuse || '4m';

  const angleC = spec.angles?.find((a) => a.vertex === 'C' || a.position === 'elevation')?.value || 'α = ?';

  const xB = 260;
  const yB = 415;
  const xA = 260;
  const yA = 120;
  const xC = 450;
  const yC = 415;

  const rArc = 35;
  const alphaRad = Math.atan2(yB - yA, xC - xB);
  const arcStartX = xC - rArc;
  const arcStartY = yC;
  const arcEndX = Math.round(xC - rArc * Math.cos(alphaRad));
  const arcEndY = Math.round(yC - rArc * Math.sin(alphaRad));

  const labelAngleX = Math.round(xC - (rArc + 20) * Math.cos(alphaRad / 2));
  const labelAngleY = Math.round(yC - (rArc + 20) * Math.sin(alphaRad / 2) - 2);

  // Ladder rungs generation
  const rungCount = 7;
  const rungs: string[] = [];
  const normalX = -(yA - yC) / Math.hypot(xA - xC, yA - yC);
  const normalY = (xA - xC) / Math.hypot(xA - xC, yA - yC);
  const halfW = 9;

  for (let i = 1; i <= rungCount; i++) {
    const t = i / (rungCount + 1);
    const rx = xA + t * (xC - xA);
    const ry = yA + t * (yC - yA);
    rungs.push(`<line x1="${rx - normalX * halfW}" y1="${ry - normalY * halfW}" x2="${rx + normalX * halfW}" y2="${ry + normalY * halfW}" stroke="#78350f" stroke-width="3" opacity="0.6" />`);
  }

  return `<svg viewBox="0 0 800 500" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#ffffff" flood-opacity="0.9" />
    </filter>
    <marker id="dimArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#475569" />
    </marker>
  </defs>

  <!-- LỚP 2: BỨC TƯỜNG & MẶT ĐẤT MINH HỌA -->
  <line x1="80" y1="${yB}" x2="720" y2="${yB}" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
  <rect x="${xB - 55}" y="70" width="55" height="${yB - 70}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
  <!-- Vân gạch -->
  <line x1="${xB - 55}" y1="140" x2="${xB}" y2="140" stroke="#e2e8f0" stroke-width="1.5" />
  <line x1="${xB - 55}" y1="210" x2="${xB}" y2="210" stroke="#e2e8f0" stroke-width="1.5" />
  <line x1="${xB - 55}" y1="280" x2="${xB}" y2="280" stroke="#e2e8f0" stroke-width="1.5" />
  <line x1="${xB - 55}" y1="350" x2="${xB}" y2="350" stroke="#e2e8f0" stroke-width="1.5" />

  <!-- Minh họa Chiếc Thang (Trùng khít 100% với cạnh huyền AC) -->
  <line x1="${xA - normalX * halfW}" y1="${yA - normalY * halfW}" x2="${xC - normalX * halfW}" y2="${yC - normalY * halfW}" stroke="#78350f" stroke-width="4" stroke-linecap="round" opacity="0.6" />
  <line x1="${xA + normalX * halfW}" y1="${yA + normalY * halfW}" x2="${xC + normalX * halfW}" y2="${yC + normalY * halfW}" stroke="#78350f" stroke-width="4" stroke-linecap="round" opacity="0.6" />
  ${rungs.join('\n  ')}

  <!-- LỚP 1: HÌNH HỌC TOÁN HỌC CỐT LÕI (NẰM TRÊN CÙNG) -->
  <!-- Khung tam giác vuông chính ABC -->
  <polygon points="${xA},${yA} ${xB},${yB} ${xC},${yC}" fill="none" stroke="#2563eb" stroke-width="3.5" stroke-linejoin="round" />

  <!-- Ký hiệu góc vuông tại B -->
  <path d="M ${xB} ${yB - 16} L ${xB + 16} ${yB - 16} L ${xB + 16} ${yB}" fill="none" stroke="#2563eb" stroke-width="2.5" />

  <!-- Cung tròn góc nâng tại C (sweep-flag = 0) -->
  <path d="M ${arcStartX} ${arcStartY} A ${rArc} ${rArc} 0 0 0 ${arcEndX} ${arcEndY}" fill="none" stroke="#ea580c" stroke-width="2.5" />

  <!-- Các điểm đỉnh -->
  <circle cx="${xA}" cy="${yA}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xB}" cy="${yB}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xC}" cy="${yC}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />

  <!-- Nhãn đỉnh -->
  <g font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="#0f172a" filter="url(#textGlow)">
    <text x="${xA - 16}" y="${yA - 14}" text-anchor="middle">${pA}</text>
    <text x="${xB - 22}" y="${yB + 20}" text-anchor="end">${pB}</text>
    <text x="${xC + 22}" y="${yC + 20}" text-anchor="start">${pC}</text>
  </g>

  <!-- Nhãn góc C -->
  <text x="${labelAngleX}" y="${labelAngleY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="#ea580c" filter="url(#textGlow)">${angleC}</text>

  <!-- Số đo chiều dài thang AC -->
  <text x="${(xA + xC) / 2 + 22}" y="${(yA + yC) / 2 - 8}" text-anchor="start" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimHypo}</text>

  <!-- Đường dóng và số đo khoảng cách chân thang BC -->
  <g stroke="#475569" stroke-width="1">
    <line x1="${xB}" y1="${yB + 10}" x2="${xB}" y2="${yB + 45}" />
    <line x1="${xC}" y1="${yB + 10}" x2="${xC}" y2="${yB + 45}" />
    <line x1="${xB + 6}" y1="${yB + 35}" x2="${xC - 6}" y2="${yB + 35}" marker-start="url(#dimArrow)" marker-end="url(#dimArrow)" stroke-width="1.5" stroke="#2563eb" />
  </g>
  <text x="${(xB + xC) / 2}" y="${yB + 28}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimBase}</text>

  ${dimHeight !== 'h = ?' ? `<!-- Số đo chiều cao AB -->
  <text x="${xB - 42}" y="${(yA + yB) / 2 + 5}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimHeight}</text>` : ''}
</svg>`;
}

/**
 * Render a Lighthouse / Boat problem to SVG
 */
function renderLighthouseSvg(spec: MathSpec): string {
  const pA = getPointLabel(spec.points, 'A', 'A');
  const pB = getPointLabel(spec.points, 'B', 'B');
  const pC = getPointLabel(spec.points, 'C', 'C');

  const dimHeight = spec.dimensions?.height || '45m';
  const dimBase = spec.dimensions?.base || 'd = ?';
  const dimHypo = spec.dimensions?.hypotenuse || '';

  const angleDep = spec.angles?.find((a) => a.vertex === 'A' || a.position === 'depression')?.value || '25°';
  const angleElev = spec.angles?.find((a) => a.vertex === 'C' || a.position === 'elevation')?.value || '';

  const xB = 200;
  const yB = 415;
  const xA = 200;
  const yA = 150;
  const xC = 620;
  const yC = 415;

  const rArc = 35;
  const alphaRad = Math.atan2(yC - yA, xC - xA);

  // Depression Arc at A (sweep-flag = 1)
  const depStartX = xA + rArc;
  const depStartY = yA;
  const depEndX = Math.round(xA + rArc * Math.cos(alphaRad));
  const depEndY = Math.round(yA + rArc * Math.sin(alphaRad));
  const depLabelX = Math.round(xA + (rArc + 20) * Math.cos(alphaRad / 2));
  const depLabelY = Math.round(yA + (rArc + 20) * Math.sin(alphaRad / 2));

  // Elevation Arc at C (sweep-flag = 0)
  const arcStartX = xC - rArc;
  const arcStartY = yC;
  const arcEndX = Math.round(xC - rArc * Math.cos(alphaRad));
  const arcEndY = Math.round(yC - rArc * Math.sin(alphaRad));
  const labelAngleX = Math.round(xC - (rArc + 20) * Math.cos(alphaRad / 2));
  const labelAngleY = Math.round(yC - (rArc + 20) * Math.sin(alphaRad / 2) - 2);

  return `<svg viewBox="0 0 800 500" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#ffffff" flood-opacity="0.9" />
    </filter>
    <marker id="dimArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#475569" />
    </marker>
    <linearGradient id="seaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#0369a1" stop-opacity="0.4" />
    </linearGradient>
  </defs>

  <!-- LỚP 2: MINH HỌA MẶT BIỂN, HẢI ĐĂNG & THUYỀN -->
  <rect x="50" y="${yB}" width="700" height="60" fill="url(#seaGrad)" rx="6" />
  <line x1="50" y1="${yB}" x2="750" y2="${yB}" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" />

  <!-- Ngọn hải đăng -->
  <polygon points="${xB - 25},${yB} ${xB + 25},${yB} ${xB + 12},${yA + 30} ${xB - 12},${yA + 30}" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5" />
  <rect x="${xB - 15}" y="${yA + 10}" width="30" height="20" fill="#f59e0b" opacity="0.6" rx="2" />
  <polygon points="${xB - 16},${yA + 10} ${xB + 16},${yA + 10} ${xB},${yA}" fill="#e11d48" opacity="0.8" />

  <!-- Chiếc thuyền tại C -->
  <path d="M ${xC - 25} ${yC + 8} L ${xC + 25} ${yC + 8} L ${xC + 18} ${yC + 20} L ${xC - 18} ${yC + 20} Z" fill="#78350f" opacity="0.8" />
  <line x1="${xC}" y1="${yC + 8}" x2="${xC}" y2="${yC - 18}" stroke="#475569" stroke-width="2" />
  <polygon points="${xC},${yC - 16} ${xC},${yC + 4} ${xC + 16},${yC + 4}" fill="#ffffff" stroke="#94a3b8" stroke-width="1" />

  <!-- Đường nằm ngang tham chiếu từ đỉnh A (nét đứt) -->
  <line x1="${xA}" y1="${yA}" x2="${xA + 160}" y2="${yA}" stroke="#64748b" stroke-width="2" stroke-dasharray="5 4" />

  <!-- LỚP 1: HÌNH HỌC TOÁN HỌC CỐT LÕI (NỔI BẬT NHẤT) -->
  <!-- Khung tam giác vuông chính ABC -->
  <polygon points="${xA},${yA} ${xB},${yB} ${xC},${yC}" fill="none" stroke="#2563eb" stroke-width="3.5" stroke-linejoin="round" />

  <!-- Ký hiệu góc vuông tại B -->
  <path d="M ${xB} ${yB - 16} L ${xB + 16} ${yB - 16} L ${xB + 16} ${yB}" fill="none" stroke="#2563eb" stroke-width="2.5" />

  <!-- Cung tròn góc hạ tại A (sweep-flag = 1) -->
  <path d="M ${depStartX} ${depStartY} A ${rArc} ${rArc} 0 0 1 ${depEndX} ${depEndY}" fill="none" stroke="#ea580c" stroke-width="2.5" />
  <text x="${depLabelX}" y="${depLabelY + 5}" text-anchor="start" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="#ea580c" filter="url(#textGlow)">${angleDep}</text>

  ${angleElev ? `<!-- Cung tròn góc nâng tại C -->
  <path d="M ${arcStartX} ${arcStartY} A ${rArc} ${rArc} 0 0 0 ${arcEndX} ${arcEndY}" fill="none" stroke="#ea580c" stroke-width="2.5" />
  <text x="${labelAngleX}" y="${labelAngleY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="#ea580c" filter="url(#textGlow)">${angleElev}</text>` : ''}

  <!-- Các điểm đỉnh -->
  <circle cx="${xA}" cy="${yA}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xB}" cy="${yB}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xC}" cy="${yC}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />

  <!-- Nhãn đỉnh -->
  <g font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="#0f172a" filter="url(#textGlow)">
    <text x="${xA - 18}" y="${yA - 14}" text-anchor="middle">${pA}</text>
    <text x="${xB - 22}" y="${yB + 20}" text-anchor="end">${pB}</text>
    <text x="${xC + 22}" y="${yC + 20}" text-anchor="start">${pC}</text>
  </g>

  <!-- Chiều cao ngọn hải đăng AB -->
  <g stroke="#475569" stroke-width="1">
    <line x1="${xB - 45}" y1="${yA}" x2="${xB - 5}" y2="${yA}" />
    <line x1="${xB - 45}" y1="${yB}" x2="${xB - 5}" y2="${yB}" />
    <line x1="${xB - 35}" y1="${yA + 6}" x2="${xB - 35}" y2="${yB - 6}" marker-start="url(#dimArrow)" marker-end="url(#dimArrow)" stroke-width="1.5" stroke="#2563eb" />
  </g>
  <text x="${xB - 42}" y="${(yA + yB) / 2 + 5}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimHeight}</text>

  <!-- Khoảng cách chân hải đăng đến thuyền BC -->
  <g stroke="#475569" stroke-width="1">
    <line x1="${xB}" y1="${yB + 10}" x2="${xB}" y2="${yB + 45}" />
    <line x1="${xC}" y1="${yB + 10}" x2="${xC}" y2="${yB + 45}" />
    <line x1="${xB + 6}" y1="${yB + 35}" x2="${xC - 6}" y2="${yB + 35}" marker-start="url(#dimArrow)" marker-end="url(#dimArrow)" stroke-width="1.5" stroke="#2563eb" />
  </g>
  <text x="${(xB + xC) / 2}" y="${yB + 28}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimBase}</text>

  ${dimHypo ? `<!-- Cạnh huyền -->
  <text x="${(xA + xC) / 2 + 22}" y="${(yA + yC) / 2 - 10}" text-anchor="start" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimHypo}</text>` : ''}
</svg>`;
}

/**
 * Render a Building / Observer problem to SVG
 */
function renderBuildingSvg(spec: MathSpec): string {
  const pA = getPointLabel(spec.points, 'A', 'A');
  const pB = getPointLabel(spec.points, 'B', 'B');
  const pC = getPointLabel(spec.points, 'C', 'C');

  const dimHeight = spec.dimensions?.height || 'h = ?';
  const dimBase = spec.dimensions?.base || '30m';
  const dimHypo = spec.dimensions?.hypotenuse || '';

  const angleC = spec.angles?.find((a) => a.vertex === 'C' || a.position === 'elevation')?.value || '40°';

  const xB = 240;
  const yB = 415;
  const xA = 240;
  const yA = 140;
  const xC = 580;
  const yC = 415;

  const rArc = 35;
  const alphaRad = Math.atan2(yB - yA, xC - xB);
  const arcStartX = xC - rArc;
  const arcStartY = yC;
  const arcEndX = Math.round(xC - rArc * Math.cos(alphaRad));
  const arcEndY = Math.round(yC - rArc * Math.sin(alphaRad));

  const labelAngleX = Math.round(xC - (rArc + 20) * Math.cos(alphaRad / 2));
  const labelAngleY = Math.round(yC - (rArc + 20) * Math.sin(alphaRad / 2) - 2);

  return `<svg viewBox="0 0 800 500" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#ffffff" flood-opacity="0.9" />
    </filter>
    <marker id="dimArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#475569" />
    </marker>
  </defs>

  <!-- LỚP 2: TÒA NHÀ & MẶT ĐẤT MINH HỌA -->
  <line x1="80" y1="${yB}" x2="720" y2="${yB}" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
  <rect x="${xB - 70}" y="${yA}" width="70" height="${yB - yA}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
  <!-- Cửa sổ tòa nhà -->
  <g fill="#94a3b8" opacity="0.4">
    <rect x="${xB - 60}" y="${yA + 20}" width="15" height="15" rx="2" />
    <rect x="${xB - 35}" y="${yA + 20}" width="15" height="15" rx="2" />
    <rect x="${xB - 60}" y="${yA + 55}" width="15" height="15" rx="2" />
    <rect x="${xB - 35}" y="${yA + 55}" width="15" height="15" rx="2" />
    <rect x="${xB - 60}" y="${yA + 90}" width="15" height="15" rx="2" />
    <rect x="${xB - 35}" y="${yA + 90}" width="15" height="15" rx="2" />
    <rect x="${xB - 60}" y="${yA + 125}" width="15" height="15" rx="2" />
    <rect x="${xB - 35}" y="${yA + 125}" width="15" height="15" rx="2" />
  </g>

  <!-- LỚP 1: HÌNH HỌC TOÁN HỌC CỐT LÕI (NỔI BẬT NHẤT) -->
  <!-- Khung tam giác vuông chính ABC -->
  <polygon points="${xA},${yA} ${xB},${yB} ${xC},${yC}" fill="none" stroke="#2563eb" stroke-width="3.5" stroke-linejoin="round" />

  <!-- Ký hiệu góc vuông tại B -->
  <path d="M ${xB} ${yB - 16} L ${xB + 16} ${yB - 16} L ${xB + 16} ${yB}" fill="none" stroke="#2563eb" stroke-width="2.5" />

  <!-- Cung tròn góc nâng tại C (sweep-flag = 0) -->
  <path d="M ${arcStartX} ${arcStartY} A ${rArc} ${rArc} 0 0 0 ${arcEndX} ${arcEndY}" fill="none" stroke="#ea580c" stroke-width="2.5" />

  <!-- Các điểm đỉnh -->
  <circle cx="${xA}" cy="${yA}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xB}" cy="${yB}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xC}" cy="${yC}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />

  <!-- Nhãn đỉnh -->
  <g font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="#0f172a" filter="url(#textGlow)">
    <text x="${xA}" y="${yA - 18}" text-anchor="middle">${pA}</text>
    <text x="${xB - 22}" y="${yB + 20}" text-anchor="end">${pB}</text>
    <text x="${xC + 22}" y="${yC + 20}" text-anchor="start">${pC}</text>
  </g>

  <!-- Nhãn góc C -->
  <text x="${labelAngleX}" y="${labelAngleY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="#ea580c" filter="url(#textGlow)">${angleC}</text>

  <!-- Đường dóng và số đo chiều cao AB -->
  <g stroke="#475569" stroke-width="1">
    <line x1="${xB - 85}" y1="${yA}" x2="${xB - 5}" y2="${yA}" />
    <line x1="${xB - 85}" y1="${yB}" x2="${xB - 5}" y2="${yB}" />
    <line x1="${xB - 80}" y1="${yA + 6}" x2="${xB - 80}" y2="${yB - 6}" marker-start="url(#dimArrow)" marker-end="url(#dimArrow)" stroke-width="1.5" stroke="#2563eb" />
  </g>
  <text x="${xB - 88}" y="${(yA + yB) / 2 + 5}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimHeight}</text>

  <!-- Đường dóng và số đo khoảng cách BC -->
  <g stroke="#475569" stroke-width="1">
    <line x1="${xB}" y1="${yB + 10}" x2="${xB}" y2="${yB + 45}" />
    <line x1="${xC}" y1="${yB + 10}" x2="${xC}" y2="${yB + 45}" />
    <line x1="${xB + 6}" y1="${yB + 35}" x2="${xC - 6}" y2="${yB + 35}" marker-start="url(#dimArrow)" marker-end="url(#dimArrow)" stroke-width="1.5" stroke="#2563eb" />
  </g>
  <text x="${(xB + xC) / 2}" y="${yB + 28}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimBase}</text>

  ${dimHypo ? `<!-- Cạnh huyền -->
  <text x="${(xA + xC) / 2 + 22}" y="${(yA + yC) / 2 - 10}" text-anchor="start" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimHypo}</text>` : ''}
</svg>`;
}

/**
 * Render a Circle problem to SVG
 */
function renderCircleSvg(spec: MathSpec): string {
  const pO = getPointLabel(spec.points, 'O', 'O');
  const pM = getPointLabel(spec.points, 'M', 'M');
  const pA = getPointLabel(spec.points, 'A', 'A');
  const pB = getPointLabel(spec.points, 'B', 'B');
  const pH = getPointLabel(spec.points, 'H', 'H');

  const xO = 300;
  const yO = 250;
  const radius = 120;
  const xM = 600;
  const yM = 250;

  // Tangency points geometry
  const dOM = xM - xO; // 300
  const cosTheta = radius / dOM; // 120 / 300 = 0.4
  const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);

  const xA = Math.round(xO + radius * cosTheta);
  const yA = Math.round(yO - radius * sinTheta);

  const xB = Math.round(xO + radius * cosTheta);
  const yB = Math.round(yO + radius * sinTheta);

  const xH = xA;
  const yH = yO;

  return `<svg viewBox="0 0 800 500" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#ffffff" flood-opacity="0.9" />
    </filter>
  </defs>

  <!-- Đường tròn (O; R) -->
  <circle cx="${xO}" cy="${yO}" r="${radius}" fill="#2563eb" fill-opacity="0.04" stroke="#2563eb" stroke-width="3" />

  <!-- Trục nối tâm OM (nét đứt) -->
  <line x1="${xO}" y1="${yO}" x2="${xM}" y2="${yM}" stroke="#64748b" stroke-width="2" stroke-dasharray="6 4" />

  <!-- Dây cung AB -->
  <line x1="${xA}" y1="${yA}" x2="${xB}" y2="${yB}" stroke="#0f172a" stroke-width="2.5" />

  <!-- Bán kính OA, OB -->
  <line x1="${xO}" y1="${yO}" x2="${xA}" y2="${yA}" stroke="#2563eb" stroke-width="2" />
  <line x1="${xO}" y1="${yO}" x2="${xB}" y2="${yB}" stroke="#2563eb" stroke-width="2" />

  <!-- Hai tiếp tuyến MA, MB -->
  <line x1="${xM}" y1="${yM}" x2="${xA}" y2="${yA}" stroke="#0f172a" stroke-width="3" />
  <line x1="${xM}" y1="${yM}" x2="${xB}" y2="${yB}" stroke="#0f172a" stroke-width="3" />

  <!-- Ký hiệu góc vuông tại tiếp điểm A và B -->
  <path d="M ${xA - 5} ${yA + 11} L ${xA + 6} ${yA + 16} L ${xA + 11} ${yA + 5}" fill="none" stroke="#ea580c" stroke-width="2" />
  <path d="M ${xB - 5} ${yB - 11} L ${xB + 6} ${yB - 16} L ${xB + 11} ${yB - 5}" fill="none" stroke="#ea580c" stroke-width="2" />

  <!-- Ký hiệu góc vuông tại giao điểm H -->
  <path d="M ${xH - 12} ${yH} L ${xH - 12} ${yH - 12} L ${xH} ${yH - 12}" fill="none" stroke="#2563eb" stroke-width="2" />

  <!-- Chấm tròn các điểm -->
  <circle cx="${xO}" cy="${yO}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xM}" cy="${yM}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xA}" cy="${yA}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xB}" cy="${yB}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xH}" cy="${yH}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />

  <!-- Nhãn các điểm -->
  <g font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="#0f172a" filter="url(#textGlow)">
    <text x="${xO - 20}" y="${yO + 8}" text-anchor="end">${pO}</text>
    <text x="${xM + 18}" y="${yM + 8}" text-anchor="start">${pM}</text>
    <text x="${xA}" y="${yA - 16}" text-anchor="middle">${pA}</text>
    <text x="${xH + 14}" y="${yH - 12}" text-anchor="start">${pH}</text>
    <text x="${(xO + xA) / 2 - 12}" y="${(yO + yA) / 2}" font-size="18" fill="#2563eb" font-style="italic" font-weight="normal">R</text>
  </g>
</svg>`;
}

/**
 * Render a Pure Math Geometry Triangle to SVG (Clean textbook style, NO real-world clipart)
 */
function renderPureGeometryTriangleSvg(spec: MathSpec): string {
  const pA = getPointLabel(spec.points, 'A', 'A');
  const pB = getPointLabel(spec.points, 'B', 'B');
  const pC = getPointLabel(spec.points, 'C', 'C');

  const dimHeight = spec.dimensions?.height || '';
  const dimBase = spec.dimensions?.base || '';
  const dimHypo = spec.dimensions?.hypotenuse || '';

  // Triangle coordinates centered in 800x500 box
  const xA = 240;
  const yA = 120;
  const xB = 240;
  const yB = 400;
  const xC = 600;
  const yC = 400;

  const rArc = 35;
  const alphaRad = Math.atan2(yB - yA, xC - xB);
  const arcStartX = xC - rArc;
  const arcStartY = yC;
  const arcEndX = Math.round(xC - rArc * Math.cos(alphaRad));
  const arcEndY = Math.round(yC - rArc * Math.sin(alphaRad));

  const labelAngleX = Math.round(xC - (rArc + 20) * Math.cos(alphaRad / 2));
  const labelAngleY = Math.round(yC - (rArc + 20) * Math.sin(alphaRad / 2) - 2);

  const angleC = spec.angles?.find((a) => a.vertex === 'C' || a.position === 'elevation')?.value || '';
  const angleA = spec.angles?.find((a) => a.vertex === 'A' || a.position === 'depression')?.value || '';

  return `<svg viewBox="0 0 800 500" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#ffffff" flood-opacity="0.9" />
    </filter>
  </defs>

  <!-- Khung tam giác toán học chuẩn mực ABC -->
  <polygon points="${xA},${yA} ${xB},${yB} ${xC},${yC}" fill="none" stroke="#2563eb" stroke-width="3.5" stroke-linejoin="round" />

  <!-- Ký hiệu góc vuông tại B -->
  <path d="M ${xB} ${yB - 18} L ${xB + 18} ${yB - 18} L ${xB + 18} ${yB}" fill="none" stroke="#2563eb" stroke-width="2.5" />

  ${angleC ? `<!-- Cung tròn góc tại C (sweep-flag = 0) -->
  <path d="M ${arcStartX} ${arcStartY} A ${rArc} ${rArc} 0 0 0 ${arcEndX} ${arcEndY}" fill="none" stroke="#ea580c" stroke-width="2.5" />
  <text x="${labelAngleX}" y="${labelAngleY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="#ea580c" filter="url(#textGlow)">${angleC}</text>` : ''}

  ${angleA ? `<!-- Cung tròn góc tại A -->
  <path d="M ${xA} ${yA + rArc} A ${rArc} ${rArc} 0 0 0 ${Math.round(xA + rArc * Math.cos(Math.PI/2 - alphaRad))} ${Math.round(yA + rArc * Math.sin(Math.PI/2 - alphaRad))}" fill="none" stroke="#ea580c" stroke-width="2.5" />
  <text x="${xA + 25}" y="${yA + 45}" text-anchor="start" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="#ea580c" filter="url(#textGlow)">${angleA}</text>` : ''}

  <!-- Các điểm đỉnh -->
  <circle cx="${xA}" cy="${yA}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xB}" cy="${yB}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="${xC}" cy="${yC}" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" />

  <!-- Nhãn tên đỉnh (A, B, C) -->
  <g font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="#0f172a" filter="url(#textGlow)">
    <text x="${xA}" y="${yA - 18}" text-anchor="middle">${pA}</text>
    <text x="${xB - 22}" y="${yB + 20}" text-anchor="end">${pB}</text>
    <text x="${xC + 22}" y="${yC + 20}" text-anchor="start">${pC}</text>
  </g>

  <!-- Số đo cạnh AB -->
  ${dimHeight ? `<text x="${xB - 25}" y="${(yA + yB) / 2 + 6}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimHeight}</text>` : ''}

  <!-- Số đo cạnh BC -->
  ${dimBase ? `<text x="${(xB + xC) / 2}" y="${yB + 28}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimBase}</text>` : ''}

  <!-- Số đo cạnh AC -->
  ${dimHypo ? `<text x="${(xA + xC) / 2 + 20}" y="${(yA + yC) / 2 - 10}" text-anchor="start" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#2563eb" filter="url(#textGlow)">${dimHypo}</text>` : ''}
</svg>`;
}

/**
 * Universal dispatcher: Converts any MathSpec into a flawless SVG string
 */
export function renderStructuredMathToSvg(spec: MathSpec): string {
  if (spec.rawSvg && spec.rawSvg.includes('<svg')) {
    return spec.rawSvg;
  }

  const type = (spec.type || '').toUpperCase();

  if (type.includes('SHADOW') || type.includes('SUN')) {
    return renderShadowSvg(spec);
  }

  if (type.includes('LADDER') || type.includes('THANG')) {
    return renderLadderSvg(spec);
  }

  if (type.includes('LIGHTHOUSE') || type.includes('HAI_DANG') || type.includes('CLIFF') || type.includes('BOAT')) {
    return renderLighthouseSvg(spec);
  }

  if (type.includes('BUILDING') || type.includes('TOWER') || type.includes('NHA')) {
    return renderBuildingSvg(spec);
  }

  if (type.includes('CIRCLE') || type.includes('TRON')) {
    return renderCircleSvg(spec);
  }

  if (type.includes('PURE') || type.includes('TRIANGLE') || type.includes('TAM_GIAC') || type.includes('GENERAL')) {
    return renderPureGeometryTriangleSvg(spec);
  }

  // Default to pure geometry triangle (NO clipart, NO trees, NO sun)
  return renderPureGeometryTriangleSvg(spec);
}

