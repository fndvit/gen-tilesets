<!--
  The preview's only bar (Figma *UI top*, with *UI Bottom*'s breakpoints moved
  up: Pol, Stage 2). At the left, where the width is: the current width and one
  button per bound the file's breakpoints name. At the right, what to show: the
  Grid toggle, the size presets with Fill, and the background swatch.

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
          <span class="t-body">Current preview size:</span>
          <span class="value">{Math.round(preview.width)} px</span>
        </p>
      {/snippet}
    </Hint>

    <!-- Not drawn when the file has no breakpoints. -->
    {#if bounds.length > 0}
      <div class="breakpoints">
        <span class="t-body" aria-hidden="true">Breakpoints</span>
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
      class="grid-toggle t-body"
      aria-pressed={preview.showGrid}
      onclick={() => (preview.showGrid = !preview.showGrid)}
    >
      Grid
    </button>

    <!-- The presets touch the swatch, as in Figma, and wrap with it. -->
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
    gap: var(--space-6);
    /* At least Figma's height; on a narrow column the tools wrap under the readout (1.4.10). */
    min-height: var(--preview-bar-h);
    padding-left: var(--space-5);
    background: var(--color-paper);
    color: var(--color-ink);
  }

  /* The width and the breakpoints, which both say where the width is. */
  .where {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-6);
    align-self: stretch;
  }

  /* The label sits on the bar's centre line beside the readout; the buttons
     hang from the top edge, like the presets. */
  .breakpoints {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    align-self: stretch;
  }

  .breakpoints > span {
    align-self: center;
  }

  .readout {
    display: flex;
    align-items: baseline;
    gap: var(--space-4);
    margin: 0;
    white-space: nowrap;
  }

  /* Figma's 65 Medium at the xs size, in lower case ("860 px"). */
  .value {
    font-family: var(--font-ui);
    font-size: var(--text-xs-size);
    font-weight: var(--weight-medium);
  }

  /* The presets hang from the top edge and the swatch fills the bar, as in Figma. */
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--space-4);
    align-self: stretch;
  }

  .sizes {
    display: flex;
    align-items: flex-start;
    align-self: stretch;
  }

  .grid-toggle {
    box-sizing: border-box;
    min-width: var(--width-chip-w);
    height: var(--width-chip-h);
    border: var(--rule);
    background: var(--color-paper);
    color: var(--color-ink);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .grid-toggle:hover:not(:disabled),
  .grid-toggle[aria-pressed="true"]:not(:disabled) {
    background: var(--color-ink);
    color: var(--color-paper);
  }

  .grid-toggle:active:not(:disabled) {
    background: var(--color-pressed);
    color: var(--color-on-pressed);
  }

  .grid-toggle:disabled {
    border-color: var(--color-inactive);
    color: var(--color-inactive);
    cursor: default;
  }

  /* The swatch is the colour it holds, in a heavy frame. */
  .swatch {
    box-sizing: border-box;
    width: var(--swatch-w);
    min-height: var(--preview-bar-h);
    align-self: stretch;
    border: var(--swatch-rule-w) solid var(--color-rule);
    background: var(--swatch);
    cursor: pointer;
  }

  .swatch:hover {
    outline: var(--rule-w) solid var(--color-rule);
    outline-offset: calc(-1 * var(--swatch-rule-w) - var(--rule-w));
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
