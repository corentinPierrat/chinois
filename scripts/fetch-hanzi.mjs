// Downloads Hanzi Writer stroke data for every CJK char in data/lessons.json (words + sentences) and data/test.json.
// Usage: node scripts/fetch-hanzi.mjs   (skips files already present, reports failures)
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cjkChars } from "../js/quiz.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data", "hanzi");
const URL_BASE = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/";

const data = JSON.parse(await readFile(join(ROOT, "data", "lessons.json"), "utf8"));
const chars = new Set();
for (const w of data.words) cjkChars(w.hanzi).forEach((c) => chars.add(c));
for (const s of data.sentences) cjkChars(s.hanzi).forEach((c) => chars.add(c));
for (const l of data.lessons) cjkChars(l.title).forEach((c) => chars.add(c));
const test = JSON.parse(await readFile(join(ROOT, "data", "test.json"), "utf8"));
for (const t of [...test.numbers, ...test.simples]) cjkChars(t.hanzi).forEach((c) => chars.add(c));

await mkdir(OUT, { recursive: true });
const exists = (p) => access(p).then(() => true, () => false);
let fetched = 0, skipped = 0;
const failed = [];
for (const c of chars) {
  const file = join(OUT, `${c}.json`);
  if (await exists(file)) { skipped++; continue; }
  try {
    const res = await fetch(URL_BASE + encodeURIComponent(c) + ".json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.strokes)) throw new Error("format inattendu");
    await writeFile(file, JSON.stringify(json));
    fetched++;
  } catch (e) {
    failed.push(`${c} (${e.message})`);
  }
}
console.log(`${chars.size} caractères : ${fetched} téléchargés, ${skipped} déjà présents, ${failed.length} échecs`);
if (failed.length) { console.log("Échecs : " + failed.join(", ")); process.exitCode = 1; }
