<!--
  A label on the left and a control on the right: the row shape every Figma
  input shares (Numeric input, Boolean input, operation params).

  Two ways to name the control:
  - `for` set: the label is a `<label for>`, for a single native input.
  - `for` unset: the row is a `role="group"` named by the label, for a set of
    controls such as `Toggle`'s chips.

  `align="end"` (default) sits the control on the label's baseline, as an
  underline field does in Figma. `align="center"` centres it, for chips.

  A container can set `--field-label-w` and `--field-justify: flex-start` to put
  every label in a column of that width with the control right after it,
  instead of at the far end of the row (an operation body does).

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

  let { label, for: htmlFor, align = "end", hint, children }: Props = $props();

  const id = $props.id();
  const labelId = `${id}-label`;
  const hintId = $derived(hint ? `${id}-hint` : undefined);
</script>

<div
  class="row"
  class:center={align === "center"}
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
    display: flex;
    align-items: flex-end;
    justify-content: var(--field-justify, space-between);
    gap: var(--space-4);
    color: var(--color-ink);
  }

  .center {
    align-items: center;
  }

  .name {
    flex: 0 0 var(--field-label-w, auto);
    min-width: 0;
  }

  /* Shrinks rather than pushing the row wider than the sidebar. */
  .control {
    display: flex;
    flex: 0 1 auto;
    min-width: 0;
  }
</style>
