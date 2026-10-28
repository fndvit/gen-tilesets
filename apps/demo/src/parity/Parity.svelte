<!--
  **Renderer parity** — every case drawn twice, by `<Tileset>` and by
  `TilesetRenderer`, and compared pixel for pixel in the page. Canvas only: that
  is all `TilesetRenderer` draws until Block 4.

  `window.parity()` returns one line per case that differs, so a script can
  drive it across widths (`scripts/parity.mjs`). Not part of the build: Vite
  builds `index.html` only, so the screenshot gate never sees this page.
-->
<script lang="ts">
  import { loadTilesetFile, type TilesetFile } from "@fndvit/gen-tilesets";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import { prefixedProvider, type TilesetOptions } from "@fndvit/gen-tilesets/render";
  import Mount from "./Mount.svelte";

  interface Case {
    name: string;
    file: TilesetFile;
    options: TilesetOptions;
  }

  let cases = $state<Case[]>([]);

  const load = (root: string, name: string) =>
    fetch(`${root}/tileset.json`)
      .then((r) => r.json() as Promise<unknown>)
      .then((raw) => loadTilesetFile(raw, name));

  void Promise.all([load("/atlas", "atlas.zip"), load("/kelp", "kelp.zip")]).then(([atlas, kelp]) => {
    const a = { provider: prefixedProvider("/atlas"), loadSalt: 0 };
    const k = { provider: prefixedProvider("/kelp"), loadSalt: 0 };
    cases = [
      { name: "atlas", file: atlas, options: { ...a } },
      { name: "atlas-seed", file: atlas, options: { ...a, seed: "parity" } },
      { name: "atlas-fixed", file: atlas, options: { ...a, sizing: "fixed", align: { x: "left", y: "bottom" } } },
      {
        name: "atlas-rules",
        file: atlas,
        options: { ...a, responsive: [{ maxWidth: 700, sizing: "fixed", cellSize: 40, align: { x: "left" } }] },
      },
      { name: "kelp-columns", file: kelp, options: { ...k, responsive: [{ maxWidth: 800, columns: 9, rows: 6 }] } },
      { name: "atlas-avoid", file: atlas, options: { ...a, avoid: { targets: "h2", padding: 8 } } },
      { name: "kelp", file: kelp, options: { ...k, seed: "parity" } },
    ];
  });

  function pixels(c: HTMLCanvasElement | null): string {
    if (c === null) return "no canvas";
    if (c.width === 0 || c.height === 0) return `${c.width}x${c.height}`;
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let h = 2166136261;
    for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i]!, 16777619);
    return `${c.width}x${c.height}:${h >>> 0}`;
  }

  function signature(side: Element): string {
    const box = side.querySelector<HTMLElement>("[data-tileset-box]");
    if (box === null) return "no box";
    const canvas = box.querySelector("canvas");
    const r = box.getBoundingClientRect();
    return [
      // `style.cssText`, not the attribute: Svelte writes styles through the
      // CSSOM, which stores the attribute re-serialised (`534.06px` for
      // `534.0599999999998px`). The value is the same; the text is not.
      `box ${r.width}x${r.height} style="${box.style.cssText}" measured=${box.hasAttribute("data-measured")}`,
      `canvas style="${canvas?.style.cssText ?? ""}"`,
      `wrapped=${box.parentElement?.matches(".container[data-tileset-wrapper]") ?? false}`,
      pixels(canvas),
    ].join(" | ");
  }

  /** Differences, after waiting up to `ms` for decodes to land on both sides. */
  async function parity(ms = 4000): Promise<string[]> {
    const until = performance.now() + ms;
    let diffs: string[] = [];
    do {
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)));
      diffs = [];
      for (const row of document.querySelectorAll("[data-case]")) {
        const [left, right] = row.querySelectorAll("[data-side]");
        const l = signature(left!);
        const r = signature(right!);
        if (l !== r) diffs.push(`${row.getAttribute("data-case")}:\n  svelte   ${l}\n  renderer ${r}`);
      }
    } while (diffs.length > 0 && performance.now() < until);
    return diffs;
  }

  (window as unknown as { parity: typeof parity }).parity = parity;
</script>

{#each cases as c (c.name)}
  <section data-case={c.name}>
    <div class="pair">
      <div data-side="svelte"><h2>{c.name}</h2><Tileset file={c.file} options={c.options} /></div>
      <div data-side="renderer"><h2>{c.name}</h2><Mount file={c.file} options={c.options} /></div>
    </div>
  </section>
{/each}

<style>
  :global(body) {
    margin: 0;
    font: 14px system-ui;
    scrollbar-gutter: stable;
  }
  section {
    padding: 8px;
  }
  [data-side] {
    position: relative;
  }
  h2 {
    position: absolute;
    top: 0;
    left: 16px;
    margin: 0;
    width: 30%;
    z-index: 1;
  }
  .pair {
    display: grid;
    /* `minmax(0, …)`: a plain `1fr` track grows to the canvas's inline width,
       which is wider than the box by the bleed, which widens the box. */
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;
  }
</style>
