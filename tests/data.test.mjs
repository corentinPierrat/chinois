import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../scripts/validate-data.mjs";

const fixture = () => ({
  lessons: [{ id: 1, title: "AI小语，你好！", pinyin: "AI Xiǎoyǔ, nǐ hǎo!", fr: "Bonjour, AI Xiaoyu !" }],
  words: [
    { id: "L1-W1", lesson: 1, n: 1, hanzi: "你好", pinyin: "nǐ hǎo", pos: "", en: "hello", fr: "bonjour", proper: false, source: "manuel" },
    { id: "L1-W3", lesson: 1, n: 3, hanzi: "好", pinyin: "hǎo", pos: "adj.", en: "good", fr: "bien", proper: false, source: "manuel" },
    { id: "L1-N1", lesson: 1, n: 1, hanzi: "年", pinyin: "nián", pos: "", en: "year", fr: "année", proper: false, source: "notes" },
  ],
  sentences: [
    { id: "L1-T1-S1", lesson: 1, text: 1, speaker: "王一飞", hanzi: "大家好！", pinyin: "Dàjiā hǎo!", en: "Hello!", fr: "Bonjour !", tokens: ["大家", "好", "！"] },
  ],
  rules: [
    { id: "L1-R1", lesson: 1, kind: "grammar", title: "t", structure: "", fr: "f", explanation: "e", examples: ["L1-T1-S1"], derived: true },
  ],
});

test("fixture is valid and reports the gap in -W numbering only", () => {
  const { errors, gaps } = validate(fixture());
  assert.deepEqual(errors, []);
  assert.deepEqual(gaps, ["L1: missing word n 2"]);
});

test("detects duplicate ids, bad lesson, token mismatch, unknown example, missing field", () => {
  const d = fixture();
  d.words.push({ ...d.words[0] });
  d.words[1].lesson = 9;
  d.sentences[0].tokens = ["大家", "！"];
  d.rules[0].examples.push("L1-T9-S9");
  delete d.lessons[0].fr;
  const { errors } = validate(d);
  const has = (re) => assert.ok(errors.some((e) => re.test(e)), `expected ${re} in ${errors.join(" | ")}`);
  has(/L1-W1: duplicate id/);
  has(/L1-W3: lesson 9 not in 1-8/);
  has(/L1-T1-S1: tokens join/);
  has(/L1-T9-S9 not found/);
  has(/missing field "fr"/);
});

test("syllable/char mismatch is a warning, not an error", () => {
  const d = fixture();
  d.words[0].pinyin = "nǐ";
  const { errors, warnings } = validate(d);
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
});

test("data/lessons.json has no validation errors", () => {
  const data = JSON.parse(readFileSync(new URL("../data/lessons.json", import.meta.url), "utf8"));
  const { errors } = validate(data);
  assert.deepEqual(errors, []);
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) assert.ok(data.lessons.some((l) => l.id === id), `lesson ${id}`);
});
