<!--
  A bare button holding one icon: delete, re-seed, move up / down.

  It has no fill of its own and takes the colour of the text around it (the
  label role in a header row). The icon sits in a `--target-min` box, the
  WCAG 2.2 target floor (2.5.8). Hover puts a grey square behind it and
  pressing darkens it, so a seed button keeps its magenta while it still
  answers the pointer. `label` is required because the icon is the only
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
    border: 0;
    border-radius: var(--radius);
    background: none;
    color: inherit;
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  /* Re-seed is a step larger (Pol, Block F review): a `--control-h` box. */
  .seed {
    min-width: var(--control-h);
    min-height: var(--control-h);
    color: var(--color-seed);
  }

  .seed :global(.icon) {
    width: var(--icon-seed);
    height: auto;
  }

  /* A grey square behind it, and the icon goes to full ink. A seed icon keeps its magenta: the colour is a meaning. */
  .icon-button:hover:not(:disabled) {
    background: var(--color-hover);
    color: var(--color-ink);
  }

  .seed:hover:not(:disabled) {
    color: var(--color-seed);
  }

  .icon-button:active:not(:disabled) {
    background: var(--color-pressed);
  }

  .icon-button:disabled {
    color: var(--color-disabled);
    cursor: default;
  }
</style>
