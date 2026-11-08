<!--
  A row of width buttons on a segmented track, both in the top bar: the size
  presets and the file's breakpoints. One look for both, and the same as the
  sidebar's segmented controls.

  Each button is an action, "show the preview at this width", so they are
  `aria-pressed` buttons rather than a radio group: a dragged width matches
  none of them, and a radio group with nothing chosen is not one. The one that
  matches is drawn in ink and does nothing when pressed again.

  `divided` is accepted and draws nothing: the track's gaps already separate
  the segments.
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

  let { choices, chosen, onChoose, label }: Props = $props();
</script>

<div class="choices" role="group" aria-label={label}>
  {#each choices as choice (choice.value)}
    {@const on = choice.value === chosen}
    <button
      type="button"
      class="choice t-xs"
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
    gap: var(--space-1);
    min-height: var(--control-h);
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    background: var(--color-field);
  }

  .choice {
    box-sizing: border-box;
    min-width: var(--width-chip-w);
    min-height: calc(var(--control-h) - 2 * var(--space-1));
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 var(--space-3);
    border: 0;
    border-radius: calc(var(--radius-sm) - var(--space-1));
    background: transparent;
    color: var(--color-ink);
    font-variant-numeric: tabular-nums;
    line-height: normal;
    text-box: none;
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .choice:hover:not([aria-pressed="true"]) {
    background: var(--color-hover);
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

  .choice:focus-visible {
    outline-offset: 0;
  }
</style>
