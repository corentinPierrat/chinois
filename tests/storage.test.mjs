import test from "node:test";
import assert from "node:assert/strict";
import storage, { createStorage } from "../js/storage.js";

test("load falls back when getItem throws", () => {
  const s = createStorage({ getItem() { throw new Error("x"); } });
  assert.deepEqual(s.load("k", { a: 1 }), { a: 1 });
});
test("load falls back on invalid JSON", () => {
  const s = createStorage({ getItem: () => "{not json" });
  assert.deepEqual(s.load("k", { a: 1 }), { a: 1 });
});
test("load falls back when key is missing", () => {
  const s = createStorage({ getItem: () => null });
  assert.equal(s.load("k", 7), 7);
});
test("save returns false when setItem throws", () => {
  const s = createStorage({ setItem() { throw new Error("full"); } });
  assert.equal(s.save("k", 1), false);
});
test("save/load round trip", () => {
  const m = {};
  const s = createStorage({ getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; } });
  assert.equal(s.save("k", { b: 2 }), true);
  assert.deepEqual(s.load("k", null), { b: 2 });
});
test("createStorage(undefined) works without localStorage", () => {
  const s = createStorage(undefined);
  assert.equal(s.load("k", 3), 3);
  assert.equal(typeof s.save("k", 1), "boolean");
  assert.equal(typeof storage.load, "function");
});
