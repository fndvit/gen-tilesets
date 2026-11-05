<!--
  A numeric mapping — `09-editor.md` §7.4, and the author never sees the word.

  §7.4 fixes the presentation exactly: "a numeric mapping is two handles on the
  Target's slider track... The track spans the Target's authoring range (§7.5);
  the two handles are `range[0]` and `range[1]`."

  Three rules that are each easy to get backwards:

  1. **The handles cross rather than clamp.** `04` §6.2 makes `min > max` legal
     and reversing, and §7.4 says "preventing the crossing would remove the only
     way any Source is inverted."

  2. **`steps` is a separate control and its absence is a meaning.** `06` §5.1:
     it "reads as *continuous / stepped* rather than as a number with a blank
     default, and the editor omits the key entirely when continuous" — the one
     field exempt from *write everything explicitly*.

  3. **The handles collapse to one under a `constant` Source.** `04` §5.2: a
     fixed value is `min` equal to `max`, and "the alternative — a `value`
     parameter on the Source — would put two controls in the UI meaning the same
     thing".
-->
<script lang="ts">
  import type { AttributeName, NumericMapping } from "@vit-foundation/gen-tilesets";
  import NumericInput from "../lib/NumericInput.svelte";
  import { labelFor } from "../lib/operations/labels.js";
  import FieldRow from "../lib/ui/FieldRow.svelte";
  import Hint from "../lib/ui/Hint.svelte";
  import Toggle from "../lib/ui/Toggle.svelte";
  import { admitsTyped, endpointsCoincide, MIN_STEPS, trackFor } from "./mapping.js";

  interface Props {
    target: AttributeName;
    mapping: NumericMapping;
    /** `04` §5.2 — collapses the two handles to one. */
    collapsed: boolean;
    onChange: (mapping: NumericMapping) => void;
  }

  let { target, mapping, collapsed, onChange }: Props = $props();

  const track = $derived(trackFor(target, mapping.range));
  const step = $derived((track.max - track.min) / 200);

  /** Position on the track, as a percentage. Handles may cross, so neither is "the left one". */
  const pct = (v: number): number =>
    track.max === track.min ? 0 : ((v - track.min) / (track.max - track.min)) * 100;

  const lowPct = $derived(Math.min(pct(mapping.range[0]), pct(mapping.range[1])));
  const highPct = $derived(Math.max(pct(mapping.range[0]), pct(mapping.range[1])));

  function setEnd(index: 0 | 1, value: number): void {
    if (!admitsTyped(target, value)) return;
    const range: [number, number] = [...mapping.range];
    range[index] = value;
    // Collapsed: one handle, both ends. 04 §5.2's fixed value.
    if (collapsed) range[index === 0 ? 1 : 0] = value;
    onChange({ ...mapping, range });
  }

  /** `null` refuses the text; a typed end outside the attribute's domain never reaches the draft. */
  function parseEnd(text: string): number | null {
    const n = Number(text.trim());
    return text.trim() !== "" && Number.isFinite(n) && admitsTyped(target, n) ? n : null;
  }

  function parseSteps(text: string): number | null {
    const n = Number(text.trim());
    return Number.isInteger(n) && n >= MIN_STEPS ? n : null;
  }

  /**
   * `steps` present or absent — not a number with a default.
   *
   * `04` §6.2: stepped is `index = floor(t * steps)` then
   * `v = min + index * (max - min) / (steps - 1)`, which is why `06` §7.3
   * requires `steps >= 2`.
   */
  function setStepped(on: boolean): void {
    if (on) {
      onChange({ ...mapping, steps: mapping.steps ?? MIN_STEPS });
    } else {
      // Omit the key entirely. `steps: null` is invalid (`06` §5.1).
      const { steps: _dropped, ...rest } = mapping;
      onChange(rest);
    }
  }

  const advisory = $derived(endpointsCoincide(target, mapping));

  const label = $derived(labelFor(target));

  /**
   * The label's hint: the track's domain, why the handles collapsed, and
   * §12.2's ninth advisory (never blocks, never modifies the file, never an
   * error, **E16**). Spec references stay here, not in the bubble.
   */
  const hint = $derived(
    [
      collapsed
        ? "A fixed value: the Constant source gives every cell the same number, so both ends are one."
        : `${track.soft ? "Soft track" : "Domain"} ${track.min} to ${track.max}${track.wraps ? ", wrapping" : ""}.`,
      advisory
        ? "Rotation wraps at 360, so these two ends are the same angle and one result lands twice as often. Quarter turns are 0 to 270 in 4 steps."
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
</script>

<div class="mapping">
  <Hint text={hint}>
    {#snippet children()}
      <!-- "Range": the framed block's bar above already names the attribute. -->
      <span class="t-label">Range</span>
    {/snippet}
  </Hint>

  <!--
    One track carrying both handles. The filled span is between them whichever
    way round they are, because a reversed range is not an error — it is how
    every Source is inverted (`04` §6.2).
  -->
  <div class="track">
    <div class="span" style:left="{lowPct}%" style:right="{100 - highPct}%"></div>
    <input
      class="handle"
      type="range"
      min={track.min}
      max={track.max}
      {step}
      value={mapping.range[0]}
      oninput={(e) => setEnd(0, Number(e.currentTarget.value))}
      aria-label="{label} range start"
    />
    {#if !collapsed}
      <input
        class="handle"
        type="range"
        min={track.min}
        max={track.max}
        {step}
        value={mapping.range[1]}
        oninput={(e) => setEnd(1, Number(e.currentTarget.value))}
        aria-label="{label} range end"
      />
    {/if}
  </div>

  {#if collapsed}
    <NumericInput label="Value" value={mapping.range[0]} parse={parseEnd} onCommit={(t) => setEnd(0, Number(t))} />
  {:else}
    <NumericInput label="From" value={mapping.range[0]} parse={parseEnd} onCommit={(t) => setEnd(0, Number(t))} />
    <NumericInput label="To" value={mapping.range[1]} parse={parseEnd} onCommit={(t) => setEnd(1, Number(t))} />
  {/if}

  <!--
    `04` §6.2: because `t < 1` strictly, a continuous mapping never attains
    `max`. A stepped one does — which is why a flip needs `steps`
    (`[−1, 1]` × 2).
  -->
  <FieldRow
    label="Steps"
    hint="Continuous never quite reaches the far end. Stepped lands on evenly spaced values, both ends included: a flip is -1 to 1 in 2 steps."
    align="center"
  >
    {#snippet children()}
      <Toggle
        options={[
          { value: false, label: "Continuous" },
          { value: true, label: "Stepped" },
        ]}
        value={mapping.steps !== undefined}
        onChange={setStepped}
        label="Steps"
      />
    {/snippet}
  </FieldRow>

  {#if mapping.steps !== undefined}
    <NumericInput
      label="Step count"
      value={mapping.steps}
      parse={parseSteps}
      onCommit={(t) => onChange({ ...mapping, steps: Number(t) })}
      step="1"
    />
  {/if}
</div>

<style>
  /* One column that never grows past the body (the implicit `auto` column would). */
  .mapping {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
    color: var(--color-ink);
  }

  /* One track, two thumbs. The inputs are stacked and made transparent so the
     span below shows through; only the thumbs take pointer events. The thumbs
     are `Slider`'s ink blocks. */
  .track {
    position: relative;
    height: var(--slider-thumb-h);
  }

  .track::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: var(--rule-w);
    background: var(--color-ink);
  }

  /* Hover thickens the track, as on `Slider`. */
  .track:hover::before {
    height: var(--focus-w);
  }

  .span {
    position: absolute;
    top: 50%;
    height: var(--space-2);
    transform: translateY(-50%);
    background: var(--color-ink);
  }

  .handle {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background: transparent;
    appearance: none;
    pointer-events: none;
  }

  .handle::-webkit-slider-thumb {
    appearance: none;
    pointer-events: auto;
    width: var(--slider-thumb-w);
    height: var(--slider-thumb-h);
    border: 0;
    border-radius: var(--radius);
    background: var(--color-ink);
    cursor: ew-resize;
  }

  .handle::-moz-range-thumb {
    pointer-events: auto;
    width: var(--slider-thumb-w);
    height: var(--slider-thumb-h);
    border: 0;
    border-radius: var(--radius);
    background: var(--color-ink);
    cursor: ew-resize;
  }

  .handle:focus-visible {
    outline: none;
  }

  .handle:focus-visible::-webkit-slider-thumb {
    outline: var(--focus-w) solid var(--color-ink);
    outline-offset: var(--focus-offset);
  }

  .handle:focus-visible::-moz-range-thumb {
    outline: var(--focus-w) solid var(--color-ink);
    outline-offset: var(--focus-offset);
  }
</style>
