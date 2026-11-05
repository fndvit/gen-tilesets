<!--
  The preview's only bar, a toolbar in the sidebar's vocabulary: 28px
  controls, labels in the 600 role, numbers in mono, black for what is on. At
  the left, where the width is: the current width and one button per bound the
  file's breakpoints name. At the right, what to show: the Grid toggle, the
  size presets with Fill, and the background swatch.

  The black breakpoint is the range the width is in, the smallest bound at or
  above it (`activeBound`), so dragging across a bound moves the black along
  with the rule taking over. Pressing one shows the preview at exactly that
  bound; bounds are inclusive, so the rule it names applies there.

  Everything here is preview state (`view.svelte.ts`) and writes no field
  (**E11**). What used to be the preview's notes, that a resize changes nothing
  in the file, is the readout's hint, with the zoom and the rules that hold.
-->
<script lang="ts">
  import type { ResponsiveRule } from "@vit-foundation/gen-tilesets";
  import Hint from "../ui/Hint.svelte";
  import { preview } from "./view.svelte.js";
  import { activeBound, boundsOf, holdingLabel, PRESETS } from "./width.js";
  import WidthChoices from "./WidthChoices.svelte";

  interface Props {
    /** The file's breakpoints: their buttons, and the hint's "holding" line. */
    rules?: readonly ResponsiveRule[];
  }

  let { rules = [] }: Props = $props();

  const choices = [...PRESETS.map((p) => ({ value: p as number | null, label: String(p) })), { value: null, label: "Fill" }];

  /** A preset is chosen when it was asked for; Fill when nothing was. */
  const chosen = $derived(choices.find((c) => c.value === preview.requested)?.value);

  const bounds = $derived(boundsOf(rules));
  const breakpoints = $derived(bounds.map((b) => ({ value: b, label: String(b) })));
  const activeBreakpoint = $derived(activeBound(bounds, preview.width) ?? undefined);

  const hint = $derived(
    [
      preview.zoom < 1 ? `Shown at ${Math.round(preview.zoom * 100)}% to fit the column.` : "",
      rules.length > 0 ? `Holding: ${holdingLabel(rules, preview.width)}.` : "",
      "Resizing the preview changes nothing in the file.",
    ]
      .filter(Boolean)
      .join(" "),
  );
</script>

<div class="top-bar">
  <div class="where">
    <Hint text={hint}>
      {#snippet children(id)}
        <p class="readout" aria-describedby={id}>
          <span class="label t-label">Width</span>
          <span class="value t-console">{Math.round(preview.width)} px</span>
        </p>
      {/snippet}
    </Hint>

    <!-- Not drawn when the file has no breakpoints. -->
    {#if bounds.length > 0}
      <div class="breakpoints">
        <span class="label t-label" aria-hidden="true">Breakpoints</span>
        <WidthChoices
          choices={breakpoints}
          chosen={activeBreakpoint}
          onChoose={(value) => (preview.requested = value)}
          label="Breakpoints"
          divided
        />
      </div>
    {/if}
  </div>

  <div class="tools">
    <button
      type="button"
      class="grid-toggle t-xs"
      aria-pressed={preview.showGrid}
      onclick={() => (preview.showGrid = !preview.showGrid)}
    >
      Grid
    </button>

    <!-- The presets and the swatch wrap together. -->
    <div class="sizes">
      <WidthChoices
        {choices}
        {chosen}
        onChoose={(value) => (preview.requested = value)}
        label="Preview size"
      />

      <label class="swatch" style="--swatch: {preview.background};">
        <input type="color" bind:value={preview.background} aria-label="Preview background colour" />
      </label>
    </div>
  </div>
</div>

<style>
  .top-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-4) var(--space-8);
    /* On a narrow column the tools wrap under the readout (1.4.10). */
    min-height: var(--preview-bar-h);
    padding: var(--space-2) var(--pad-x);
    box-sizing: border-box;
    border-bottom: var(--divider);
    background: var(--color-paper);
    color: var(--color-ink);
  }

  /* The width and the breakpoints, which both say where the width is. */
  .where {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-4) var(--space-8);
  }

  .breakpoints {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .readout {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-height: var(--control-h);
    margin: 0;
    white-space: nowrap;
  }

  .label {
    color: var(--color-label);
  }

  /* A read-out, not a field: no box, but the fixed width keeps the bar still while dragging. */
  .value {
    min-width: 7ch;
    color: var(--color-ink);
  }

  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-4);
  }

  .sizes {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  /* A toggle button: paper when off, black when on, like a chosen segment. */
  .grid-toggle {
    box-sizing: border-box;
    min-width: var(--width-chip-w);
    height: var(--width-chip-h);
    padding: 0 var(--space-5);
    border: var(--rule);
    border-radius: var(--radius);
    background: var(--color-paper);
    color: var(--color-ink);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .grid-toggle:hover:not(:disabled) {
    border-color: var(--color-rule-hover);
    background: var(--color-hover);
  }

  .grid-toggle[aria-pressed="true"] {
    border-color: var(--color-selected);
    background: var(--color-selected);
    color: var(--color-on-selected);
  }

  .grid-toggle[aria-pressed="true"]:hover {
    border-color: var(--color-primary-hover);
    background: var(--color-primary-hover);
  }

  .grid-toggle:active:not(:disabled) {
    border-color: var(--color-primary-pressed);
    background: var(--color-primary-pressed);
    color: var(--color-on-primary);
  }

  .grid-toggle:disabled {
    border-color: var(--color-disabled);
    color: var(--color-disabled);
    cursor: default;
  }

  /* The swatch is the colour it holds, a square the height of a field, with the control edge. */
  .swatch {
    box-sizing: border-box;
    width: var(--swatch-w);
    height: var(--width-chip-h);
    border: var(--swatch-rule-w) solid var(--color-rule);
    border-radius: var(--radius);
    background: var(--swatch);
    cursor: pointer;
  }

  .swatch:hover {
    border-color: var(--color-ink);
    box-shadow: inset 0 0 0 var(--rule-w) var(--color-paper);
  }

  .swatch:focus-within {
    outline: var(--focus-w) solid var(--color-ink);
    outline-offset: var(--focus-offset);
  }

  /* The native input covers the swatch but draws nothing of its own. */
  .swatch input {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    opacity: 0;
    cursor: pointer;
  }
</style>
