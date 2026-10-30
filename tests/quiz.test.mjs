import test from "node:test";
import assert from "node:assert/strict";
import { makeChoiceQuestion, cjkChars, writeQueue, reorderQuestion, gapQuestion } from "../js/quiz.js";

const w = (i, fr, extra = {}) => ({ id: "W" + i, hanzi: "字" + i, pinyin: "p" + i, fr, proper: false, ...extra });
const all = Array.from({ length: 10 }, (_, i) => w(i, "fr" + i));

test("choice question tops up from allWords", () => {
  const pool = all.slice(0, 2);
  const q = makeChoiceQuestion(pool[0], pool, "fr", () => 0.3, all);
  assert.equal(q.choices.length, 4);
  assert.equal(new Set(q.choices).size, 4);
  assert.equal(q.choices[q.answerIndex], "fr0");
  assert.equal(q.choices.filter((c) => c === "fr0").length, 1);
  assert.equal(q.word, pool[0]);
});
test("duplicate values in pool give no duplicate choices", () => {
  const pool = [w(0, "a"), w(1, "b"), w(2, "b"), w(3, "b"), w(4, "c"), w(5, "a"), w(6, "d")];
  for (let s = 0; s < 20; s++) {
    let x = s + 1;
    const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    const q = makeChoiceQuestion(pool[0], pool, "fr", rng, pool);
    assert.equal(new Set(q.choices).size, 4);
    assert.equal(q.choices[q.answerIndex], "a");
  }
});
test("pinyin field", () => {
  const q = makeChoiceQuestion(all[3], all, "pinyin", Math.random);
  assert.equal(q.choices[q.answerIndex], "p3");
});
test("cjkChars keeps only Han", () => {
  assert.deepEqual(cjkChars("AI小语，你好！"), ["小", "语", "你", "好"]);
});
test("writeQueue excludes proper nouns and dedupes", () => {
  const words = [
    { hanzi: "你好", proper: false },
    { hanzi: "王", proper: true },
    { hanzi: "好人", proper: false },
  ];
  assert.deepEqual(writeQueue(words), ["你", "好", "人"]);
});
test("reorderQuestion", () => {
  const s = { tokens: ["我", "是", "学生", "。"] };
  for (let i = 0; i < 30; i++) {
    const q = reorderQuestion(s, Math.random);
    assert.deepEqual(q.answer, ["我", "是", "学生"]);
    assert.deepEqual([...q.tokens].sort(), [...q.answer].sort());
    assert.notDeepEqual(q.tokens, q.answer);
  }
});
test("reorderQuestion single token", () => {
  const q = reorderQuestion({ tokens: ["好", "！"] }, Math.random);
  assert.deepEqual(q.tokens, ["好"]);
});
test("gapQuestion null when nothing matches", () => {
  const s = { tokens: ["我", "是", "。"] };
  assert.equal(gapQuestion(s, [{ hanzi: "你", proper: false }], Math.random), null);
  assert.equal(gapQuestion(s, [{ hanzi: "我", proper: true }], Math.random), null);
});
test("gapQuestion blanks a matching token", () => {
  const s = { tokens: ["我", "是", "学生", "。"] };
  const words = [{ hanzi: "是", proper: false }, { hanzi: "学生", proper: false }, { hanzi: "老师", proper: false }, { hanzi: "好", proper: false }, { hanzi: "你", proper: false }];
  const g = gapQuestion(s, words, () => 0);
  assert.ok(g);
  assert.equal(g.before + g.answer + g.after, "我是学生。");
  assert.equal(g.choices.length, 4);
  assert.equal(new Set(g.choices).size, 4);
  assert.ok(g.choices.includes(g.answer));
});
test("gapQuestion tops up distractors from allWords", () => {
  const s = { tokens: ["我", "是", "。"] };
  const words = [{ hanzi: "是", proper: false }];
  const allWords = Array.from({ length: 10 }, (_, i) => ({ hanzi: "字" + i, proper: false })).concat(words);
  const g = gapQuestion(s, words, () => 0.2, allWords);
  assert.equal(g.choices.length, 4);
  assert.equal(new Set(g.choices).size, 4);
  assert.equal(g.choices.filter((c) => c === "是").length, 1);
});
test("choice question never offers a homograph's other meaning", () => {
  const pool = [
    { id: "a", hanzi: "想", pinyin: "xiǎng", fr: "penser", proper: false },
    { id: "b", hanzi: "想", pinyin: "xiǎng", fr: "avoir envie", proper: false },
    ...Array.from({ length: 6 }, (_, i) => w(i, "fr" + i)),
  ];
  for (let n = 0; n < 50; n++) {
    let s = n + 1;
    const rng = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const q = makeChoiceQuestion(pool[0], pool, "fr", rng);
    assert.ok(!q.choices.includes("avoir envie"));
    assert.equal(q.choices[q.answerIndex], "penser");
  }
});
test("gapQuestion never offers the synonym of the answer", () => {
  const words = [
    { hanzi: "星期日", fr: "dimanche", proper: false },
    { hanzi: "星期天", fr: "dimanche", proper: false },
    ...Array.from({ length: 6 }, (_, i) => w(i, "fr" + i)),
  ];
  const s = { tokens: ["今天", "星期日", "。"] };
  for (let n = 0; n < 50; n++) {
    let k = n + 1;
    const rng = () => ((k = (k * 16807) % 2147483647) / 2147483647);
    const g = gapQuestion({ tokens: ["星期日"] }, words, rng);
    assert.ok(!g.choices.includes("星期天"));
  }
});
