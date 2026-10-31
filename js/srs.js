export const itemKey = (mode, wordId) => `${mode}:${wordId}`;

export function record(progress, key, correct, now = Date.now()) {
  const cur = progress[key] || { box: 0, seen: 0, wrong: 0, last: 0 };
  const box = correct ? Math.min(5, Math.max(1, cur.box) + 1) : 1;
  return {
    ...progress,
    [key]: { box, seen: cur.seen + 1, wrong: cur.wrong + (correct ? 0 : 1), last: now },
  };
}

export function pickNext(keys, progress, rng = Math.random, last = null) {
  if (!keys.length) return null;
  let cands = keys.length > 1 ? keys.filter((k) => k !== last) : keys;
  if (!cands.length) cands = keys;
  const weight = (k) => 6 - (progress[k]?.box ?? 0);
  // heaviest first (stable), so a low rng favors the least-known items
  const sorted = cands.map((k, i) => [k, weight(k), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]);
  const total = sorted.reduce((s, x) => s + x[1], 0);
  let r = rng() * total;
  let pick = sorted[sorted.length - 1][0];
  for (const [k, w] of sorted) {
    if (r < w) { pick = k; break; }
    r -= w;
  }
  return pick;
}

// Keys not yet answered correctly this session; once all are, start a new round.
export function remaining(keys, done) {
  const left = keys.filter((k) => !done.has(k));
  if (left.length) return left;
  done.clear();
  return keys;
}
