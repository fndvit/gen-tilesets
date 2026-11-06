<!--
  A label on the left and a control beside it: the row shape every input
  shares (numbers, choices, operation params).

  The label sits in a column (`--field-label-w`, 38% by default) and the
  control starts right after it and fills the rest, so every value in a panel
  starts at one tab stop, close to its own label, instead of at the far edge.

  Two ways to name the control:
  - `for` set: the label is a `<label for>`, for a single native input.
  - `for` unset: the row is a `role="group"` named by the label, for a set of
    controls such as `Toggle`'s chips.

  `align` is kept for callers; both values centre the label on the control,
  because every control is now a box of the same height.

  A container can set `--field-label-w` to change the label column (an
  operation body uses a fixed width; the footer's half-width rows use `auto`).

  **Explanations never sit in the row.** A `hint` appears in a small ink
  bubble under the label as soon as the pointer is over the label, and screen
  readers get the same text as the control's description. The children snippet
  receives the bubble's id to put in the control's `aria-describedby`; a group
  row wires it itself. The bubble is `ui/Hint`'s.
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

  let { label, for: htmlFor, hint, children }: Props = $props();

  const id = $props.id();
  const labelId = `${id}-label`;
  const hintId = $derived(hint ? `${id}-hint` : undefined);
</script>

<div
  class="row"
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
    min-width: 0;
  }

  /* Fills the rest of the row, and shrinks rather than pushing it wider than the sidebar. */
  .control {
    display: flex;
    align-items: center;
    min-width: 0;
  }
</style>
