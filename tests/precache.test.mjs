import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrecache } from "../scripts/build-precache.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("precache.json is up to date", () => {
  const committed = JSON.parse(readFileSync(join(root, "precache.json"), "utf8"));
  assert.deepEqual(committed, buildPrecache(root), "precache.json is stale: run npm run precache");
});
