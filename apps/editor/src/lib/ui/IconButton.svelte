<!--
  A bare button holding one icon: delete, re-seed, move up / down.

  It has no fill of its own. At rest the icon is muted, so a row of trash and
  arrow icons stays quiet beside the values; under the pointer it turns ink on
  a grey wash, and the wash deepens while pressed. The icon keeps its Figma
  size inside a `--target-min` box, the WCAG 2.2 target floor (2.5.8). A seed
  button keeps its magenta in every state: there the colour is a meaning. `label` is required because the icon is the only
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
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
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

  .icon-button:focus-visible {
    outline-offset: 0;
  }

  .icon-button:disabled {
    color: var(--color-disabled);
    opacity: 0.6;
    cursor: default;
  }
</style>
