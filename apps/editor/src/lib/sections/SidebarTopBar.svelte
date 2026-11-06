<!--
  The sidebar's top bar: the document's actions, on the same ground and at the
  same height as the preview's top bar, so the two columns start on one line
  (iteration 2). One hairline runs under both.

  Left, the edit history: Undo. Right, the document: New, Import and Export,
  Export being the area's one primary. They moved here from the footer, which
  now holds only the seed, so "what happens to the file" and "how it is drawn"
  are two places instead of one crowded block.

  Export is §11.1's: the file and its asset folder, **together** (**E14**). Not
  two buttons: a file exported without its folder reopens the hole the folder
  closes. The failure is reported rather than swallowed. `entries()` throws
  where an asset's bytes are missing or two assets claim one path, and shipping
  a folder that is quietly incomplete is `07` **R3**'s substitution problem
  moved into the artifact, where no `onAssetError` will ever fire for it.

  Reports never take space here. An export failure, or the advisory that the
  document draws nothing, appears in a `ui/Popup` after the download, like the
  import reports (Pol, 2026-11-04).

  The bar takes dropped zips and folders for Import, and outlines itself while
  one is over it.
-->
<script lang="ts">
  import { exportZip } from "../../download.js";
  import { drawsNothing } from "../../export.js";
  import { session } from "../../session.svelte.js";
  import ImportPanel from "../ImportPanel.svelte";
  import Button from "../ui/Button.svelte";
  import Popup from "../ui/Popup.svelte";

  interface Props {
    /** Starts a new tileset (App's `newTileset`: confirmed, not undoable). */
    onNew: () => void;
  }

  let { onNew }: Props = $props();

  const file = $derived(session.file);

  let root = $state<HTMLElement | null>(null);
  let over = $state(false);

  let exporting = $state(false);
  let exportError = $state<string | null>(null);
  /** §12.2's fifth advisory. **E16**: it never blocks the export. */
  let exportedEmpty = $state(false);
  let reporting = $state(false);

  async function runExport(): Promise<void> {
    exporting = true;
    exportError = null;
    exportedEmpty = drawsNothing(file);
    try {
      await exportZip(file);
    } catch (cause) {
      exportError = String(cause instanceof Error ? cause.message : cause);
    } finally {
      exporting = false;
      reporting = exportError !== null || exportedEmpty;
    }
  }
</script>

<div class="top-bar" class:over bind:this={root}>
  <!--
    **E6**: undo restores a previous `TilesetFile` in full, and no editor action
    is outside the stack. §9.4 makes it *the repair* for an orphaned Selection:
    nothing is migrated, because migration has to guess.
  -->
  <Button
    label="Undo"
    icon="undo"
    variant="tertiary"
    disabled={!session.canUndo}
    onclick={() => session.undo()}
  />
  <div class="file">
    <Button label="New" icon="new" variant="tertiary" onclick={onNew} />
    <!--
      **E14**'s inverse. It discards the current document, but it is undoable
      like everything else (**E6**), so it needs no confirmation.
    -->
    <ImportPanel target={root} bind:over />
    <Button
      label={exporting ? "Exporting…" : "Export"}
      icon="export"
      variant="primary"
      disabled={exporting}
      onclick={runExport}
    />
  </div>
</div>

<Popup
  title={exportError !== null ? "Export failed" : "Exported"}
  bind:open={reporting}
  onClose={() => {
    exportError = null;
    exportedEmpty = false;
  }}
>
  {#if exportError !== null}
    <p class="t-body">{exportError}</p>
  {/if}
  {#if exportedEmpty}
    <p class="t-body">
      This document is legal but draws nothing: no tiles, no operations, or every palette entry
      empty. The file was exported anyway.
    </p>
  {/if}
</Popup>

<style>
  .top-bar {
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2) var(--space-4);
    min-height: var(--preview-bar-h);
    padding: var(--space-3) var(--space-5) var(--space-3) var(--space-3);
    border-bottom: var(--rule-w) solid var(--color-bar-rule);
    outline: var(--focus-w) solid transparent;
    outline-offset: calc(-1 * var(--focus-w));
    transition: outline-color var(--dur-fast) var(--ease);
  }

  /* A zip or folder dragged over the bar. */
  .top-bar.over {
    outline-color: var(--color-accent);
  }

  .file {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
</style>
