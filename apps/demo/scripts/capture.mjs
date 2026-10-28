/**
 * Full-page captures of the built demo, across substrate x width x DPR.
 *
 *   pnpm --filter @fndvit/tileset-demo build
 *   pnpm --filter @fndvit/tileset-demo preview          # port 4173
 *   pnpm --filter @fndvit/tileset-demo shots:capture .shots/<name>
 *   pnpm --filter @fndvit/tileset-demo shots:diff .shots/<baseline> .shots/<name>
 *
 * This is the check a renderer change has to pass, because `.svelte` cannot be
 * unit-tested here and this project's defects are one-pixel seams that no
 * assertion on numbers catches. A baseline is regenerated from the commit you are
 * comparing against (check it out, build, capture), never committed: PNGs at two
 * DPRs are megabytes, and a stale baseline is worse than none.
 *
 * Drives the installed Google Chrome (`channel: "chrome"`), so it needs no
 * browser download -- and so a Chrome update between two captures can move
 * pixels. Capture both sides in one sitting.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const out = process.argv[2];
const base = process.argv[3] ?? "http://localhost:4173/";
mkdirSync(out, { recursive: true });

// 777 and 1013 give fractional cell sizes; 360 is a phone; 1280 a desktop.
const WIDTHS = [360, 777, 1013, 1280];
const DPRS = [1, 2];
const SUBSTRATES = ["canvas", "dom"];

const browser = await chromium.launch({ channel: "chrome" });
for (const dpr of DPRS) {
  const ctx = await browser.newContext({ deviceScaleFactor: dpr, viewport: { width: 1280, height: 900 } });
  // The demo draws its decoration loadSalt from Math.random() per load (R12, on
  // purpose). Pin it so two captures of unchanged code are byte-identical.
  await ctx.addInitScript(() => {
    let x = 0x9e3779b9;
    Math.random = () => {
      x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
      return x / 2 ** 32;
    };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const substrate of SUBSTRATES) {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}?substrate=${substrate}`, { waitUntil: "networkidle" });
      // Let measurement, decodes and the canvas paint settle.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(800);
      const name = `${substrate}-w${width}-dpr${dpr}.png`;
      await page.screenshot({ path: `${out}/${name}`, fullPage: true, animations: "disabled" });
      console.log(name);
    }
  }
  if (errors.length) console.error("page errors:", errors);
  await ctx.close();
}
await browser.close();
