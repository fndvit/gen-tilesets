/**
 * Shoots the README's images from `readme.html`, one element per image.
 *
 *   pnpm --filter @vit-foundation/tileset-demo dev                    # port 5173
 *   pnpm --filter @vit-foundation/tileset-demo shots:readme [outDir] [baseUrl]
 *
 * `outDir` defaults to `packages/tileset/docs/images`, so a run overwrites the
 * committed images. Drives the installed Chrome, as `capture.mjs` does.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const out = process.argv[2] ?? fileURLToPath(new URL("../../../packages/tileset/docs/images", import.meta.url));
const base = process.argv[3] ?? "http://localhost:5173/";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1400, height: 900 } });
page.on("console", (m) => m.type() === "error" && console.error(m.text()));
await page.goto(new URL("readme.html", base).href, { waitUntil: "networkidle" });
await page.waitForSelector("#decorations");
// Images decode and the avoid mask settles after layout; give both a moment.
await page.waitForTimeout(1000);
for (const id of ["avoid", "responsive", "decorations"]) {
  await page.locator(`#${id}`).screenshot({ path: `${out}/${id}.png`, animations: "disabled" });
  console.log(`${out}/${id}.png`);
}
await browser.close();
