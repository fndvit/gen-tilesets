/**
 * `<Tileset>` against `TilesetRenderer`, case by case, across widths and DPRs.
 *
 *   pnpm --filter @fndvit/tileset-demo dev               # port 5173
 *   node apps/demo/scripts/parity.mjs [http://localhost:5173/parity.html]
 *
 * Exits non-zero on any difference. Each width is reached by resizing a live
 * page, so the renderer's update path is exercised, not only its first render;
 * the sequence crosses the parity page's breakpoints (700, 800) both ways.
 */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5173/parity.html";
const WIDTHS = [1280, 777, 360, 1013, 701, 699, 1600];
const DPRS = [1, 2, 1.5];

const browser = await chromium.launch({ channel: "chrome" });
let failed = 0;
let blank = 0;
for (const dpr of DPRS) {
  const ctx = await browser.newContext({ deviceScaleFactor: dpr, viewport: { width: WIDTHS[0], height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelectorAll("[data-case]").length > 0);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    const diffs = await page.evaluate(() => window.parity());
    // A comparison of two empty canvases proves nothing.
    blank += await page.evaluate(
      () => [...document.querySelectorAll("canvas")].filter((c) => c.width === 0 || c.height === 0).length,
    );
    const label = `dpr ${dpr} width ${width}`;
    if (diffs.length === 0) console.log(`ok   ${label}`);
    else {
      failed++;
      console.log(`DIFF ${label}\n${diffs.join("\n")}`);
    }
  }
  if (errors.length > 0) {
    failed++;
    console.log(`page errors at dpr ${dpr}:\n  ${errors.join("\n  ")}`);
  }
  await ctx.close();
}
await browser.close();
console.log(blank === 0 ? "every canvas drew" : `${blank} canvases were empty`);
process.exit(failed > 0 || blank > 0 ? 1 : 0);
