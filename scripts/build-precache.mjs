import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const entries = ["index.html", "styles.css", "manifest.webmanifest", "js", "data", "vendor", "icons"];
const SKIP = new Set(["data/UNCERTAIN.md"]);

function walk(rel) {
  const abs = join(root, rel);
  if (statSync(abs).isDirectory()) {
    return readdirSync(abs).sort().flatMap((n) => walk(`${rel}/${n}`));
  }
  return SKIP.has(rel) || rel.endsWith(".DS_Store") ? [] : [rel];
}

const files = entries.flatMap(walk).sort();
const hash = createHash("sha256");
for (const f of files) hash.update(f).update("\0").update(readFileSync(join(root, f))).update("\0");
const version = hash.digest("hex").slice(0, 12);
writeFileSync(join(root, "precache.json"), JSON.stringify({ version, files }, null, 2) + "\n");
console.log(`precache.json: ${files.length} files, version ${version}`);
