<!--
  A label column and a control: the row every non-text input shares (a
  segmented choice, a slider with its readout, a count). A typed number does
  not use it: `NumericInput` carries its label inside its own box.

  Two ways to name the control:
  - `for` set: the label is a `<label for>`, for a single native input.
  - `for` unset: the row is a `role="group"` named by the label, for a set of
    controls such as `Toggle`'s segments.

  The label sits in a fixed `--field-label-w` column in the 600 role, and the
  control fills the rest, so every row in the sidebar starts its control at the
  same x. `align` is kept for callers; every row now centres on its 28px line.

  **Explanations never sit in the row.** A `hint` appears in a bubble under the
  label as soon as the pointer is over it, and screen readers get the same text
  as the control's description. The children snippet receives the bubble's id
  to put in the control's `aria-describedby`; a group row wires it itself.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Hint from "./Hint.svelte";

  interface Props {
    label: string;
    for?: string;
    align?: "end" | "center";
    /** Explanation shown on hovering the label. */
    hint?: string;
    /** Receives the hint's id (or `undefined`), for the control's `aria-describedby`. */
    children: Snippet<[string | undefined]>;
  }

  let { label, for: htmlFor, align = "end", hint, children }: Props = $props();

  const id = $props.id();
  const labelId = `${id}-label`;
  const hintId = $derived(hint ? `${id}-hint` : undefined);
</script>

<div
  class="row"
  data-align={align}
  role={htmlFor ? undefined : "group"}
  aria-labelledby={htmlFor ? undefined : labelId}
  aria-describedby={htmlFor ? undefined : hintId}
>
  <span class="name">
    <Hint text={hint} id={hintId}>
      {#snippet children()}
        {#if htmlFor}
          <label class="t-label" id={labelId} for={htmlFor}>{label}</label>
        {:else}
          <span class="t-label" id={labelId}>{label}</span>
        {/if}
      {/snippet}
    </Hint>
  </span>
  <span class="control">
    {@render children(hintId)}
  </span>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: var(--field-label-w) minmax(0, 1fr);
    align-items: center;
    gap: var(--space-4);
    min-height: var(--control-h);
    color: var(--color-ink);
  }

  .name {
    display: flex;
    min-width: 0;
    color: var(--color-label);
  }

  /* Fills its column, and shrinks rather than pushing the row wider than the sidebar. */
  .control {
    display: flex;
    align-items: center;
    min-width: 0;
  }
</style>
