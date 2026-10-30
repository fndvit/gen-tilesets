/**
 * The frozen pre-Block-5 `<Tileset>` against today's, case by case, across widths and DPRs.
 *
 *   pnpm --filter @fndvit/tileset-demo dev               # port 5173
 *   node apps/demo/scripts/parity.mjs [http://localhost:5173/parity.html]
 *
 * Exits non-zero on any difference, or on a canvas that drew nothing. Each
 * width is reached by resizing a live page, so the renderer's update path is
 * exercised, not only its first render.
 *
 * The rules match the *box*, which on this two-column page is about
 * `(viewport - 24) / 2`, so the viewports are chosen for their box widths: the
 * sweep crosses both breakpoints (700, 800) in both directions, 10px either side.
 */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5173/parity.html";
const boxes = [628, 376, 168, 494, 810, 790, 710, 690, 810, 628];
const WIDTHS = boxes.map((b) => 2 * b + 24);
const DPRS = [1, 2, 1.5];

const browser = await chromium.launch({ channel: "chrome" });
let failed = 0;
for (const dpr of DPRS) {
  const ctx = await browser.newContext({ deviceScaleFactor: dpr, viewport: { width: WIDTHS[0], height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelectorAll("[data-case]").length > 0);
  for (const width of WIDTHS) {
    // As tall as the page, so every DOM case's `loading="lazy"` <img>s load and
    // `parity()` can wait for them; height changes no box width.
    await page.setViewportSize({ width, height: 900 });
    const tall = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width, height: tall });
    const diffs = await page.evaluate(() => window.parity());
    // The box widths the sweep is meant to produce, so a layout change that
    // moves them off the breakpoints is seen rather than silently tested less.
    const box = await page.evaluate(() => document.querySelector("[data-side] [data-tileset-box]").getBoundingClientRect().width);
    const label = `dpr ${dpr} width ${width} (box ${Math.round(box)})`;
    if (diffs.length === 0) console.log(`ok   ${label}`);
    else {
      failed++;
      console.log(`DIFF ${label}\n${diffs.join("\n")}`);
    }
  }
  // Then through `update()`: every case reseeded in place, at the last width.
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => window.reseed());
    const diffs = await page.evaluate(() => window.parity());
    const label = `dpr ${dpr} reseed ${i + 1}`;
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
process.exit(failed > 0 ? 1 : 0);
