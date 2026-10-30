// Validates data/lessons.json. Usage: node scripts/validate-data.mjs [path]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { syllables } from "../js/pinyin.js";
import { cjkChars } from "../js/quiz.js";

const REQUIRED = {
  lessons: ["id", "title", "pinyin", "fr"],
  words: ["id", "lesson", "n", "hanzi", "pinyin", "pos", "en", "fr", "proper", "source"],
  sentences: ["id", "lesson", "text", "speaker", "hanzi", "pinyin", "en", "fr", "tokens"],
  rules: ["id", "lesson", "kind", "title", "structure", "fr", "explanation", "examples", "derived"],
};
// Fields that must also be non-empty.
const NON_EMPTY = {
  lessons: ["title"],
  words: ["hanzi", "pinyin", "fr"],
  sentences: ["hanzi", "pinyin", "fr"],
  rules: ["title", "fr", "explanation"],
};

const inLesson = (n) => Number.isInteger(n) && n >= 1 && n <= 8;
const onlyHan = (s) => cjkChars(s).length > 0 && s.replace(/\p{Script=Han}/gu, "").trim() === "";

export function validate(data) {
  const errors = [];
  const warnings = [];
  const gaps = [];
  const ids = new Set();

  for (const coll of Object.keys(REQUIRED)) {
    if (!Array.isArray(data?.[coll])) {
      errors.push(`missing array "${coll}"`);
      continue;
    }
    for (const item of data[coll]) {
      const label = `${coll} ${item?.id ?? "(no id)"}`;
      for (const f of REQUIRED[coll]) {
        if (item[f] === undefined || item[f] === null) errors.push(`${label}: missing field "${f}"`);
      }
      for (const f of NON_EMPTY[coll]) {
        if (typeof item[f] === "string" && item[f].trim() === "") errors.push(`${label}: empty field "${f}"`);
      }
      const key = `${coll}:${item.id}`;
      if (ids.has(key)) errors.push(`${label}: duplicate id`);
      ids.add(key);
      const lesson = coll === "lessons" ? item.id : item.lesson;
      if (!inLesson(lesson)) errors.push(`${label}: lesson ${lesson} not in 1-8`);
    }
  }
  if (errors.some((e) => e.startsWith("missing array"))) return { errors, warnings, gaps };

  for (const w of data.words) {
    if (!["manuel", "notes"].includes(w.source)) errors.push(`words ${w.id}: bad source "${w.source}"`);
    if (typeof w.proper !== "boolean") errors.push(`words ${w.id}: proper must be boolean`);
    if (!w.proper && typeof w.hanzi === "string" && onlyHan(w.hanzi)) {
      const han = cjkChars(w.hanzi).length;
      const syl = syllables(w.pinyin ?? "").length;
      if (han !== syl) warnings.push(`words ${w.id} ${w.hanzi} "${w.pinyin}": ${han} chars vs ${syl} syllables`);
    }
  }

  const sentenceIds = new Set();
  for (const s of data.sentences) {
    sentenceIds.add(s.id);
    if (!Array.isArray(s.tokens)) errors.push(`sentences ${s.id}: tokens must be an array`);
    else if (s.tokens.join("") !== s.hanzi) errors.push(`sentences ${s.id}: tokens join "${s.tokens.join("")}" !== hanzi "${s.hanzi}"`);
  }

  for (const r of data.rules) {
    if (!["grammar", "tip"].includes(r.kind)) errors.push(`rules ${r.id}: bad kind "${r.kind}"`);
    if (typeof r.derived !== "boolean") errors.push(`rules ${r.id}: derived must be boolean`);
    if (!Array.isArray(r.examples)) errors.push(`rules ${r.id}: examples must be an array`);
    else for (const ex of r.examples) if (!sentenceIds.has(ex)) errors.push(`rules ${r.id}: example ${ex} not found`);
  }

  // Gaps: missing word numbers per lesson, only for textbook "-W" ids.
  const nums = {};
  for (const w of data.words) {
    if (!/^L\d+-W\d+$/.test(w.id)) continue;
    (nums[w.lesson] ??= new Set()).add(w.n);
  }
  for (const lesson of Object.keys(nums).map(Number).sort((a, b) => a - b)) {
    const max = Math.max(...nums[lesson]);
    const missing = [];
    for (let n = 1; n <= max; n++) if (!nums[lesson].has(n)) missing.push(n);
    if (missing.length) gaps.push(`L${lesson}: missing word n ${missing.join(", ")}`);
  }

  return { errors, warnings, gaps };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2] ?? new URL("../data/lessons.json", import.meta.url);
  const data = JSON.parse(readFileSync(path, "utf8"));
  const { errors, warnings, gaps } = validate(data);
  for (const l of data.lessons ?? []) {
    const n = (coll, f = () => true) => (data[coll] ?? []).filter((x) => x.lesson === l.id && f(x)).length;
    console.log(
      `L${l.id} ${l.title}: ${n("words", (w) => !w.proper)} words, ${n("words", (w) => w.proper)} proper, ` +
        `${n("sentences")} sentences, ${n("rules")} rules`
    );
  }
  console.log(gaps.length ? `Gaps:\n  ${gaps.join("\n  ")}` : "Gaps: none");
  if (warnings.length) console.log(`Warnings (${warnings.length}):\n  ${warnings.join("\n  ")}`);
  if (errors.length) {
    console.error(`Errors (${errors.length}):\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  console.log("OK: no errors");
}
