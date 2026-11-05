import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { buildRun, note20 } from "../js/views/test.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const t = read("../data/test.json");
const data = read("../data/lessons.json");
const info = read("../data/infographie.json");

test("test.json: 0..10 in order, simples present, stroke data for every char", () => {
  assert.deepEqual(t.numbers.map((n) => n.digit), ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  for (const c of ["上", "下", "不", "我", "你", "他"]) assert.ok(t.simples.some((s) => s.hanzi === c), c);
  for (const it of [...t.numbers, ...t.simples]) {
    assert.ok(it.pinyin && it.fr, it.hanzi);
    assert.ok(existsSync(new URL(`../data/hanzi/${it.hanzi}.json`, import.meta.url)), `stroke data missing: ${it.hanzi}`);
  }
});

test("buildRun: writing runs cover every item once", () => {
  assert.equal(buildRun("numbers", t, [], []).length, 11);
  const all = buildRun("writeall", t, [], []);
  assert.equal(all.length, t.numbers.length + t.simples.length);
  assert.equal(new Set(all.map((q) => q.item.hanzi)).size, all.length);
});

test("buildRun: exam = 10 writes (half numbers) then 15 QCM with the answer among choices", () => {
  const pool = data.words.filter((w) => !w.proper);
  const run = buildRun("exam", t, pool, data.words);
  const writes = run.filter((q) => q.type === "write");
  assert.equal(writes.length, 10);
  assert.equal(writes.filter((q) => q.item.digit).length, 5);
  const qcm = run.filter((q) => q.type === "qcm");
  assert.equal(qcm.filter((q) => q.field === "rec").length, 10);
  assert.equal(qcm.filter((q) => q.field === "recpy").length, 5);
  assert.equal(new Set(qcm.map((q) => q.q.word.id)).size, 15, "a word is asked twice");
  for (const { q, field } of qcm) assert.equal(q.choices[q.answerIndex], q.word[field === "rec" ? "fr" : "pinyin"]);
});

test("note20 rounds to one decimal", () => {
  assert.equal(note20(0, 0), 0);
  assert.equal(note20(25, 25), 20);
  assert.equal(note20(2, 3), 13.3);
});

test("infographie deck: complete cards, no duplicate hanzi", () => {
  for (const c of info.cards) assert.ok(c.hanzi && c.pinyin && c.fr && c.word, JSON.stringify(c));
  const hz = info.cards.map((c) => c.hanzi);
  assert.equal(new Set(hz).size, hz.length);
});

test("cahier sentences: reorder questions in exam and cahier runs", () => {
  const sents = data.sentences.filter((s) => s.speaker === "cahier");
  assert.ok(sents.length >= 12);
  const pool = data.words.filter((w) => !w.proper);
  const run = buildRun("exam", t, pool, data.words, Math.random, sents);
  assert.equal(run.filter((q) => q.type === "reorder").length, 3);
  const c = buildRun("cahier", t, pool, data.words, Math.random, sents);
  assert.equal(c.length, 20);
  for (const q of c) assert.ok(q.answer.length >= 3);
  for (const q of c) assert.deepEqual(q.tokens.slice().sort(), q.answer.slice().sort());
});
