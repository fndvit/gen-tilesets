/**
 * The server-render gate: a page rendered by `svelte/server` must reserve the
 * tileset's space before any script runs, and hydrating it must not move the
 * page (`placeholder.ts`, **S8**).
 *
 *   node apps/demo/scripts/ssr.mjs
 *
 * For each case it serves `<Tileset>` (or `<TileDecoration>`) rendered on the
 * server, with the client's hydration held back. It measures the placeholder
 * box, releases hydration, and measures the renderer's box. It also serves the
 * frozen pre-Block-5 component (`src/parity/Reference.svelte`) rendered on the
 * server, which drew its box there directly.
 *
 * Passing means: the placeholder reserves exactly the height the old
 * component's server HTML reserved, hydration leaves one measured box and no
 * placeholder, and the page logs no hydration warning. The settle after
 * hydration is printed, not judged: it is the renderer's measured geometry
 * replacing the declared ratio, which the old component did at hydration too —
 * under half a CSS px on canvas (`SUBPIXEL-GEOMETRY.md`), more under `"dom"`,
 * whose cells are quantised (`domBoxStyle`).
 *
 * Its own Vite server on 5180, in middleware mode, from the demo's config, so it
 * needs no running dev server and builds nothing.
 */
import { readFileSync } from "node:fs";
import { createServer as createHttp } from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const css = readFileSync(new URL("../../../packages/tileset/src/render/tileset.css", import.meta.url), "utf8");
const PORT = 5180;
const WIDTHS = [600, 333];
const DPRS = [1, 2];

/** Options as source text, so the server and the client build the same object. */
const CASES = {
  canvas: `{ provider: prefixedProvider("/atlas") }`,
  "canvas-fixed": `{ provider: prefixedProvider("/atlas"), sizing: "fixed", align: { x: "left", y: "bottom" } }`,
  "canvas-rules": `{ provider: prefixedProvider("/atlas"), responsive: [{ maxWidth: 500, sizing: "fixed", cellSize: 40 }] }`,
  dom: `{ provider: prefixedProvider("/atlas"), substrate: "dom" }`,
  "dom-fixed": `{ provider: prefixedProvider("/atlas"), substrate: "dom", sizing: "fixed" }`,
  "dom-rules": `{ provider: prefixedProvider("/kelp"), substrate: "dom", responsive: [{ maxWidth: 500, columns: 9, rows: 6 }] }`,
  decoration: `{ provider: prefixedProvider("/kelp"), seed: "ssr" }`,
};

const vite = await createServer({
  root,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
});

const { render } = await vite.ssrLoadModule("svelte/server");
const { loadTilesetFile, reshape } = await vite.ssrLoadModule("@fndvit/gen-tilesets");
const { prefixedProvider } = await vite.ssrLoadModule("@fndvit/gen-tilesets/render");
const Tileset = (await vite.ssrLoadModule("@fndvit/gen-tilesets/Tileset.svelte")).default;
const TileDecoration = (await vite.ssrLoadModule("@fndvit/gen-tilesets/TileDecoration.svelte")).default;
const Reference = (await vite.ssrLoadModule("/src/parity/Reference.svelte")).default;
const files = Object.fromEntries(
  ["atlas", "kelp"].map((n) => [
    n,
    loadTilesetFile(JSON.parse(readFileSync(new URL(`../public/${n}/tileset.json`, import.meta.url), "utf8")), `${n}.zip`),
  ]),
);
const fileOf = (name) => (CASES[name].includes("/kelp") ? "kelp" : "atlas");

/** The old component's server HTML for a case, with no script: its reserved box. */
function reference(name, width) {
  const options = new Function("prefixedProvider", `return (${CASES[name]});`)(prefixedProvider);
  // A decoration was `<Tileset>` over this file in a box of this width.
  const decoration = name === "decoration";
  const file = decoration
    ? reshape(files.kelp, { rows: 2, columns: 3, cellSize: 48, bleed: 0, yOffset: 0 })
    : files[fileOf(name)];
  const out = render(Reference, { props: { file, options } });
  const w = decoration ? Math.min(width, 3 * 48) : width;
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}${css}</style>${out.head}</head>
<body><div id="app" style="width:${w}px">${out.body}</div></body></html>`;
}

async function page(name, width) {
  const options = new Function("prefixedProvider", `return (${CASES[name]});`)(prefixedProvider);
  const decoration = name === "decoration";
  const file = files[fileOf(name)];
  const props = decoration ? { style: file, rows: 2, columns: 3, cellSize: 48, options } : { file, options };
  const out = render(decoration ? TileDecoration : Tileset, { props });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}${css}</style>${out.head}</head>
<body><div id="app" style="width:${width}px">${out.body}</div>
<script type="module">
  import { hydrate } from "svelte";
  import { loadTilesetFile } from "@fndvit/gen-tilesets";
  import { prefixedProvider } from "@fndvit/gen-tilesets/render";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import TileDecoration from "@fndvit/gen-tilesets/TileDecoration.svelte";
  const file = loadTilesetFile(await (await fetch("/${fileOf(name)}/tileset.json")).json(), "${fileOf(name)}.zip");
  const options = ${CASES[name]};
  const props = ${decoration} ? { style: file, rows: 2, columns: 3, cellSize: 48, options } : { file, options };
  await new Promise((r) => (window.__go = r));
  hydrate(${decoration} ? TileDecoration : Tileset, { target: document.getElementById("app"), props });
  window.__hydrated = true;
</script></body></html>`;
  return vite.transformIndexHtml(`/ssr/${name}`, html);
}

const http = createHttp(async (req, res) => {
  const m = /^\/(ssr|ref)\/([\w-]+)\?w=(\d+)$/.exec(req.url ?? "");
  if (m === null) return vite.middlewares(req, res);
  res.setHeader("content-type", "text/html");
  res.end(m[1] === "ref" ? reference(m[2], Number(m[3])) : await page(m[2], Number(m[3])));
});
await new Promise((r) => http.listen(PORT, r));

const browser = await chromium.launch({ channel: "chrome" });
let failed = 0;
for (const dpr of DPRS) {
  const ctx = await browser.newContext({ deviceScaleFactor: dpr, viewport: { width: 800, height: 900 } });
  for (const name of Object.keys(CASES)) {
    for (const width of WIDTHS) {
      const r = await ctx.newPage();
      await r.goto(`http://localhost:${PORT}/ref/${name}?w=${width}`);
      const old = await r.evaluate(() => document.querySelector("[data-tileset-box]").getBoundingClientRect().height);
      await r.close();

      const p = await ctx.newPage();
      const logs = [];
      // The renderer's own development warnings (`[gen-tilesets] …`, soft
      // assets) are not this gate's business; anything else is.
      p.on("console", (msg) => {
        if ((msg.type() === "warning" || msg.type() === "error") && !msg.text().startsWith("[gen-tilesets]")) {
          logs.push(msg.text());
        }
      });
      p.on("pageerror", (e) => logs.push(String(e)));
      await p.goto(`http://localhost:${PORT}/ssr/${name}?w=${width}`);
      await p.waitForFunction(() => typeof window.__go === "function");
      const before = await p.evaluate(() => {
        const box = document.querySelector("[data-tileset-box]");
        return box === null
          ? null
          : { h: box.getBoundingClientRect().height, placeholder: box.hasAttribute("data-tileset-placeholder") };
      });
      await p.evaluate(() => window.__go());
      await p.waitForFunction(() => window.__hydrated === true);
      await p.waitForTimeout(150);
      const after = await p.evaluate(() => {
        const boxes = document.querySelectorAll("[data-tileset-box]");
        const box = boxes[0];
        return {
          count: boxes.length,
          placeholders: document.querySelectorAll("[data-tileset-placeholder]").length,
          h: box?.getBoundingClientRect().height ?? -1,
          measured: box?.hasAttribute("data-measured") ?? false,
        };
      });
      const problems = [];
      if (before === null || !before.placeholder) problems.push("no placeholder box in the server HTML");
      else if (before.h <= 0) problems.push("the placeholder reserves no height");
      if (after.count !== 1 || after.placeholders !== 0) problems.push(`${after.count} boxes and ${after.placeholders} placeholders after hydration`);
      if (!after.measured) problems.push("the renderer's box was never measured");
      if (before !== null && Math.abs(before.h - old) > 0.01) {
        problems.push(`reserves ${before.h}px where the old component's server HTML reserved ${old}px`);
      }
      problems.push(...logs);
      const label = `dpr ${dpr} ${name} @${width}: reserved ${before?.h.toFixed(2)} (old ${old.toFixed(2)}), settled ${after.h.toFixed(2)}`;
      if (problems.length === 0) console.log(`ok   ${label}`);
      else {
        failed++;
        console.log(`FAIL ${label}\n  ${problems.join("\n  ")}`);
      }
      await p.close();
    }
  }
  await ctx.close();
}
await browser.close();
http.close();
await vite.close();
process.exit(failed === 0 ? 0 : 1);
