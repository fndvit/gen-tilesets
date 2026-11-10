<!--
  The sidebar's top bar: the document's actions, on the same ground and at the
  same height as the preview's top bar, so the two columns start on one line
  (iteration 2). One hairline runs under both.

  Left, the document: New, Import and Export, Export being the area's one
  primary. Right, the edit history, Undo, then "?" (Show the tour, B-017 O3c),
  which is not a document action either. The document's actions come first
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
  **After a zip export, "Your tileset is downloading"** (batch 03, T-08,
  B-030): a `Popup` saying in general terms how the file gets onto a website,
  with the install command to copy and a link to the getting-started guide. A
  `Popup`, not a `Dialog`: it informs and asks nothing. Only the zip opens it;
  an image is a picture, not something to install. It shows on every export
  until "Don't show again" (Pol, D-06 B), whose flag and copy are
  `export-next.ts`'s. Focus goes back to Export when it closes, by hand: the
  button is disabled while the zip is written, which drops focus to the body,
  so the dialog's own return would land nowhere.
-->
<script lang="ts">
  import { exportZip } from "../../download.js";
  import { COPY_LABELS, GETTING_STARTED_URL, INSTALL_COMMAND, copyText, hideStore, type CopyState } from "../../export-next.js";
  import { exportedEmpty } from "../../advisories.js";
  import { drawsNothing } from "../../export.js";
  import { notices } from "../../notices.svelte.js";
  import { session } from "../../session.svelte.js";
  import ImportPanel from "../ImportPanel.svelte";
  import Button from "../ui/Button.svelte";
  import IconButton from "../ui/IconButton.svelte";
  import Popup from "../ui/Popup.svelte";
  import SplitButton from "../ui/SplitButton.svelte";
  import ExportImage from "./ExportImage.svelte";

  interface Props {
    /** Starts a new tileset (App's `newTileset`: confirmed, not undoable). */
    onNew: () => void;
    /** Whether the preview draws a draft: Export image says it is left out. */
    draft: boolean;
    /** Starts a replay of the tour; `trigger` is "?", where focus returns when it ends. */
    onTour: (trigger: HTMLElement) => void;
  }

  let { onNew, draft, onTour }: Props = $props();

  let help = $state<HTMLButtonElement | undefined>(undefined);

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
      if (!nextHidden.get()) {
        copied = "idle";
        telling = true;
      }
    } catch (cause) {
      exportError = String(cause instanceof Error ? cause.message : cause);
    } finally {
      exporting = false;
      reporting = exportError !== null;
    }
  }

  /** "Your tileset is downloading" (T-08). */
  const nextHidden = hideStore();
  let telling = $state(false);
  let copied = $state<CopyState>("idle");
  let exportPart = $state<HTMLElement | null>(null);

  async function copyCommand(): Promise<void> {
    copied = await copyText(INSTALL_COMMAND);
  }

  /** Export's main part: the first button in its split. */
  function refocusExport(): void {
    exportPart?.querySelector("button")?.focus();
  }

  function imageFailed(message: string): void {
    exportError = message;
    reporting = true;
  }
</script>

<div class="top-bar" class:over bind:this={root}>
  <div class="file">
    <Button label="New" icon="new" variant="tertiary" onclick={onNew} tour="new" />
    <!--
      **E14**'s inverse. It discards the current document and cannot be
      undone (`session.open`), so it asks first unless the tileset is blank.
    -->
    <ImportPanel target={root} bind:over />
    <!-- `display: contents`: a handle on the split for `refocusExport`, with no box of its own. -->
    <span class="export" bind:this={exportPart}>
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
    </span>
  </div>
  <!--
    **E6**: undo restores a previous `TilesetFile` in full, and no editor action
    is outside the stack. §9.4 makes it *the repair* for an orphaned Selection:
    nothing is migrated, because migration has to guess.
  -->
  <!--
    "?" sits with Undo, not with New, Import and Export: it changes nothing in
    the file (DESIGN_SYSTEM.md, '"?" (Show the tour)'). One group, so
    `space-between` keeps the two together at the right when the bar wraps.
  -->
  <div class="history">
    <!--
      **E6**: undo restores a previous `TilesetFile` in full, and no editor action
      is outside the stack. §9.4 makes it *the repair* for an orphaned Selection:
      nothing is migrated, because migration has to guess.

      Two forms, one shown by the media rule below: at 375px the bar has no room
      for "?" beside a labelled Undo (O1), so below 40rem Undo is an icon. The
      hidden one is `display: none`, so it is out of the Tab order and the
      accessibility tree. Rejected: a `matchMedia` rune choosing one, which is
      more code and can disagree with the CSS breakpoint for a frame.
    -->
    <span class="undo-wide">
      <Button label="Undo" icon="undo" variant="tertiary" disabled={!session.canUndo} onclick={() => session.undo()} />
    </span>
    <span class="undo-narrow">
      <IconButton icon="undo" label="Undo" disabled={!session.canUndo} onclick={() => session.undo()} />
    </span>
    <!-- No guard against a second tour: while one runs, the editor behind its modal dialog is inert. -->
    <IconButton icon="help" label="Show the tour" haspopup="dialog" bind:element={help} onclick={() => help && onTour(help)} />
  </div>
</div>

<ExportImage bind:open={imaging} {draft} onFailed={imageFailed} />

<Popup title="Export failed" bind:open={reporting} onClose={() => (exportError = null)}>
  <p class="t-body">{exportError}</p>
</Popup>

<Popup title="Your tileset is downloading" bind:open={telling} onClose={refocusExport}>
  <div class="next">
  <p class="t-body">
    <span class="t-value">tileset.zip</span> holds <span class="t-value">tileset.json</span> and a
    <span class="t-value">tiles/</span> folder. To draw it on a website:
  </p>
  <ol class="steps t-body">
    <li>
      Install the package:
      <span class="command">
        <code class="t-value">{INSTALL_COMMAND}</code>
        <Button label={COPY_LABELS[copied]} icon={copied === "copied" ? "check" : "copy"} variant="tertiary" onclick={copyCommand} />
      </span>
    </li>
    <li>
      Put <span class="t-value">tiles/</span> and <span class="t-value">tileset.json</span> in your site's
      public files.
    </li>
    <li>Load the file and draw it. The guide shows how, for plain JavaScript and for Svelte.</li>
  </ol>
  <p class="t-body">
    <a class="link" href={GETTING_STARTED_URL} target="_blank" rel="noopener noreferrer"
      >Read the getting-started guide<span class="sr"> (opens in a new tab)</span></a
    >
  </p>
  </div>
  <!-- The button's new word, said once: a label that changes under focus is not reliably announced. -->
  <span class="sr" role="status">{copied === "idle" ? "" : `${COPY_LABELS[copied]}.`}</span>
  {#snippet actions(close)}
    <Button
      label="Don't show again"
      variant="tertiary"
      onclick={() => {
        nextHidden.set();
        close();
      }}
    />
    <Button label="Close" onclick={close} />
  {/snippet}
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

  /* `margin-left: auto`: wrapped onto a row of its own (320px), `space-between` alone would put it at the left. */
  .history {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-left: auto;
  }

  .export {
    display: contents;
  }

  .next {
    display: grid;
    gap: var(--space-6);
  }

  .next p {
    margin: 0;
  }

  .steps {
    display: grid;
    gap: var(--space-4);
    margin: 0;
    padding-left: var(--space-7);
  }

  /* The command and its copy button; the command wraps rather than widening the popup (1.4.10). */
  .command {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  code {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    background: var(--color-field);
    overflow-wrap: anywhere;
    user-select: all;
  }

  /* The editor's first text link: ink and underlined, so it is told from text by more than colour (1.4.1). */
  .link {
    color: var(--color-ink);
    text-decoration: underline;
    text-decoration-thickness: var(--rule-w);
    text-underline-offset: 3px;
  }

  .link:hover {
    text-decoration-thickness: var(--focus-w);
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .undo-wide,
  .undo-narrow {
    display: contents;
  }

  .undo-narrow {
    display: none;
  }

  @media (max-width: 40rem) {
    .undo-wide {
      display: none;
    }

    .undo-narrow {
      display: contents;
    }
  }
</style>
