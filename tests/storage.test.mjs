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
test("load rejects null / wrong-type stored values", () => {
  const mk = (raw) => createStorage({ getItem: () => raw });
  assert.deepEqual(mk("null").load("k", { a: 1 }), { a: 1 });
  assert.deepEqual(mk("5").load("k", { a: 1 }), { a: 1 });
  assert.deepEqual(mk("[]").load("k", { a: 1 }), { a: 1 });
  assert.deepEqual(mk("{}").load("k", []), []);
  assert.deepEqual(mk('{"b":2}').load("k", { a: 1 }), { b: 2 });
});
test("throwing globalThis.localStorage getter is tolerated", () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("SecurityError"); } });
  try {
    const s = createStorage();
    assert.deepEqual(s.load("k", { a: 1 }), { a: 1 });
    assert.equal(s.save("k", 1), false);
  } finally {
    if (desc) Object.defineProperty(globalThis, "localStorage", desc);
    else delete globalThis.localStorage;
  }
});
