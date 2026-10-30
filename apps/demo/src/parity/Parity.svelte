<!--
  **Renderer parity** — every case drawn twice, by the frozen pre-Block-5
  `<Tileset>` (`Reference.svelte`) and by today's `<Tileset>`, a wrapper over
  `TilesetRenderer`, and compared in the page: a canvas pixel for pixel, a DOM
  tileset node for node (every cell's position, style, mask flag and `src`, in
  document order). Each case runs under both substrates.

  `window.parity()` returns one line per case that differs, so a script can
  drive it across widths (`scripts/parity.mjs`). Not part of the build: Vite
  builds `index.html` only, so the screenshot gate never sees this page.
-->
<script lang="ts">
  import { loadTilesetFile, type TilesetFile } from "@fndvit/gen-tilesets";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import { prefixedProvider, type TilesetOptions } from "@fndvit/gen-tilesets/render";
  import Reference from "./Reference.svelte";

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
    cases = [
      ...cases,
      ...cases.map((c) => ({ ...c, name: `${c.name}-dom`, options: { ...c.options, substrate: "dom" as const } })),
      { name: "atlas-dom-overflow", file: atlas, options: { ...a, substrate: "dom", overflow: "visible" } },
    ];
  });

  /** Sides whose canvas has no opaque pixel yet: nothing has decoded. */
  let blank = 0;
  /** DOM `<img>`s still loading: their `error`, and the size probe after `load`, can unmount cells. */
  let loading = 0;

  function pixels(c: HTMLCanvasElement | null): string {
    if (c === null) return "no canvas";
    if (c.width === 0 || c.height === 0) return `${c.width}x${c.height}`;
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let h = 2166136261;
    let opaque = false;
    for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i]!, 16777619);
    for (let i = 3; i < d.length && !opaque; i += 4) opaque = d[i]! > 0;
    if (!opaque) blank++;
    return `${c.width}x${c.height}:${h >>> 0}`;
  }

  /**
   * A DOM tileset's whole output: every child of the box in document order, so
   * an out-of-order cell, a stray node or a misplaced extent is a difference.
   * `src` is the attribute, not the resolved URL, so both sides read alike.
   */
  function cellsOf(box: HTMLElement): string {
    return Array.from(box.children)
      .map((el) => {
        const e = el as HTMLElement;
        if (e.matches("[data-tileset-cell]")) {
          const img = e.querySelector("img");
          if (img !== null && !img.complete) loading++;
          return (
            `\n    cell ${e.dataset.x},${e.dataset.y} style="${e.style.cssText}"` +
            ` masked=${e.hasAttribute("data-masked")} img=${img?.getAttribute("src") ?? "-"}` +
            (img === null ? "" : ` alt="${img.alt}" loading=${img.loading} draggable=${img.getAttribute("draggable")}`)
          );
        }
        if (e.matches(".extent[data-tileset-extent]")) return `\n    extent style="${e.style.cssText}"`;
        return `\n    stray <${e.tagName.toLowerCase()} class="${e.className}">`;
      })
      .join("");
  }

  function signature(side: Element): string {
    const box = side.querySelector<HTMLElement>("[data-tileset-box]");
    if (box === null) return "no box";
    if (box.querySelector("canvas") === null) {
      const r = box.getBoundingClientRect();
      return [
        `box ${r.width}x${r.height} class="${box.className}" style="${box.style.cssText}" measured=${box.hasAttribute("data-measured")}`,
        `wrapped=${box.parentElement?.matches(".container[data-tileset-wrapper]") ?? false}`,
        cellsOf(box),
      ].join(" | ");
    }
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

  /**
   * Differences, after waiting up to `ms` for decodes to land on both sides.
   *
   * A DOM tileset matches the moment its cells mount, before any `<img>` has
   * failed or been probed, which is where the two renderers' failure handling
   * could part. So a match counts only once every `<img>` is complete and two
   * polls in a row saw the same thing — the second covers the size probe, which
   * runs a frame after `load`.
   */
  async function parity(ms = 4000): Promise<string[]> {
    const until = performance.now() + ms;
    let diffs: string[] = [];
    let last = "";
    let seen = "";
    do {
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)));
      last = seen;
      seen = "";
      diffs = [];
      blank = 0;
      loading = 0;
      for (const row of document.querySelectorAll("[data-case]")) {
        const [left, right] = row.querySelectorAll("[data-side]");
        const l = signature(left!);
        const r = signature(right!);
        seen += l + r;
        if (l !== r) diffs.push(`${row.getAttribute("data-case")}:\n  reference ${l}\n  wrapper   ${r}`);
      }
    // Two transparent canvases of one size hash alike, so a match before
    // anything decoded proves nothing: wait for pixels as well as agreement.
    } while ((diffs.length > 0 || blank > 0 || loading > 0 || seen !== last) && performance.now() < until);
    if (blank > 0) diffs.push(`${blank} canvases drew nothing`);
    if (loading > 0) diffs.push(`${loading} <img>s never finished loading`);
    return diffs;
  }

  /**
   * Reseeds every case on both sides, so the comparison after it runs through
   * `TilesetRenderer.update()` rather than its constructor.
   */
  let generation = $state(0);
  const reseed = (): void => void generation++;
  const optionsOf = (c: Case): TilesetOptions =>
    generation === 0 ? c.options : { ...c.options, seed: `parity-${generation}` };

  Object.assign(window, { parity, reseed });
</script>

{#each cases as c (c.name)}
  <section data-case={c.name}>
    <div class="pair">
      <div data-side="reference"><h2>{c.name}</h2><Reference file={c.file} options={optionsOf(c)} /></div>
      <div data-side="wrapper"><h2>{c.name}</h2><Tileset file={c.file} options={optionsOf(c)} /></div>
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
