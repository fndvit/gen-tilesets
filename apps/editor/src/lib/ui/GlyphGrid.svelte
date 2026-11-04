<!--
  A step's options as a grid of `OperationGlyph` cells: the Figma *Operation
  Glyphs Container*, `--glyph-cols` cells per row, 4px apart.

  It is a radio group. Tab enters once, on the chosen cell; arrows move the
  choice (Up/Down by a row) and commit it through `onChange`, as `Toggle` does.
  Items say nothing about their artwork beyond an optional `src`, so a step can
  mix drawn and label-only cells.
-->
<script lang="ts" generics="T extends string">
  import OperationGlyph from "./OperationGlyph.svelte";
  import { rovingIndex } from "./keys.js";

  interface Item {
    value: T;
    label: string;
    src?: string;
    disabled?: boolean;
  }

  interface Props {
    items: Item[];
    value: T | null;
    onChange: (value: T) => void;
    label: string;
  }

  let { items, value, onChange, label }: Props = $props();

  let cells: (HTMLButtonElement | undefined)[] = $state([]);
  let cols = $state(5);
  let grid: HTMLElement | undefined = $state();

  const selected = $derived(items.findIndex((item) => item.value === value));

  // Read the column count from the token so Up/Down match what is drawn.
  $effect(() => {
    if (!grid) return;
    const n = parseInt(getComputedStyle(grid).getPropertyValue("--glyph-cols"), 10);
    if (n > 0) cols = n;
  });

  function onKeydown(event: KeyboardEvent, i: number): void {
    const next = rovingIndex(event.key, i, items.length, cols);
    if (next === null) return;
    event.preventDefault();
    const item = items[next];
    if (!item || item.disabled) return;
    onChange(item.value);
    cells[next]?.focus();
  }
</script>

<div class="grid" role="radiogroup" aria-label={label} bind:this={grid}>
  {#each items as item, i (item.value)}
    <OperationGlyph
      bind:element={cells[i]}
      label={item.label}
      selected={i === selected}
      disabled={item.disabled ?? false}
      tabindex={i === selected || (selected < 0 && i === 0) ? 0 : -1}
      onclick={() => onChange(item.value)}
      onkeydown={(event) => onKeydown(event, i)}
      {...item.src ? { src: item.src } : {}}
    />
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(var(--glyph-cols), minmax(0, 1fr));
    gap: var(--space-2);
    align-items: start;
  }
</style>
