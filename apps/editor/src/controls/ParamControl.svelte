<!--
  One generated control — `09-editor.md` §7.1's four affordances.

  The E5 discipline of `NumericInput` applies here too, for the same reason: a
  half-typed number must not reach the draft, and a value the spec refuses must
  not be coerced into range (`06` §9.2; §7.5's "clamping typed input would be
  coercion performed in the one place the author is watching").

  Each affordance is a field row (Block E): a `NumericInput` for a number, a
  `Toggle` for a segmented choice, and a `Slider` with a value readout for a
  bounded number. The range is a hint on the label, never text in the row.
-->
<script lang="ts">
  import type { ParamSpec } from "@vit-foundation/gen-tilesets";
  import NumericInput from "../lib/NumericInput.svelte";
  import FieldRow from "../lib/ui/FieldRow.svelte";
  import Slider from "../lib/ui/Slider.svelte";
  import Toggle from "../lib/ui/Toggle.svelte";
  import { labelFor } from "../lib/operations/labels.js";
  import { admits, rangeLabel, type Affordance } from "./affordance.js";

  interface Props {
    name: string;
    spec: ParamSpec;
    affordance: Affordance;
    value: unknown;
    onChange: (value: unknown) => void;
  }

  let { name, spec, affordance, value, onChange }: Props = $props();

  const label = $derived(labelFor(name));
  const range = $derived(rangeLabel(spec));
  const hint = $derived(range === "" ? undefined : `Accepts ${range}.`);

  /** `null` refuses the text, so a half-typed or out-of-range number never reaches the draft. */
  function parse(text: string): number | null {
    const n = Number(text.trim());
    return text.trim() !== "" && Number.isFinite(n) && admits(spec, n) ? n : null;
  }

  /**
   * Checked with `admits` like typed input. `affordanceFor` already insets an
   * exclusive end by one step, so no slider position should be refused; this
   * is the guard for a float step that lands a hair past the bound.
   */
  function slide(n: number): void {
    if (admits(spec, n)) onChange(n);
  }

  /**
   * The readout, to the slider's step: a float step lands on values such as
   * `0.30000000000000004`, which would also push the row wider than the sidebar.
   */
  function readout(v: unknown, step: number): string {
    if (typeof v !== "number") return "";
    const places = Math.max(0, Math.ceil(-Math.log10(step)));
    return String(Number(v.toFixed(places)));
  }
</script>

{#if affordance.kind === "segmented"}
  <!-- §7.1: an `enum` gets a segmented control over `values`. A narrow bounded
       integer arrives here too — §7.1's "or a stepper where narrow". -->
  <FieldRow {label} {...hint ? { hint } : {}} align="center">
    {#snippet children()}
      <Toggle
        options={affordance.values.map((v) => ({ value: v, label: String(v) }))}
        value={value as string | number}
        onChange={(v) => onChange(v)}
        {label}
      />
    {/snippet}
  </FieldRow>
{:else if affordance.kind === "slider"}
  <!-- §7.1: both bounds, so the track has a length. The draft is transient, so
       following the thumb live costs no undo entries. -->
  <FieldRow {label} {...hint ? { hint } : {}} align="center">
    {#snippet children()}
      <span class="slider">
        <Slider
          value={Number(value ?? affordance.min)}
          min={affordance.min}
          max={affordance.max}
          step={affordance.step}
          {label}
          onInput={slide}
          onCommit={slide}
        />
        <span class="readout t-label">{readout(value, affordance.step)}</span>
      </span>
    {/snippet}
  </FieldRow>
{:else if affordance.kind === "number"}
  <!-- §7.1: one bound or none — a numeric field, with integer steps where the
       spec says integer. The step is a convenience; `admits` is the rule.

       Narrowed on `kind` rather than left as a bare `{:else}`: `cellList` is
       in the union and `ParamFields` handles it before reaching here, so the
       explicit branch is what keeps that routing checkable. -->
  <NumericInput
    {label}
    value={Number(value ?? 0)}
    {parse}
    onCommit={(text) => onChange(Number(text.trim()))}
    step={affordance.integer ? "1" : "any"}
    {...hint ? { hint } : {}}
  />
{/if}

<style>
  .slider {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: calc(var(--field-w) * 2);
    max-width: 100%;
  }

  .readout {
    flex: none;
    width: var(--share-w);
    text-align: right;
  }
</style>
