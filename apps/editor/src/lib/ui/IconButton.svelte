<!--
  A bare button holding one icon: delete, re-seed, move up / down.

  It has no fill of its own, so it takes the colour of whatever it sits on (white
  on a bar, ink on paper). The icon keeps its Figma size inside a
  `--target-min` box, the WCAG 2.2 target floor (2.5.8).
  Hover draws a 1px frame in the icon's own colour, so a seed button keeps its
  magenta while it still answers the pointer. `label` is required because the icon is the only
  thing a sighted user sees; a screen reader needs the words.

  `tone="seed"` paints it in `--color-seed`. The design system gives that colour
  one meaning, *non-deterministic*, so use it for re-seed and nothing else.
-->
<script lang="ts">
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons.js";

  interface Props {
    icon: IconName;
    label: string;
    onclick: (event: MouseEvent) => void;
    disabled?: boolean;
    tone?: "default" | "seed";
  }

  let { icon, label, onclick, disabled = false, tone = "default" }: Props = $props();
</script>

<button
  type="button"
  class="icon-button"
  class:seed={tone === "seed"}
  aria-label={label}
  title={label}
  {disabled}
  {onclick}
>
  <Icon name={icon} />
</button>

<style>
  .icon-button {
    box-sizing: border-box;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    min-width: var(--target-min);
    min-height: var(--target-min);
    padding: 0;
    border: var(--rule-w) solid transparent;
    background: none;
    color: inherit;
    cursor: pointer;
    transition:
      border-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  /* Re-seed is bigger than the other icon buttons (Pol, Block F review): a `--control-h` box, the icon `--icon-seed` wide. */
  .seed {
    min-width: var(--control-h);
    min-height: var(--control-h);
    color: var(--color-seed);
  }

  .seed :global(.icon) {
    width: var(--icon-seed);
    height: auto;
  }

  /* The colour is kept: on a seed button it is a meaning, not a state. */
  .icon-button:hover:not(:disabled) {
    border-color: currentColor;
  }

  .icon-button:active:not(:disabled) {
    border-width: var(--focus-w);
  }

  .icon-button:disabled {
    color: var(--color-inactive);
    cursor: default;
  }
</style>
