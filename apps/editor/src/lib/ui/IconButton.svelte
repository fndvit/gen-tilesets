<!--
  A bare button holding one icon: delete, re-seed, move up / down.

  It has no box of its own, so it takes the colour of whatever it sits on (white
  on a bar, ink on paper). `label` is required because the icon is the only
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease);
  }

  .seed {
    color: var(--color-seed);
  }

  /*
    Hover on a bar dims to inactive. A seed button keeps its colour on hover,
    because the colour is a meaning, not a state. Figma has no seed hover yet.
  */
  .icon-button:not(.seed):hover:not(:disabled) {
    color: var(--color-inactive);
  }

  .icon-button:disabled {
    color: var(--color-inactive);
    cursor: default;
  }
</style>
