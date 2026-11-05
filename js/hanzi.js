// Shared Hanzi Writer helpers (stroke data cache, theme colours, 米字格 grid).
const cache = new Map(); // char -> Promise<json>, shared across views and visits
export function charData(c) {
  if (!cache.has(c)) {
    const p = fetch("data/hanzi/" + encodeURIComponent(c) + ".json").then((r) => {
      if (!r.ok) throw new Error(`Données absentes pour ${c}`);
      return r.json();
    });
    p.catch(() => cache.delete(c));
    cache.set(c, p);
  }
  return cache.get(c);
}

export function colors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fb) => cs.getPropertyValue(name).trim() || fb;
  return {
    strokeColor: v("--hw-stroke", "#222222"),
    outlineColor: v("--hw-outline", "#dddddd"),
    drawingColor: v("--hw-draw", "#c0392b"),
    highlightColor: v("--hw-hint", "#3b82f6"),
  };
}

export const GRID_SVG = `<svg class="mizige" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke-width="1" vector-effect="non-scaling-stroke"/>
  <path d="M50 0V100M0 50H100M0 0L100 100M100 0L0 100" stroke-dasharray="3 3" stroke-width="1" vector-effect="non-scaling-stroke"/>
</svg>`;
