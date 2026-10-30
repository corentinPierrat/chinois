import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRIES = ["index.html", "styles.css", "manifest.webmanifest", "js", "data", "vendor", "icons"];
const SKIP = new Set(["data/UNCERTAIN.md"]);

export function buildPrecache(root) {
  const walk = (rel) => {
    const abs = join(root, rel);
    if (statSync(abs).isDirectory()) {
      return readdirSync(abs).sort().flatMap((n) => walk(`${rel}/${n}`));
    }
    return SKIP.has(rel) || rel.endsWith(".DS_Store") ? [] : [rel];
  };
  const files = ENTRIES.flatMap(walk).sort();
  const hash = createHash("sha256");
  // sw.js is hashed (so SW changes bump the cache) but not precached.
  for (const f of [...files, "sw.js"]) hash.update(f).update("\0").update(readFileSync(join(root, f))).update("\0");
  return { version: hash.digest("hex").slice(0, 12), files };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const out = buildPrecache(root);
  writeFileSync(join(root, "precache.json"), JSON.stringify(out, null, 2) + "\n");
  console.log(`precache.json: ${out.files.length} files, version ${out.version}`);
}
