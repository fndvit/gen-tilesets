<!--
  The black "+" button that adds something: a tile group, an operation, a tile.

  Two shapes from Figma. `bar` spans its container at `--bar-h-add` (Add tile
  group, Add operation). `square` is a `--thumb` square that lines up with the
  thumbnails in a tile group (Add tile). The plus is drawn, not typed, so it
  needs `label` for its accessible name.
-->
<script lang="ts">
  import Icon from "./Icon.svelte";

  interface Props {
    label: string;
    onclick: (event: MouseEvent) => void;
    variant?: "bar" | "square";
    disabled?: boolean;
  }

  let { label, onclick, variant = "bar", disabled = false }: Props = $props();
</script>

<span class="on-bar" class:wide={variant === "bar"}>
  <button
    type="button"
    class="add {variant}"
    aria-label={label}
    title={label}
    {disabled}
    {onclick}
  >
    <Icon name="plus" />
  </button>
</span>

<style>
  .on-bar {
    display: inline-flex;
  }

  .wide {
    display: flex;
    width: 100%;
  }

  .add {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: var(--color-bar);
    color: var(--color-on-bar);
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease);
  }

  .bar {
    width: 100%;
    height: var(--bar-h-add);
  }

  .square {
    width: var(--thumb);
    height: var(--thumb);
  }

  .add:hover:not(:disabled) {
    color: var(--color-inactive);
  }

  .add:disabled {
    color: var(--color-inactive);
    cursor: default;
  }
</style>
