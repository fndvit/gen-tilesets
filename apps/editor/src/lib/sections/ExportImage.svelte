<!--
  Export image: a Form popup with a few choices before the PNG is written
  (`DESIGN_SYSTEM.md` *Form popup*, *Export image*, *Export*). Opened from
  Export's menu, Image (.png)….

  Size (a Radio list: Design width, then each breakpoint bound), Background
  (Preview colour / Transparent) and Density (1× / 2×, 2× by default), the
  draft advisory, the File line, then Cancel and Download PNG.

  **It draws the saved file, never the draft** (Pol, X0), with the file's
  `defaultSeed` and the load on screen (`preview.loadSalt`), through the same
  provider as the preview. The drawing is the package's `renderImage`, an
  offscreen render at the chosen width and density, so the same choices give
  the same PNG on any screen. The choices are `image-export.ts`'s, tested.

  The size used last is remembered for the session, in module state rather
  than the component's, and falls back to Design width once its bound is gone.
  Background and density simply stay as they were left: the form is mounted
  for as long as the top bar is.

  A failure closes the form and is the top bar's "Export failed" Popup
  (`onFailed`), as the zip's is. Nothing is written on a failure.
-->
<script lang="ts" module>
  import type { SizeKey } from "../../image-export.js";

  let lastSize: SizeKey | null = null;
</script>

<script lang="ts">
  import { renderImage } from "@vit-foundation/gen-tilesets/render";
  import { editorProvider } from "../../assets.js";
  import { saveBlob } from "../../download.js";
  import { fileName, pixelSize, rememberedSize, sizeRows } from "../../image-export.js";
  import { session } from "../../session.svelte.js";
  import { preview } from "../preview/view.svelte.js";
  import Advisory from "../ui/Advisory.svelte";
  import Button from "../ui/Button.svelte";
  import Popup from "../ui/Popup.svelte";
  import RadioList from "../ui/RadioList.svelte";
  import Toggle from "../ui/Toggle.svelte";

  interface Props {
    open?: boolean;
    /** Whether the preview is drawing a draft, which the image leaves out. */
    draft: boolean;
    /** A failed render's message, for the top bar's "Export failed". */
    onFailed: (message: string) => void;
  }

  let { open = $bindable(false), draft, onFailed }: Props = $props();

  const file = $derived(session.file);
  const rows = $derived(sizeRows(file.responsive ?? [], file.layout.referenceWidth));

  /**
   * The row chosen since the form opened, if any. The shown size is derived
   * from it, so opening needs no effect to reset the choice: `closed()` clears
   * it, and the remembered size shows again.
   */
  let picked = $state<SizeKey | null>(null);
  const size = $derived(rememberedSize(rows, picked ?? lastSize));
  const width = $derived(rows.find((r) => r.key === size)?.width ?? file.layout.referenceWidth);

  let background = $state<"preview" | "transparent">("preview");
  let density = $state<1 | 2>(2);
  let busy = $state(false);

  /** Only while open: `imageSize` builds a model, and the file changes on every edit. */
  const pixels = $derived(open ? pixelSize(file, width, density) : null);
  const name = $derived(fileName(width, density));

  let body = $state<HTMLElement | undefined>(undefined);

  async function download(close: () => void): Promise<void> {
    // Read once: the radios stay live while the PNG is drawn.
    const [source, key, w, d, n] = [file, size, width, density, name];
    busy = true;
    try {
      const blob = await renderImage(source, {
        width: w,
        density: d,
        background: background === "preview" ? preview.background : undefined,
        loadSalt: preview.loadSalt,
        provider: editorProvider,
      });
      saveBlob(blob, n);
      lastSize = key;
      close();
    } catch (cause) {
      close();
      onFailed(String(cause instanceof Error ? cause.message : cause));
    } finally {
      busy = false;
    }
  }

  function closed(): void {
    picked = null;
  }
</script>

<Popup
  title="Export image"
  bind:open
  closable
  onClose={closed}
  initialFocus={() => body?.querySelector<HTMLElement>("input[type=radio]:checked")}
>
  <div class="form" bind:this={body}>
    <RadioList
      legend="Size"
      name="export-image-size"
      options={rows}
      bind:value={() => size, (key) => (picked = key)}
    />

    <div class="pair">
      <div class="field">
        <span class="t-label">Background</span>
        <Toggle
          label="Background"
          options={[
            { value: "preview", label: "Preview colour", swatch: preview.background },
            { value: "transparent", label: "Transparent" },
          ]}
          value={background}
          onChange={(v) => (background = v)}
        />
      </div>
      <div class="field">
        <span class="t-label">Density</span>
        <Toggle
          label="Density"
          options={[
            { value: 1, label: "1×" },
            { value: 2, label: "2×" },
          ]}
          value={density}
          onChange={(v) => (density = v)}
        />
      </div>
    </div>

    <Advisory when={draft}>Draft not included: this is the saved tileset</Advisory>

    <p class="file">
      <span class="t-label">File</span>
      <span class="t-console">{name}{pixels ? ` · ${pixels.width} × ${pixels.height} px` : ""}</span>
    </p>
  </div>

  {#snippet actions(close)}
    <Button label="Cancel" onclick={close} />
    <Button
      label={busy ? "Exporting…" : "Download PNG"}
      variant="primary"
      disabled={busy}
      onclick={() => download(close)}
    />
  {/snippet}
</Popup>

<style>
  .form {
    display: grid;
    gap: var(--space-6);
  }

  /*
    Background holds two words and a swatch, Density two characters, so they
    share the row 3:2 rather than evenly (an even split cut "Preview colour"
    off at the popup's 480px). They wrap to one column on a narrow screen.
  */
  .pair {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  .field {
    display: grid;
    flex: 2 1 120px;
    gap: var(--space-3);
    min-width: 0;
  }

  .field:first-child {
    flex: 3 1 260px;
  }

  .file {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-4);
    margin: 0;
  }
</style>
