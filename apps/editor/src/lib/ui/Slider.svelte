<!--
  The tile asset weight slider from Figma: a 1px ink track and a 10×20 ink
  block thumb.

  It is a restyled native `<input type="range">`, so focus, arrow keys, Page
  Up/Down, Home/End and screen reader support come from the browser. On top of
  that, Shift+arrow moves ten steps (`sliderStep`).

  **Two callbacks, so one drag is one undo entry.** `onInput` fires on every
  movement, for a live preview. `onCommit` fires once, on release (the native
  `change` event), or once per key press.

  **The file stays the source of truth.** After a commit the slider shows
  `value` again. If the caller refused the value, the thumb returns to where the
  file says it is rather than staying where it was dropped. A `value` outside
  `min`–`max` only pins the thumb to the end; it is never rewritten.
-->
<script lang="ts">
  import { tick } from "svelte";
  import { sliderStep } from "./keys.js";

  interface Props {
    value: number;
    min: number;
    max: number;
    step: number;
    label: string;
    onInput?: (value: number) => void;
    onCommit: (value: number) => void;
    disabled?: boolean;
  }

  let { value, min, max, step, label, onInput, onCommit, disabled = false }: Props = $props();

  let input: HTMLInputElement | undefined = $state();

  function read(event: Event): number {
    return Number((event.currentTarget as HTMLInputElement).value);
  }

  async function commit(next: number): Promise<void> {
    onCommit(next);
    // Let the caller's state settle, then show the file's value, whatever it is.
    await tick();
    if (input) input.value = String(value);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!event.shiftKey) return;
    const dir =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : 0;
    if (dir === 0) return;
    event.preventDefault();
    const from = Math.min(Math.max(value, min), max);
    const next = Math.min(Math.max(from + dir * sliderStep(step, true), min), max);
    // Round to the step's precision so 0.1 steps do not drift into 0.30000000000000004.
    const places = (String(step).split(".")[1] ?? "").length;
    const rounded = Number(next.toFixed(places));
    onInput?.(rounded);
    void commit(rounded);
  }
</script>

<input
  bind:this={input}
  class="slider"
  type="range"
  {min}
  {max}
  {step}
  {value}
  {disabled}
  aria-label={label}
  oninput={(event) => onInput?.(read(event))}
  onchange={(event) => void commit(read(event))}
  onkeydown={onKeydown}
/>

<style>
  .slider {
    --track-h: var(--rule-w);
    --thumb-offset: calc((var(--track-h) - var(--slider-thumb-h)) / 2);
    appearance: none;
    display: block;
    width: 100%;
    min-width: 0;
    height: var(--slider-thumb-h);
    margin: 0;
    background: transparent;
    cursor: grab;
  }

  .slider:active:not(:disabled) {
    cursor: grabbing;
  }

  .slider:disabled {
    cursor: default;
  }

  /* Hover thickens the track, as it thickens an underline field. */
  .slider:hover:not(:disabled) {
    --track-h: var(--focus-w);
  }

  .slider::-webkit-slider-runnable-track {
    height: var(--track-h);
    background: var(--color-ink);
  }

  .slider::-webkit-slider-thumb {
    appearance: none;
    width: var(--slider-thumb-w);
    height: var(--slider-thumb-h);
    margin-top: var(--thumb-offset);
    border: 0;
    border-radius: var(--radius);
    background: var(--color-ink);
  }

  .slider::-moz-range-track {
    height: var(--track-h);
    background: var(--color-ink);
  }

  .slider::-moz-range-thumb {
    width: var(--slider-thumb-w);
    height: var(--slider-thumb-h);
    border: 0;
    border-radius: var(--radius);
    background: var(--color-ink);
  }

  .slider:disabled::-webkit-slider-thumb {
    background: var(--color-inactive);
  }

  .slider:disabled::-moz-range-thumb {
    background: var(--color-inactive);
  }
</style>
