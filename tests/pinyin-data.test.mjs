import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { syllables } from "../js/pinyin.js";
import { cjkChars } from "../js/quiz.js";

const path = new URL("../data/lessons.json", import.meta.url);
const has = existsSync(path);

test("all data pinyin splits cleanly", { skip: !has && "data/lessons.json missing" }, () => {
  const data = JSON.parse(readFileSync(path, "utf8"));
  const bad = [];
  for (const w of data.words) {
    let n;
    try { n = syllables(w.pinyin).length; } catch (e) { bad.push(`${w.id} threw ${e.message}`); continue; }
    const han = cjkChars(w.hanzi).length;
    const onlyCjk = han > 0 && w.hanzi.replace(/\p{Script=Han}/gu, "").trim() === "";
    if (onlyCjk && n !== han) bad.push(`${w.id} ${w.hanzi} "${w.pinyin}": ${n} syllables vs ${han} chars`);
  }
  for (const s of data.sentences) {
    try { syllables(s.pinyin); } catch (e) { bad.push(`${s.id} threw ${e.message}`); }
  }
  assert.equal(bad.length, 0, bad.join("\n"));
});
