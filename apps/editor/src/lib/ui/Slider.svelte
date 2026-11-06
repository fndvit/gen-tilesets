<!--
  The weight slider: a soft grey track, filled in ink up to the value, and a
  round ink thumb. The input itself is 24px tall, the pointer target (2.5.8).

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

  /** How far along the track the value is, for the ink fill behind the thumb. */
  const fill = $derived(max > min ? Math.min(Math.max((value - min) / (max - min), 0), 1) * 100 : 0);

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
  style:--fill="{fill}%"
  oninput={(event) => onInput?.(read(event))}
  onchange={(event) => void commit(read(event))}
  onkeydown={onKeydown}
/>

<style>
  .slider {
    --thumb-offset: calc((var(--slider-track-h) - var(--slider-thumb)) / 2);
    --fill-color: var(--color-ink);
    appearance: none;
    display: block;
    width: 100%;
    min-width: 0;
    height: var(--target-min);
    margin: 0;
    background: transparent;
    cursor: grab;
  }

  .slider:active:not(:disabled) {
    cursor: grabbing;
  }

  .slider:disabled {
    --fill-color: var(--color-disabled);
    cursor: default;
  }

  .slider:focus-visible {
    outline-offset: 0;
    border-radius: var(--radius-sm);
  }

  .slider::-webkit-slider-runnable-track {
    height: var(--slider-track-h);
    border-radius: var(--slider-track-h);
    background: linear-gradient(to right, var(--fill-color) var(--fill), var(--color-track) var(--fill));
  }

  .slider::-moz-range-track {
    height: var(--slider-track-h);
    border-radius: var(--slider-track-h);
    background: linear-gradient(to right, var(--fill-color) var(--fill), var(--color-track) var(--fill));
  }

  .slider::-webkit-slider-thumb {
    appearance: none;
    box-sizing: border-box;
    width: var(--slider-thumb);
    height: var(--slider-thumb);
    margin-top: var(--thumb-offset);
    border: var(--focus-w) solid var(--color-paper);
    border-radius: var(--radius-round);
    background: var(--fill-color);
    box-shadow: var(--shadow-raised);
    transition: transform var(--dur-fast) var(--ease);
  }

  .slider::-moz-range-thumb {
    box-sizing: border-box;
    width: var(--slider-thumb);
    height: var(--slider-thumb);
    border: var(--focus-w) solid var(--color-paper);
    border-radius: var(--radius-round);
    background: var(--fill-color);
    box-shadow: var(--shadow-raised);
  }

  /* Hover grows the thumb; pressing shrinks it back a little, so a grab is felt. */
  .slider:hover:not(:disabled)::-webkit-slider-thumb {
    transform: scale(1.2);
  }

  .slider:active:not(:disabled)::-webkit-slider-thumb {
    transform: scale(1.05);
  }

  .slider:hover:not(:disabled)::-moz-range-thumb {
    transform: scale(1.2);
  }
</style>
