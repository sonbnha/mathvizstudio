/**
 * MathViz Studio - SVG Auto-Optimizer & Sanitizer
 * Automatically normalizes SVG viewBox, styles, glow filters, text positioning, and removes unwanted clutter.
 */

export function optimizeSvg(rawSvg: string): string {
  try {
    let clean = rawSvg.trim();

    // 1. Strip markdown fences if present
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:xml|svg|html|javascript|js|json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    }

    // 2. Extract <svg>...</svg> block
    const match = clean.match(/<svg[\s\S]*?<\/svg>/i);
    if (match) {
      clean = match[0];
    } else {
      clean = clean.replace(/```xml|```svg|```html|```/gi, '').trim();
    }

    if (!clean.includes('<svg')) {
      return clean;
    }

    // 3. Ensure SVG essential root attributes
    if (!clean.includes('xmlns=')) {
      clean = clean.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!clean.includes('viewBox=')) {
      clean = clean.replace(/<svg/i, '<svg viewBox="0 0 800 500"');
    }
    if (!clean.includes('width=')) {
      clean = clean.replace(/<svg/i, '<svg width="100%"');
    }
    if (!clean.includes('height=')) {
      clean = clean.replace(/<svg/i, '<svg height="100%"');
    }
    if (!clean.includes('overflow=')) {
      clean = clean.replace(/<svg/i, '<svg overflow="visible"');
    }

    // 4. Inject glow filter in <defs> if not present for crisp readability
    const glowDef = `<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#ffffff" flood-opacity="0.95"/></filter>`;
    if (!clean.includes('id="glow"') && !clean.includes("id='glow'")) {
      if (clean.includes('<defs>')) {
        clean = clean.replace('<defs>', `<defs>\n    ${glowDef}`);
      } else if (clean.includes('</svg>')) {
        clean = clean.replace(/<svg([^>]*)>/i, `<svg$1>\n  <defs>\n    ${glowDef}\n  </defs>`);
      }
    }

    // 5. Remove long description text (titles, prompt copies, explanations > 25 chars)
    clean = clean.replace(/<text[^>]*>([^<]{25,})<\/text>/gi, '');

    // 6. Ensure text elements have filter="url(#glow)" if none exists to avoid blending into lines
    clean = clean.replace(/<text(?![^>]*filter=)([^>]*)>([A-Za-z0-9°αβ\s=\.\,\-\+\?]{1,12})<\/text>/gi, '<text$1 filter="url(#glow)">$2</text>');

    return clean.trim();
  } catch (err) {
    console.warn('[optimizeSvg] Error during optimization:', err);
    return rawSvg;
  }
}
