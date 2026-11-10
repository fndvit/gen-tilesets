<!--
  One on/off setting with its label always beside it (batch 03 T-07, B-029):
  "Reseed on load", on a closed operation card and in the open card's Pattern
  step, so one setting has one control everywhere.

  A native `<input type="checkbox">` inside its `<label>`, so Space toggles it,
  a click on the words toggles it, and assistive technology hears a checkbox
  with its name and state, with nothing re-implemented. Rejected: the chip
  with `role="switch"` it replaces (B-029: it landed in a different place on
  each card, and its On/Off read as a step's answer), and a `Toggle`, which is
  for choosing between named values, not for one setting being on.

  **Look.** A 16px square (`--checkbox`) with a 1.5px edge in the text colour,
  as `RadioList`'s ring: ink on white or the grey well is ≥ 15:1 (1.4.11).
  Checked, it fills ink with a white `check`. The label is `.t-body` in ink.
  The whole label is the target, at least `--target-min` (24px) tall (2.5.8).
  Hover washes it (`--color-hover`), press washes it darker
  (`--color-pressed`), and keyboard focus rings the whole label in the accent,
  as `RadioList` rings its row.

  `hint` explains the setting on hovering the label (`ui/Hint`), and becomes
  the checkbox's description for assistive technology.

  **Controlled.** It shows `checked` and reports a press through `onChange`;
  it never keeps a value of its own. A press puts the box back at once, and
  the new value arrives as the prop, so a caller that refuses the change
  (or makes it as a file edit, as `OperationsSection` does) is never out of
  step with what the box shows.
-->
<script lang="ts">
  import Hint from "./Hint.svelte";
  import Icon from "./Icon.svelte";

  interface Props {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** Explanation shown on hovering the label. */
    hint?: string | undefined;
    disabled?: boolean;
  }

  let { label, checked, onChange, hint, disabled = false }: Props = $props();

  function onchange(event: Event & { currentTarget: HTMLInputElement }): void {
    const next = event.currentTarget.checked;
    // Back to the prop's value: the caller decides, and the prop brings it.
    event.currentTarget.checked = checked;
    onChange(next);
  }
</script>

<Hint text={hint}>
  {#snippet children(hintId)}
    <label class="checkbox t-body" class:disabled>
      <input type="checkbox" {checked} {disabled} aria-describedby={hintId} {onchange} />
      <span class="box" aria-hidden="true"><Icon name="check" /></span>
      <span class="text">{label}</span>
    </label>
  {/snippet}
</Hint>

<style>
  /*
    Positioned, so the hidden input's containing block is the label: an
    absolute element with no positioned ancestor nearer than `ScrollArea`'s
    viewport escapes clipping and holds the scroll height (`reveal.ts`
    `closeDrop`).
  */
  .checkbox {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--target-min);
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    cursor: pointer;
    transition: background-color var(--dur-fast) var(--ease);
  }

  .checkbox:hover:not(.disabled) {
    background: var(--color-hover);
  }

  .checkbox:active:not(.disabled) {
    background: var(--color-pressed);
  }

  .checkbox:has(:focus-visible) {
    outline: var(--focus-w) solid var(--color-accent);
    outline-offset: 0;
  }

  .disabled {
    color: var(--color-disabled);
    cursor: default;
  }

  /* The native input stays in the tree for keyboard and assistive technology; `.box` draws it. */
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    opacity: 0;
    pointer-events: none;
  }

  .box {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: var(--checkbox);
    height: var(--checkbox);
    border: 1.5px solid currentColor;
    border-radius: var(--radius-xs);
    background: var(--color-panel);
    color: inherit;
  }

  /* The check is drawn only when checked; `Icon` is 16px, the box's inside is 13. */
  .box :global(.icon) {
    width: 12px;
    height: 12px;
    visibility: hidden;
  }

  input:checked + .box {
    background: currentColor;
  }

  input:checked + .box :global(.icon) {
    visibility: visible;
    color: var(--color-on-selected);
  }

  .text {
    line-height: var(--leading-title);
    text-box: none;
    white-space: nowrap;
  }
</style>
