<!--
  One generated control — `09-editor.md` §7.1's four affordances.

  The E5 discipline of `NumericInput` applies here too, for the same reason: a
  half-typed number must not reach the draft, and a value the spec refuses must
  not be coerced into range (`06` §9.2; §7.5's "clamping typed input would be
  coercion performed in the one place the author is watching").
-->
<script lang="ts">
  import type { ParamSpec } from "@fndvit/gen-tilesets";
  import { admits, rangeLabel, type Affordance } from "./affordance.js";

  interface Props {
    name: string;
    spec: ParamSpec;
    affordance: Affordance;
    value: unknown;
    onChange: (value: unknown) => void;
  }

  let { name, spec, affordance, value, onChange }: Props = $props();

  /** In-flight text, `null` when the author is not editing. Same model as `NumericInput`. */
  let draft = $state<string | null>(null);

  const shown = $derived(draft ?? String(value ?? ""));
  const pending = $derived(draft !== null && !admits(spec, Number(draft)));

  function commit(text: string): void {
    draft = text;
    const n = Number(text.trim());
    if (text.trim() !== "" && Number.isFinite(n) && admits(spec, n)) onChange(n);
  }

  /**
   * Checked with `admits` like typed input. A slider's ends are its affordance's
   * `min` and `max`, and for an exclusive bound that end is a value the spec
   * refuses: dragged to the end, it would commit it.
   */
  function slide(text: string): void {
    const n = Number(text);
    if (admits(spec, n)) onChange(n);
  }

  const range = $derived(rangeLabel(spec));
</script>

<div class="param" class:pending>
  <span class="label">
    {name}
    {#if range}<em>{range}</em>{/if}
  </span>

  {#if affordance.kind === "segmented"}
    <!-- §7.1: an `enum` gets a segmented control over `values`. A narrow bounded
         integer arrives here too — §7.1's "or a stepper where narrow". -->
    <div class="segmented">
      {#each affordance.values as option (option)}
        <button class:on={value === option} onclick={() => onChange(option)}>
          {option}
        </button>
      {/each}
    </div>
  {:else if affordance.kind === "slider"}
    <!-- §7.1: both bounds, so the track has a length. Typed entry stays exact
         through the number field beside it. -->
    <div class="slider">
      <input
        type="range"
        min={affordance.min}
        max={affordance.max}
        step={affordance.step}
        value={Number(value ?? affordance.min)}
        oninput={(e) => slide(e.currentTarget.value)}
        aria-label={name}
      />
      <input
        class="exact"
        type="number"
        step={affordance.integer ? 1 : "any"}
        value={shown}
        oninput={(e) => commit(e.currentTarget.value)}
        onblur={() => (draft = null)}
        aria-label="{name} exact value"
      />
    </div>
  {:else if affordance.kind === "number"}
    <!-- §7.1: one bound or none — a numeric field, with integer steps where the
         spec says integer. The step is a convenience; `admits` is the rule.

         Narrowed on `kind` rather than left as a bare `{:else}`: `cellList` is
         in the union and `ParamFields` handles it before reaching here, so the
         explicit branch is what keeps that routing checkable. -->
    <input
      class="field"
      type="number"
      step={affordance.integer ? 1 : "any"}
      value={shown}
      oninput={(e) => commit(e.currentTarget.value)}
      onblur={() => (draft = null)}
      aria-label={name}
    />
  {/if}
</div>

<style>
  .param {
    display: grid;
    grid-template-columns: 1fr 10rem;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .label {
    color: #4a5568;
    min-width: 0;
  }

  .label em {
    display: block;
    font-style: normal;
    font-size: 0.68rem;
    color: #a0aec0;
  }

  input {
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    color: inherit;
    border-radius: 4px;
    padding: 0.25rem 0.35rem;
    font: inherit;
    font-size: 0.8rem;
    width: 100%;
    min-width: 0;
  }

  input:focus {
    outline: none;
    border-color: #a0aec0;
  }

  .slider {
    display: grid;
    grid-template-columns: 1fr 4rem;
    gap: 0.35rem;
    align-items: center;
  }

  .slider input[type="range"] {
    padding: 0;
    border: 0;
    background: transparent;
    accent-color: #3182ce;
  }

  .segmented {
    display: flex;
  }

  .segmented button {
    flex: 1;
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    color: #4a5568;
    border-radius: 0;
    padding: 0.25rem 0.2rem;
    font: inherit;
    font-size: 0.72rem;
    cursor: pointer;
    min-width: 0;
  }

  .segmented button:first-child {
    border-radius: 4px 0 0 4px;
  }

  .segmented button:last-child {
    border-radius: 0 4px 4px 0;
  }

  .segmented button:not(:first-child) {
    border-left: 0;
  }

  .segmented button.on {
    background: #cbd5e0;
    color: #1a202c;
  }

  /* Holding text the spec refuses. Not an error — the draft keeps its last
     legal value and the preview keeps drawing. */
  .pending input {
    border-color: #b7791f;
  }
</style>
