import test from "node:test";
import assert from "node:assert/strict";
import { syllables, markTone } from "../js/pinyin.js";

const tones = (s) => syllables(s).map((x) => x.tone);
const bases = (s) => syllables(s).map((x) => x.base);

test("nǐ hǎo", () => assert.deepEqual(tones("nǐ hǎo"), [3, 3]));
test("xièxie", () => {
  assert.deepEqual(bases("xièxie"), ["xie", "xie"]);
  assert.deepEqual(tones("xièxie"), [4, 5]);
});
test("bú kèqi", () => assert.deepEqual(tones("bú kèqi"), [2, 4, 5]));
test("Wáng lǎoshī", () => assert.deepEqual(bases("Wáng lǎoshī"), ["wang", "lao", "shi"]));
test("nǚ'ér", () => {
  assert.deepEqual(bases("nǚ'ér"), ["nü", "er"]);
  assert.deepEqual(tones("nǚ'ér"), [3, 2]);
});
test("AI skipped", () => assert.equal(syllables("AI Xiǎoyǔ, nǐ hǎo!").length, 4));
test("zàijiàn", () => assert.deepEqual(bases("zàijiàn"), ["zai", "jian"]));
test("yīshēng", () => assert.deepEqual(bases("yīshēng"), ["yi", "sheng"]));
test("Zhōngguó", () => assert.deepEqual(bases("Zhōngguó"), ["zhong", "guo"]));
test("text keeps diacritics, lowercase", () => {
  assert.deepEqual(syllables("Zhōngguó").map((x) => x.text), ["zhōng", "guó"]);
});
test("xī'ān vs xiān", () => {
  assert.deepEqual(bases("xī'ān"), ["xi", "an"]);
  assert.deepEqual(bases("xiān"), ["xian"]);
});
test("alternative readings use the first one", () => {
  assert.deepEqual(syllables("shéi/shuí").map((x) => [x.base, x.tone]), [["shei", 2]]);
  assert.deepEqual(syllables("li/lǐ").map((x) => [x.base, x.tone]), [["li", 5]]);
});
test("erhua gives a separate r syllable", () => {
  assert.deepEqual(bases("miàntiáor"), ["mian", "tiao", "r"]);
  assert.deepEqual(tones("miàntiáor"), [4, 2, 5]);
  assert.deepEqual(bases("nǎr"), ["na", "r"]);
  assert.deepEqual(tones("nǎr"), [3, 5]);
  assert.deepEqual(syllables("nǎr")[1], { text: "r", base: "r", tone: 5 });
});

test("markTone placement", () => {
  assert.equal(markTone("xie", 4), "xiè");
  assert.equal(markTone("hao", 3), "hǎo");
  assert.equal(markTone("gou", 3), "gǒu");
  assert.equal(markTone("liu", 2), "liú");
  assert.equal(markTone("gui", 4), "guì");
  assert.equal(markTone("nü", 3), "nǚ");
  assert.equal(markTone("lüe", 4), "lüè");
  assert.equal(markTone("ma", 5), "ma");
  assert.equal(markTone("shu", 1), "shū");
});
