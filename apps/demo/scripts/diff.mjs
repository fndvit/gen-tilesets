/**
 * usage: node diff.mjs <baselineDir> <candidateDir> [diffOutDir]
 *
 * Exact comparison -- `threshold: 0` -- because this project's defects are
 * one-pixel seams and a tolerance would pass exactly the failure it exists to
 * catch. Writes a diff image per changed capture; exits 1 if any differ.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const [a, b, out = `${b}-diff`] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
let failed = 0;
for (const name of readdirSync(a).filter((n) => n.endsWith(".png")).sort()) {
  const x = PNG.sync.read(readFileSync(`${a}/${name}`));
  let y;
  try {
    y = PNG.sync.read(readFileSync(`${b}/${name}`));
  } catch {
    console.log(`MISSING  ${name}`);
    failed++;
    continue;
  }
  if (x.width !== y.width || x.height !== y.height) {
    console.log(`SIZE     ${name}  ${x.width}x${x.height} -> ${y.width}x${y.height}`);
    failed++;
    continue;
  }
  const d = new PNG({ width: x.width, height: x.height });
  const n = pixelmatch(x.data, y.data, d.data, x.width, x.height, { threshold: 0 });
  if (n > 0) {
    writeFileSync(`${out}/${name}`, PNG.sync.write(d));
    failed++;
  }
  console.log(`${n === 0 ? "SAME    " : "DIFF    "} ${name}  ${n} px`);
}
process.exit(failed ? 1 : 0);
