<!--
  A framed row of width buttons: the size presets in the top bar and the file's
  breakpoints in the bottom bar (Figma *Preview sizes*, *Breakpoints*).

  Each button is an action, "show the preview at this width", so they are
  `aria-pressed` buttons rather than a radio group: a dragged width matches
  none of them, and a radio group with nothing chosen is not one. The one that
  matches is drawn in ink and does nothing when pressed again.

  `divided` draws a rule between the cells (the breakpoints); the presets have
  none, as in Figma.
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
    size: "preset" | "breakpoint";
    divided?: boolean;
  }

  let { choices, chosen, onChoose, label, size, divided = false }: Props = $props();
</script>

<div class="choices {size}" class:divided role="group" aria-label={label}>
  {#each choices as choice (choice.value)}
    {@const on = choice.value === chosen}
    <button
      type="button"
      class="choice t-body"
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
    display: flex;
    flex-wrap: wrap;
    border: var(--rule);
  }

  .choice {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 var(--space-2);
    border: 0;
    background: var(--color-paper);
    color: var(--color-ink);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .preset .choice {
    min-width: var(--width-chip-w);
    height: var(--width-chip-h);
  }

  .breakpoint .choice {
    min-width: var(--breakpoint-w);
    height: var(--breakpoint-h);
  }

  .divided .choice + .choice {
    border-left: var(--rule);
  }

  /* Block F's chip rule: invert on hover, grey while pressed. */
  .choice:hover,
  .choice[aria-pressed="true"] {
    background: var(--color-ink);
    color: var(--color-paper);
  }

  /* Pressing the chosen one again does nothing, and the pointer says so. */
  .choice[aria-pressed="true"] {
    cursor: default;
  }

  .choice:active:not([aria-pressed="true"]) {
    background: var(--color-pressed);
    color: var(--color-on-pressed);
  }

  /* The focus ring sits inside, so a neighbour cannot cover it. */
  .choice:focus-visible {
    outline-offset: calc(-1 * var(--focus-w) - var(--focus-offset));
  }

  /* On an ink cell the ring is paper, or it would vanish. */
  .choice:hover:focus-visible,
  .choice[aria-pressed="true"]:focus-visible {
    outline-color: var(--color-paper);
  }
</style>
