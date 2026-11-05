<!--
  A framed row of width buttons, both in the top bar: the size presets and the
  file's breakpoints (Figma *Preview sizes*, *Breakpoints*). One size for both,
  since the breakpoints moved up from their own bar (Pol, Stage 2).

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
    divided?: boolean;
  }

  let { choices, chosen, onChoose, label, divided = false }: Props = $props();
</script>

<div class="choices" class:divided role="group" aria-label={label}>
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
    min-width: var(--width-chip-w);
    height: var(--width-chip-h);
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
