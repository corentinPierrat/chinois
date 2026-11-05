import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cjkChars } from "../js/quiz.js";
import { shuffle } from "../js/views/cards.js";

const affiche = JSON.parse(readFileSync(new URL("../data/affiche.json", import.meta.url), "utf8"));

test("affiche has exactly one card per character of title + text", () => {
  const want = [...new Set(cjkChars(affiche.title + affiche.text))];
  const got = affiche.cards.map((c) => c.hanzi);
  assert.deepEqual(got.slice().sort(), want.slice().sort());
  assert.equal(new Set(got).size, got.length, "duplicate card");
  for (const c of affiche.cards) assert.ok(c.pinyin && c.fr, `${c.hanzi}: missing pinyin or fr`);
});

test("shuffle keeps every item and leaves the input untouched", () => {
  const a = [1, 2, 3, 4, 5];
  const s = shuffle(a, () => 0);
  assert.deepEqual(a, [1, 2, 3, 4, 5]);
  assert.deepEqual(s.slice().sort(), a);
});
