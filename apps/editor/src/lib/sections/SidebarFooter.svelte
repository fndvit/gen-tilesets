<!--
  The sidebar's fixed footer, the Figma *Fixed* block: black, below the
  scrolling sections, never scrolled or collapsed.

  **Temporary.** Figma has the block but not its contents, which are Stage 2's
  footer design. Until then it holds the session controls that used to be the
  Seed and Import sections, the header's undo and the download button, built
  from primitives only.

  It is drawn in **`.theme-inverted`** (`tokens.css`): ink becomes white, paper
  black, and the bar colours swap. Every primitive inside (field
  rows, chips, buttons, hints) then renders inverted with no style of its own.

  Reports never take space here. An export failure, or the advisory that the
  document draws nothing, appears in a `ui/Popup` after the download, like the
  import reports (Pol, 2026-11-04).
-->
<script lang="ts">
  import { exportZip } from "../../download.js";
  import { drawsNothing } from "../../export.js";
  import {
    rerollAssets,
    rerollSeed,
    setDefaultSeed,
    setReseedAssetsOnLoad,
  } from "../../document.js";
  import { drawLoadSalt, inertFlags, loadVaries } from "../../reseed.js";
  import { session } from "../../session.svelte.js";
  import ImportPanel from "../ImportPanel.svelte";
  import Button from "../ui/Button.svelte";
  import FieldRow from "../ui/FieldRow.svelte";
  import IconButton from "../ui/IconButton.svelte";
  import Popup from "../ui/Popup.svelte";
  import Toggle from "../ui/Toggle.svelte";

  interface Props {
    /** §8.5's load-preview value. App holds it, because `<Tileset>` reads it. */
    loadSalt: number;
    /** Starts a new tileset (App's `newTileset`: confirmed, not undoable). */
    onNew: () => void;
  }

  let { loadSalt = $bindable(), onNew }: Props = $props();

  const file = $derived(session.file);
  const config = $derived(file.config);

  let root = $state<HTMLElement | null>(null);
  let over = $state(false);
  const seedId = $props.id();

  /** §8.5's disabled condition, and §8.4's advisory. */
  const varies = $derived(loadVaries(config));
  const inert = $derived(inertFlags(config));

  /**
   * `06` §10.4's second diagnostic, as **E16**'s advisory: never blocks, never
   * modifies the file, never an error. §8.4 requires it to be *reported* rather
   * than corrected: the flag still moves the Operation's `random` Selection
   * (`04` §8.2), so it is not fully inert and clearing it would change the
   * picture. Only reachable by import.
   */
  const freshLoadHint = $derived(
    (varies
      ? "Shows what another visitor's load looks like. Writes nothing to the file."
      : "Nothing is set to reseed on load, so every load looks the same.") +
      (inert.length > 0
        ? ` ${inert.map((op) => op.id).join(", ")} reseed on load over a source that is not random; only their random selection moves.`
        : ""),
  );

  /**
   * §11.1's export: the file and its asset folder, **together** (**E14**). Not
   * two buttons: a file exported without its folder reopens the hole the folder
   * closes.
   *
   * The failure is reported rather than swallowed. `entries()` throws where an
   * asset's bytes are missing or two assets claim one path, and shipping a
   * folder that is quietly incomplete is `07` **R3**'s substitution problem
   * moved into the artifact, where no `onAssetError` will ever fire for it.
   */
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

<div class="fixed theme-inverted" class:over bind:this={root}>
  <div class="fields">
    <!--
      `09` §8.2, the seed field. **The author never sees a hash** (`02` §6.6):
      they type a string, and that is the whole interface. **There is no
      separate preview seed** (§5): this writes `config.defaultSeed`, and the
      component falls back to it (`07` §9.2), so the preview always shows what
      a visitor with no host seed sees. An empty field is in-flight input and
      does not reach the file (**E5**).
    -->
    <FieldRow label="Seed" for={seedId} hint="Every operation's picture follows from it.">
      {#snippet children(describedBy)}
        <span class="seed">
          <input
            id={seedId}
            class="t-body"
            aria-describedby={describedBy}
            type="text"
            spellcheck="false"
            value={config.defaultSeed}
            oninput={(e) => session.apply(setDefaultSeed(e.currentTarget.value))}
          />
          <IconButton icon="reseed" tone="seed" label="New seed" onclick={() => session.apply(rerollSeed())} />
        </span>
      {/snippet}
    </FieldRow>

    <!--
      §8.4, the asset reroll. `02` §6.4: it rerolls which variant each cell
      shows **without disturbing any Operation**, because the asset channel is
      separate. Every `tileId` stays where it is.
    -->
    <FieldRow
      label="Assets"
      align="center"
      hint="Rerolls which variant each cell shows. No operation moves."
    >
      {#snippet children()}
        <IconButton icon="reseed" tone="seed" label="Reroll assets" onclick={() => session.apply(rerollAssets())} />
      {/snippet}
    </FieldRow>

    <FieldRow
      label="Assets on load"
      align="center"
      hint="Whether each page load picks the variants again."
    >
      {#snippet children()}
        <Toggle
          label="Assets on load"
          options={[
            { value: false, label: "Fixed" },
            { value: true, label: "Reseed" },
          ]}
          value={config.reseedAssetsOnLoad === true}
          onChange={(on) => session.apply(setReseedAssetsOnLoad(on))}
        />
      {/snippet}
    </FieldRow>

    <!--
      §8.5, the load preview. It **writes no field** (§8.1's fourth row): the
      value is held in App and reaches `<Tileset>` through its `options`.
      **Disabled where nothing is flagged**: `04` §8.3 makes such a config
      identical on every load regardless of `loadSalt`, and "an enabled button
      that provably changes nothing is `05` §6.1's complaint arriving one level
      out". **R12**: one value per session, moved only by this button.
    -->
    <FieldRow label="Fresh load" align="center" hint={freshLoadHint}>
      {#snippet children()}
        <IconButton
          icon="reseed"
          tone="seed"
          label="Preview a fresh load"
          disabled={!varies}
          onclick={() => (loadSalt = drawLoadSalt())}
        />
      {/snippet}
    </FieldRow>
  </div>

  <div class="actions">
    <!--
      **E6**: undo restores a previous `TilesetFile` in full, and no editor
      action is outside the stack. §9.4 makes it *the repair* for an orphaned
      Selection: nothing is migrated, because migration has to guess.
    -->
    <Button label="Undo" disabled={!session.canUndo} onclick={() => session.undo()} />
    <!--
      **E14**'s inverse. It discards the current document, but it is undoable
      like everything else (**E6**), so it needs no confirmation.
    -->
    <ImportPanel target={root} bind:over />
    <Button label="New" onclick={onNew} />
    <span class="download">
      <Button
        label={exporting ? "Building…" : "Download tileset.zip"}
        disabled={exporting}
        wide
        onclick={runExport}
      />
    </span>
  </div>
</div>

<Popup
  title={exportError !== null ? "Download failed" : "Downloaded"}
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
  .fixed {
    /* Hints open upward: below the footer is the edge of the screen. */
    --hint-top: auto;
    --hint-bottom: calc(100% + var(--space-2));

    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-6);
    padding: var(--space-6) calc(var(--space-3) + var(--space-2)) var(--footer-pad-bottom);
    background: var(--color-paper);
    color: var(--color-ink);
    transition: outline-color var(--dur-fast) var(--ease);
    outline: var(--focus-w) solid transparent;
    outline-offset: calc(-1 * var(--focus-w));
  }

  /* A zip or folder dragged over the footer. */
  .fixed.over {
    outline-color: var(--color-ink);
  }

  .fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
  }

  /* The field gives way before the row grows past a narrow sidebar (WCAG 1.4.10). */
  .seed {
    display: flex;
    align-items: flex-end;
    gap: var(--space-4);
    min-width: 0;
  }

  /* The numeric field's underline, in the case-keeping body face: a seed is case-sensitive. */
  input {
    width: calc(var(--field-w) * 1.5);
    min-width: 0;
    /* Room above the digits makes the field a 24px target (WCAG 2.2, 2.5.8) with the text still on the rule. */
    padding: calc(var(--target-min) - 1em - var(--rule-w)) var(--space-2) 0;
    border: 0;
    border-bottom: var(--rule);
    border-radius: var(--radius);
    background: transparent;
    color: var(--color-ink);
    line-height: 1;
    text-align: right;
  }

  input:hover,
  input:focus-visible {
    outline: none;
    border-bottom-width: var(--focus-w);
    margin-bottom: calc(var(--rule-w) - var(--focus-w));
  }

  /* Wraps in a narrow sidebar rather than scrolling sideways (WCAG 1.4.10). */
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--chip-gap);
  }

  .download {
    flex: 1;
    display: flex;
  }

  p {
    margin: 0 0 var(--space-4);
  }
</style>
