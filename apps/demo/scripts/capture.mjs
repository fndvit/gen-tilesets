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
import { mkdirSync, writeFileSync } from "node:fs";

const out = process.argv[2];
const base = process.argv[3] ?? "http://localhost:4173/";
mkdirSync(out, { recursive: true });

// 777 and 1013 give fractional cell sizes; 360 is a phone; 1280 a desktop.
const WIDTHS = [360, 777, 1013, 1280];
const DPRS = [1, 2];
const SUBSTRATES = ["canvas", "dom"];
// Crosses the demo's responsive breakpoints in both directions.
const RESIZES = [777, 360, 1013, 1280];

/**
 * A full-page screenshot resizes the page to its full height while it captures,
 * which fires every tileset's ResizeObserver: the capture can land mid-repaint,
 * and whether it does depends on how long a repaint takes. Measured on this demo:
 * the settled picture was identical, while single captures differed by a few
 * hundred pixels from run to run. So capture until two consecutive shots agree.
 */
async function stableShot(page, path) {
  let prev = await page.screenshot({ fullPage: true, animations: "disabled" });
  for (let i = 0; i < 6; i++) {
    const next = await page.screenshot({ fullPage: true, animations: "disabled" });
    if (next.equals(prev)) break;
    prev = next;
  }
  writeFileSync(path, prev);
}

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
      await stableShot(page, `${out}/${name}`);
      console.log(name);
    }
  }
  // The reactive path: one page load, then resized in place. A fresh load at each
  // width (above) never exercises what a stale memo would get wrong; this does.
  for (const substrate of SUBSTRATES) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}?substrate=${substrate}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    for (const width of RESIZES) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(500);
      const name = `resize-${substrate}-w${width}-dpr${dpr}.png`;
      await stableShot(page, `${out}/${name}`);
      console.log(name);
    }
  }
  if (errors.length) console.error("page errors:", errors);
  await ctx.close();
}
await browser.close();
