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
  import type { AttributeName, NumericMapping } from "@fndvit/gen-tilesets";
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

  /** In-flight text per end, so a half-typed number never reaches the draft (E5). */
  let drafts = $state<[string | null, string | null]>([null, null]);

  function type(index: 0 | 1, text: string): void {
    drafts[index] = text;
    const n = Number(text.trim());
    if (text.trim() !== "" && Number.isFinite(n)) setEnd(index, n);
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

  function setSteps(text: string): void {
    const n = Number(text);
    if (Number.isInteger(n) && n >= MIN_STEPS) onChange({ ...mapping, steps: n });
  }

  const advisory = $derived(endpointsCoincide(target, mapping));
</script>

<div class="mapping">
  <div class="row">
    <span class="label">{target}</span>
    <span class="hint">
      {#if collapsed}
        fixed value — the Source is <code>constant</code>
      {:else}
        {track.soft ? "soft track" : "domain"}
        [{track.min}, {track.max}{track.wraps ? ")" : "]"}]
      {/if}
    </span>
  </div>

  <!--
    One track carrying both handles. The filled span is between them whichever
    way round they are, because a reversed range is not an error — it is how
    every Source is inverted (`04` §6.2).
  -->
  <div class="track">
    <div class="span" style="left: {lowPct}%; right: {100 - highPct}%;"></div>
    <input
      class="handle"
      type="range"
      min={track.min}
      max={track.max}
      {step}
      value={mapping.range[0]}
      oninput={(e) => setEnd(0, Number(e.currentTarget.value))}
      aria-label="{target} range start"
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
        aria-label="{target} range end"
      />
    {/if}
  </div>

  <div class="ends">
    <input
      type="number"
      step="any"
      value={drafts[0] ?? mapping.range[0]}
      oninput={(e) => type(0, e.currentTarget.value)}
      onblur={() => (drafts[0] = null)}
      aria-label="{target} range start, exact"
    />
    {#if collapsed}
      <span class="fixed">both ends — <code>04</code> §5.2</span>
    {:else}
      <span class="to">to</span>
      <input
        type="number"
        step="any"
        value={drafts[1] ?? mapping.range[1]}
        oninput={(e) => type(1, e.currentTarget.value)}
        onblur={() => (drafts[1] = null)}
        aria-label="{target} range end, exact"
      />
    {/if}
  </div>

  <div class="steps">
    <div class="segmented">
      <button class:on={mapping.steps === undefined} onclick={() => setStepped(false)}>
        continuous
      </button>
      <button class:on={mapping.steps !== undefined} onclick={() => setStepped(true)}>
        stepped
      </button>
    </div>
    {#if mapping.steps !== undefined}
      <input
        type="number"
        min={MIN_STEPS}
        step="1"
        value={mapping.steps}
        oninput={(e) => setSteps(e.currentTarget.value)}
        aria-label="steps"
      />
    {/if}
  </div>

  {#if mapping.steps === undefined}
    <p class="note">
      <!-- `04` §6.2: because `t < 1` strictly, a continuous mapping never attains
           `max`. A stepped one does — which is why flip needs `steps`. -->
      Continuous never attains the far end (<code>t &lt; 1</code>). Flip needs
      <em>stepped</em>: <code>[−1, 1]</code> × 2.
    </p>
  {/if}

  {#if advisory}
    <!--
      §12.2's ninth advisory. Never blocks, never modifies the file, never an
      error (**E16**).
    -->
    <p class="advisory">
      <code>rotation</code> wraps at 360, so these endpoints are the same value — one
      result lands twice as often. Quarter turns are <code>[0, 270]</code> × 4
      (<code>04</code>&nbsp;§6.2).
    </p>
  {/if}
</div>

<style>
  .mapping {
    display: grid;
    gap: 0.4rem;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
  }

  .label {
    font-size: 0.8rem;
    color: #1a202c;
  }

  .hint {
    font-size: 0.68rem;
    color: #a0aec0;
  }

  /* One track, two thumbs. The inputs are stacked and made transparent so the
     span below shows through; only the thumbs take pointer events. */
  .track {
    position: relative;
    height: 1.1rem;
  }

  .track::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 3px;
    transform: translateY(-50%);
    background: #e2e8f0;
    border-radius: 2px;
  }

  .span {
    position: absolute;
    top: 50%;
    height: 3px;
    transform: translateY(-50%);
    background: #3182ce;
    border-radius: 2px;
  }

  .handle {
    position: absolute;
    inset: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    background: transparent;
    appearance: none;
    pointer-events: none;
  }

  .handle::-webkit-slider-thumb {
    appearance: none;
    pointer-events: auto;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #1a202c;
    border: 2px solid #cbd5e0;
    cursor: ew-resize;
  }

  .handle::-moz-range-thumb {
    pointer-events: auto;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #1a202c;
    border: 2px solid #cbd5e0;
    cursor: ew-resize;
  }

  .handle:focus-visible::-webkit-slider-thumb {
    border-color: #3182ce;
  }

  .ends {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .ends input {
    width: 5rem;
  }

  .to,
  .fixed {
    font-size: 0.7rem;
    color: #a0aec0;
  }

  .steps {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .steps input {
    width: 4rem;
  }

  .segmented {
    display: flex;
    flex: 1;
  }

  .segmented button {
    flex: 1;
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    color: #4a5568;
    border-radius: 0;
    padding: 0.22rem 0.2rem;
    font: inherit;
    font-size: 0.7rem;
    cursor: pointer;
  }

  .segmented button:first-child {
    border-radius: 4px 0 0 4px;
  }

  .segmented button:last-child {
    border-radius: 0 4px 4px 0;
    border-left: 0;
  }

  .segmented button.on {
    background: #cbd5e0;
    color: #1a202c;
  }

  input[type="number"] {
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    color: inherit;
    border-radius: 4px;
    padding: 0.22rem 0.35rem;
    font: inherit;
    font-size: 0.78rem;
    min-width: 0;
  }

  input[type="number"]:focus {
    outline: none;
    border-color: #a0aec0;
  }

  .note,
  .advisory {
    margin: 0;
    font-size: 0.68rem;
    line-height: 1.45;
    color: #a0aec0;
  }

  .advisory {
    color: #8a6d1f;
  }

  code {
    font-family: ui-monospace, monospace;
    color: #2b6cb0;
  }
</style>
