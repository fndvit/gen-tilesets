<!--
  A segmented row of width buttons, both in the top bar: the size presets and
  the file's breakpoints. The same 28px segmented box as the sidebar's
  choices, with the widths in mono so the digits line up.

  Each button is an action, "show the preview at this width", so they are
  `aria-pressed` buttons rather than a radio group: a dragged width matches
  none of them, and a radio group with nothing chosen is not one. The one that
  matches is black and does nothing when pressed again.

  `divided` is kept for callers; every segment now has a rule between it and
  the next.
-->
<script lang="ts" generics="T">
  interface Choice {
    value: T;
    label: string;
  }

  interface Props {
    choices: Choice[];
    /** The value drawn as chosen, if any matches. */
    chosen: T | undefined;
    onChoose: (value: T) => void;
    /** The group's accessible name. */
    label: string;
    divided?: boolean;
  }

  let { choices, chosen, onChoose, label, divided = false }: Props = $props();
</script>

<div class="choices" class:divided role="group" aria-label={label}>
  {#each choices as choice (choice.value)}
    {@const on = choice.value === chosen}
    <button
      type="button"
      class="choice t-console"
      aria-pressed={on}
      onclick={() => {
        if (!on) onChoose(choice.value);
      }}
    >
      {choice.label}
    </button>
  {/each}
</div>

<style>
  .choices {
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    border: var(--rule);
    border-radius: var(--radius);
    background: var(--color-field);
    overflow: hidden;
  }

  .choice {
    box-sizing: border-box;
    min-width: var(--width-chip-w);
    height: calc(var(--width-chip-h) - 2 * var(--rule-w));
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 var(--space-4);
    border: 0;
    background: transparent;
    color: var(--color-label);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .choice + .choice {
    border-left: var(--rule);
  }

  .choice:hover:not([aria-pressed="true"]) {
    background: var(--color-hover);
    color: var(--color-ink);
  }

  .choice:active:not([aria-pressed="true"]) {
    background: var(--color-pressed);
  }

  /* Pressing the chosen one again does nothing, and the pointer says so. */
  .choice[aria-pressed="true"] {
    background: var(--color-selected);
    color: var(--color-on-selected);
    cursor: default;
  }

  /* The focus ring sits inside, so a neighbour cannot cover it. */
  .choice:focus-visible {
    outline-offset: calc(-1 * var(--focus-w) - var(--focus-offset));
  }

  .choice[aria-pressed="true"]:focus-visible {
    outline-color: var(--color-on-selected);
  }
</style>
