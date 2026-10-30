<!--
  `<TileDecoration>` — `TileDecorationRenderer` (`./decoration.ts`) as a Svelte
  component. The decoration's reasoning — one style at many sizes, the preset,
  the box's width — lives there; this mounts it, hands it every prop change and
  destroys it on teardown, as `<Tileset>` does its renderer.
-->
<script lang="ts">
  import { untrack } from "svelte";
  import "./tileset.css";
  import type { TilesetFile } from "../types.js";
  import { decorationWidth, reshapeDecoration, TileDecorationRenderer } from "./decoration.js";
  import { WRAPPER_ATTRIBUTE } from "./measure.js";
  import { copyOptions, type TilesetOptions } from "./options.js";
  import Placeholder from "./Placeholder.svelte";
  import { placeholder } from "./placeholder.js";

  interface Props {
    /**
     * The decoration style — `TileDecorationInputs.style`: a valid file using
     * only procedural Selections, shared by every decoration on the page.
     */
    style: TilesetFile;
    rows: number;
    columns: number;
    /** CSS px per tile, and so the width — `decorationWidth` says why. */
    cellSize: number;
    /**
     * `<Tileset>`'s options, passed straight through. **`options.seed` is what
     * makes two decorations of the same size differ** — `TileDecorationInputs`.
     */
    options?: TilesetOptions | undefined;
  }

  // No `box` prop, unlike `<Tileset>`. That exists so an editor can convert a
  // pointer event into render space (`07` §8.2); a decoration is `aria-hidden`
  // ornament that nothing points at. A host that needs the element can wrap this.
  let { style, rows, columns, cellSize, options }: Props = $props();

  const id = $props.id();

  let host: HTMLDivElement;
  let renderer: TileDecorationRenderer | null = null;
  let mounted = $state(false);
  /** The first update after mounting repeats the constructor's inputs; skipped. */
  let fresh = false;

  // `<Tileset>`'s two effects, for the same reasons: built once per mount,
  // untracked; then one `update()` per prop change, reading `options` through
  // `copyOptions` so an edit made in place is seen. The renderer keeps the
  // reshaped file until the style or the shape changes, so an options-only
  // update does not regenerate the grid.
  $effect(() => {
    const r = untrack(() => new TileDecorationRenderer(host, { id, style, rows, columns, cellSize, options }));
    renderer = r;
    fresh = true;
    mounted = true;
    return () => {
      r.destroy();
      renderer = null;
    };
  });

  $effect(() => {
    const next = { style, rows, columns, cellSize, options: copyOptions(options) };
    if (fresh) {
      fresh = false;
      return;
    }
    untrack(() => renderer?.update(next));
  });

  /** The server's reserved space — `<Tileset>` says why. Throws a reshape error in development, as the renderer does. */
  const reserved = $derived(
    mounted ? null : placeholder(id, reshapeDecoration(style, rows, columns, cellSize), options),
  );
</script>

<!-- The host is `<Tileset>`'s: no box of its own, and marked as the package's. -->
<div bind:this={host} data-tileset-host="" data-tileset-wrapper="" style="display: contents">
  {#if reserved !== null}
    <div
      class="decoration"
      style={decorationWidth(columns, cellSize)}
      data-tileset-decoration=""
      {...{ [WRAPPER_ATTRIBUTE]: "" }}
    >
      <Placeholder p={reserved} />
    </div>
  {/if}
</div>
