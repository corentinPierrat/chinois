export async function loadData(url = "data/lessons.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Chargement impossible: ${url} (${res.status})`);
  return res.json();
}

export function wordsFor(data, lessonIds, { includeProper = true } = {}) {
  return data.words.filter((w) => lessonIds.includes(w.lesson) && (includeProper || !w.proper));
}

export const rulesFor = (data, lessonIds) => data.rules.filter((r) => lessonIds.includes(r.lesson));

export const sentence = (data, id) => data.sentences.find((s) => s.id === id);
