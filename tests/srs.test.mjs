import test from "node:test";
import assert from "node:assert/strict";
import { itemKey, record, pickNext, remaining } from "../js/srs.js";

test("itemKey", () => assert.equal(itemKey("rec", "L1-W1"), "rec:L1-W1"));
test("correct raises box", () => {
  const p = record({}, "rec:L1-W1", true, 123);
  assert.equal(p["rec:L1-W1"].box, 2);
  assert.equal(p["rec:L1-W1"].seen, 1);
  assert.equal(p["rec:L1-W1"].wrong, 0);
  assert.equal(p["rec:L1-W1"].last, 123);
});
test("wrong resets to box 1", () => {
  const p = record({ k: { box: 4, seen: 3, wrong: 0, last: 0 } }, "k", false);
  assert.equal(p.k.box, 1);
  assert.equal(p.k.wrong, 1);
  assert.equal(p.k.seen, 4);
});
test("box never exceeds 5", () => {
  let p = {};
  for (let i = 0; i < 10; i++) p = record(p, "k", true);
  assert.equal(p.k.box, 5);
});
test("record does not mutate input", () => {
  const p = {};
  record(p, "k", true);
  assert.deepEqual(p, {});
});
test("pickNext favors unseen with rng 0", () => {
  const p = { a: { box: 5, seen: 9, wrong: 0, last: 0 } };
  assert.equal(pickNext(["a", "b"], p, () => 0), "b");
});
test("pickNext single key", () => assert.equal(pickNext(["a"], {}, () => 0.5), "a"));
test("pickNext never returns last when several keys", () => {
  for (const last of ["x", "y", "z"]) {
    for (let i = 0; i < 50; i++) {
      assert.notEqual(pickNext(["x", "y", "z"], {}, Math.random, last), last);
    }
  }
});
test("pickNext with single key ignores last", () => assert.equal(pickNext(["a"], {}, Math.random, "a"), "a"));
test("pickNext on empty list returns null", () => assert.equal(pickNext([], {}), null));
test("remaining excludes keys already answered correctly", () => {
  const done = new Set(["a"]);
  assert.deepEqual(remaining(["a", "b", "c"], done), ["b", "c"]);
  assert.equal(done.size, 1);
});
test("remaining starts a new round once every key is done", () => {
  const done = new Set(["a", "b"]);
  assert.deepEqual(remaining(["a", "b"], done), ["a", "b"]);
  assert.equal(done.size, 0);
});
