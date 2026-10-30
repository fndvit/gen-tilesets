<!--
  `TilesetRenderer` behind the same props as `<Tileset>`, so the parity page can
  set the two side by side. Block 5 makes `<Tileset>` itself this shape.
-->
<script lang="ts">
  import { untrack } from "svelte";
  import type { TilesetFile } from "@fndvit/gen-tilesets";
  import type { TilesetOptions } from "@fndvit/gen-tilesets/render";
  import { TilesetRenderer } from "../../../../packages/tileset/src/render/renderer.js";

  let { file, options }: { file: TilesetFile; options: TilesetOptions } = $props();
  let host: HTMLDivElement;
  let renderer: TilesetRenderer | null = null;

  // Built once per mount, untracked: read here, `file` and `options` would make
  // this effect rebuild the renderer on every prop change, and `update()` below
  // — the path the parity check most needs to see — would never run.
  $effect(() => {
    const r = untrack(() => new TilesetRenderer(host, { file, options }));
    renderer = r;
    return () => r.destroy();
  });
  $effect(() => {
    renderer?.update({ file, options });
  });
</script>

<!-- Marked as the package's own wrapper, so `options.avoid` resolves in the
     page's element around it, as it does for `<Tileset>` (`measure.ts` `scopeOf`). -->
<div bind:this={host} data-tileset-wrapper=""></div>
