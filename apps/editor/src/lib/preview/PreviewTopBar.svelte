<!--
  The preview's only bar (Figma *UI top*, with *UI Bottom*'s breakpoints moved
  up: Pol, Stage 2). At the left, where the width is: the current width and one
  button per bound the file's breakpoints name. At the right, what to show: the
  Grid toggle, the size presets with Fill, and the background swatch.

  It wears the sidebar's vocabulary: the same grey ground, so the two read as
  one L of chrome around the white picture area, and the same segmented
  controls (white tracks here, one step lighter than the ground they sit on;
  the chosen segment in ink).

  The ink breakpoint is the range the width is in, the smallest bound at or
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
  import Toggle from "../ui/Toggle.svelte";
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
          <span class="t-label">Preview size</span>
          <span class="value t-value">{Math.round(preview.width)} px</span>
        </p>
      {/snippet}
    </Hint>

    <!-- Not drawn when the file has no breakpoints. -->
    {#if bounds.length > 0}
      <div class="breakpoints">
        <span class="t-label" aria-hidden="true">Breakpoints</span>
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
    <!--
      The grid is an On/Off switch (B-003), the editor's segmented `Toggle`.
      `Toggle` fills its row, which in a panel makes every control share one
      width; here it would take the bar, so `.grid` sizes it to its two
      segments instead. The visible "Grid" names it as "Breakpoints" names its
      buttons; the group's accessible name is the Toggle's own `label`.
    -->
    <div class="grid">
      <span class="t-label" aria-hidden="true">Grid</span>
      <span class="grid-switch">
        <Toggle
          label="Grid"
          options={[
            { value: false, label: "Off" },
            { value: true, label: "On" },
          ]}
          value={preview.showGrid}
          onChange={(on) => (preview.showGrid = on)}
        />
      </span>
    </div>

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
    /* Fields and tracks are white on the ground: one step lighter, as they are one step darker on a panel. */
    --color-field: var(--color-panel);

    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-4) var(--space-6);
    /* On a narrow column the tools wrap under the readout (1.4.10). */
    min-height: var(--preview-bar-h);
    padding: var(--space-3) var(--space-6) var(--space-3) var(--space-7);
    box-sizing: border-box;
    border-bottom: var(--rule-w) solid var(--color-bar-rule);
    background: var(--color-ground);
    color: var(--color-ink);
    /* The readout's hint measures the bar (`100cqi`), below. */
    container-type: inline-size;
  }

  /*
    The readout's hint opens rightward from the readout, up to `--hint-w`
    (260px). In a narrow preview column (a 660px window, the sidebar taking 400)
    there is less room than that to the bar's right edge, and the bubble, being
    absolutely placed in a column nothing clips, hung past the window and made
    the whole page scroll sideways while it showed (batch 01, T-04, B-013: the
    one case the reproduction probe found). So it is held to the bar's width
    less the bar's side padding, which is where it starts and where it must end.

    Rejected: `overflow: clip` on the column, which would cut the hint's words
    off instead; and `overflow: hidden` on `html`, which would hide the next
    such bug and break the narrow layout, where the page scrolls on purpose.

    It reaches into `Hint`'s bubble by its class because `--hint-w` cannot be
    redefined in terms of itself; `Hint` is unchanged.
  */
  .top-bar .where :global(.hint) {
    max-width: min(var(--hint-w), calc(100cqi - var(--space-7) - var(--space-6)));
  }

  /* The width and the breakpoints, which both say where the width is. */
  .where {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-4) var(--space-7);
  }

  .breakpoints {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .readout {
    display: flex;
    align-items: baseline;
    gap: var(--space-4);
    margin: 0;
    white-space: nowrap;
  }

  .value {
    font-weight: var(--weight-medium);
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

  .grid {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  /* Two segments of one chip each, not the whole row `Toggle` takes by default. */
  .grid-switch {
    flex: none;
    display: block;
    width: calc(2 * var(--width-chip-w));
  }

  /* The swatch is the colour it holds, edged so white still shows (1.4.11). */
  .swatch {
    box-sizing: border-box;
    width: var(--swatch-w);
    height: var(--control-h);
    border-radius: var(--radius-sm);
    background: var(--swatch);
    box-shadow: inset 0 0 0 var(--rule-w) var(--color-edge);
    cursor: pointer;
    transition: box-shadow var(--dur-fast) var(--ease);
  }

  .swatch:hover {
    box-shadow: inset 0 0 0 var(--focus-w) var(--color-ink);
  }

  .swatch:active {
    box-shadow: inset 0 0 0 calc(var(--focus-w) + var(--rule-w)) var(--color-ink);
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
