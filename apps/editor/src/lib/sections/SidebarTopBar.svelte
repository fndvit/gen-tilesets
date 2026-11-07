<!--
  The sidebar's top bar: the document's actions, on the same ground and at the
  same height as the preview's top bar, so the two columns start on one line
  (iteration 2). One hairline runs under both.

  Left, the document: New, Import and Export, Export being the area's one
  primary. Right, the edit history: Undo. The document's actions come first
  (Pol, X1), and Export's menu then opens left-aligned under it, inside the
  sidebar. They moved here from the footer, which now holds only the seed, so
  "what happens to the file" and "how it is drawn" are two places instead of
  one crowded block.

  Export is a Split button. Its main part is §11.1's export: the file and its
  asset folder, **together** (**E14**), in one click. Not two buttons: a file
  exported without its folder reopens the hole the folder closes. Its menu
  repeats that as Tileset (.zip) and adds Image (.png)…, which opens
  `ExportImage`; JSON on its own is never offered. A PNG is a picture of the
  tileset, not the tileset, so it does not reopen that hole.

  A failure is reported rather than swallowed. `entries()` throws where an
  asset's bytes are missing or two assets claim one path, and shipping a folder
  that is quietly incomplete is `07` **R3**'s substitution problem moved into
  the artifact, where no `onAssetError` will ever fire for it. `renderImage`
  rejects naming every picture that failed, for the same reason: an image with
  holes looks like a finished export.

  Reports never take space here. An export failure, zip or image, appears in
  one "Export failed" `ui/Popup` after the attempt, like the import reports
  (Pol, 2026-11-04). The advisory
  that the document draws nothing is a notice in the preview's stack (Stage 2,
  W3): the export happened, so there is nothing to answer.

  The bar takes dropped zips and folders for Import, and outlines itself while
  one is over it.
-->
<script lang="ts">
  import { exportZip } from "../../download.js";
  import { exportedEmpty } from "../../advisories.js";
  import { drawsNothing } from "../../export.js";
  import { notices } from "../../notices.svelte.js";
  import { session } from "../../session.svelte.js";
  import ImportPanel from "../ImportPanel.svelte";
  import Button from "../ui/Button.svelte";
  import Popup from "../ui/Popup.svelte";
  import SplitButton from "../ui/SplitButton.svelte";
  import ExportImage from "./ExportImage.svelte";

  interface Props {
    /** Starts a new tileset (App's `newTileset`: confirmed, not undoable). */
    onNew: () => void;
    /** Whether the preview draws a draft: Export image says it is left out. */
    draft: boolean;
  }

  let { onNew, draft }: Props = $props();

  let imaging = $state(false);

  const file = $derived(session.file);

  let root = $state<HTMLElement | null>(null);
  let over = $state(false);

  let exporting = $state(false);
  let exportError = $state<string | null>(null);
  let reporting = $state(false);

  async function runExport(): Promise<void> {
    exporting = true;
    exportError = null;
    const empty = drawsNothing(file);
    try {
      await exportZip(file);
      // §12.2's fifth advisory. **E16**: it never blocks the export.
      if (empty) notices.push(exportedEmpty);
    } catch (cause) {
      exportError = String(cause instanceof Error ? cause.message : cause);
    } finally {
      exporting = false;
      reporting = exportError !== null;
    }
  }

  function imageFailed(message: string): void {
    exportError = message;
    reporting = true;
  }
</script>

<div class="top-bar" class:over bind:this={root}>
  <div class="file">
    <Button label="New" icon="new" variant="tertiary" onclick={onNew} />
    <!--
      **E14**'s inverse. It discards the current document, but it is undoable
      like everything else (**E6**), so it needs no confirmation.
    -->
    <ImportPanel target={root} bind:over />
    <SplitButton
      label={exporting ? "Exporting…" : "Export"}
      icon="export"
      disabled={exporting}
      onclick={runExport}
      menuLabel="More export options"
      items={[
        { label: "Tileset (.zip)", icon: "archive", onSelect: runExport },
        { label: "Image (.png)…", icon: "image", onSelect: () => (imaging = true) },
      ]}
    />
  </div>
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
</div>

<ExportImage bind:open={imaging} {draft} onFailed={imageFailed} />

<Popup title="Export failed" bind:open={reporting} onClose={() => (exportError = null)}>
  <p class="t-body">{exportError}</p>
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
