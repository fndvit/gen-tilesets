<!--
  The reference image's controls — a second row beside the preview width and the
  backdrop colour, because it is the same kind of control: it changes what the
  author is looking at and **writes no field** (**E11**). `reference.ts` carries
  the reasoning; this file is the affordances.
-->
<script lang="ts">
  import type { Reference } from "../reference.js";

  interface Props {
    reference: Reference | null;
    /** A refused file's reason — `measure`'s message, shown rather than swallowed. */
    error: string | null;
    onPick: (file: File) => void;
    onClear: () => void;
    /** Sets `Wpx` to the image's intrinsic width, so the two are 1:1. */
    onMatchWidth: () => void;
    /** The current `Wpx`, so the control can say whether it already matches. */
    width: number;
    opacity: number;
    inFront: boolean;
    yOffset: number;
    onOpacity: (next: number) => void;
    onInFront: (next: boolean) => void;
    onOffset: (next: number) => void;
  }

  let {
    reference,
    error,
    onPick,
    onClear,
    onMatchWidth,
    width,
    opacity,
    inFront,
    yOffset,
    onOpacity,
    onInFront,
    onOffset,
  }: Props = $props();

  let input = $state<HTMLInputElement | null>(null);

  /**
   * The same acceptance the tile library has: `accept="image/*"` on the picker,
   * and validation by *decoding* rather than by sniffing a MIME type — a file
   * either produces a picture with an intrinsic size or it is refused
   * (`assets.ts` `measure`).
   */
  function onFiles(files: FileList | null): void {
    const file = files?.[0];
    if (file !== undefined) onPick(file);
  }

  function onChange(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    onFiles(element.files);
    // Cleared so picking the same file twice fires again -- re-picking after a
    // refusal is the obvious retry.
    element.value = "";
  }

  const matched = $derived(reference !== null && Math.round(width) === reference.width);
</script>

<div class="reference">
  <input
    type="file"
    accept="image/*"
    bind:this={input}
    onchange={onChange}
    aria-label="Reference image file"
  />

  {#if reference === null}
    <button class="pick" onclick={() => input?.click()}>
      Reference image…
    </button>
    <em>
      A picture of the page this tileset is for. Drop it on the preview. Session only — writes no
      field.
    </em>
  {:else}
    <span class="name" title={reference.name}>{reference.name}</span>
    <code class="size">{reference.width} × {reference.height}</code>

    <!--
      The button that makes the comparison honest: at `Wpx` = the image's own
      width, one image px is one design px, which is what `07` §5.3 guarantees
      and the reason to draw the picture at `Wpx` at all.
    -->
    <button
      class="match"
      class:on={matched}
      disabled={matched}
      onclick={onMatchWidth}
      title="Set the render box to the image's own width, so image px and design px are 1:1"
    >
      {matched ? "1:1" : `match ${reference.width}`}
    </button>

    <label class="offset">
      y
      <input
        type="number"
        step="10"
        value={yOffset}
        oninput={(event) => {
          const next = Number.parseFloat((event.currentTarget as HTMLInputElement).value);
          if (Number.isFinite(next)) onOffset(next);
        }}
      />
    </label>

    <label class="opacity">
      opacity
      <input
        type="range"
        min="0.1"
        max="1"
        step="0.05"
        value={opacity}
        oninput={(event) =>
          onOpacity(Number.parseFloat((event.currentTarget as HTMLInputElement).value))}
      />
    </label>

    <button
      class="side"
      onclick={() => onInFront(!inFront)}
      title="Which side of the tiles the picture is drawn on"
    >
      {inFront ? "in front" : "behind"}
    </button>

    <button class="pick" onclick={() => input?.click()} title="Replace the reference image">
      ⟲
    </button>
    <button class="clear" onclick={onClear} title="Remove the reference image">✕</button>
  {/if}
</div>

{#if error !== null}
  <p class="failure">Reference image: {error}</p>
{/if}

<style>
  .reference {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-5);
    font-size: var(--text-xs-size);
    color: var(--color-ink);
    flex-wrap: wrap;
  }

  /* The picker is driven by the buttons; a bare file input beside them would be
     a second, differently-styled affordance for the same thing. */
  input[type="file"] {
    display: none;
  }

  /* The chip look (`ui/Toggle`), at the 24px target floor. Stage 2 removes this bar. */
  .reference button {
    box-sizing: border-box;
    min-height: var(--target-min);
    background: var(--color-paper);
    border: var(--rule);
    color: var(--color-ink);
    border-radius: var(--radius);
    padding: 0 var(--space-3);
    font: inherit;
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .reference button:hover:not(:disabled),
  .match.on {
    background: var(--color-ink);
    color: var(--color-paper);
  }

  .reference button:active:not(:disabled) {
    background: var(--color-pressed);
    color: var(--color-on-pressed);
  }

  .reference button:disabled {
    border-color: var(--color-inactive);
    color: var(--color-inactive);
    cursor: default;
  }

  .name {
    max-width: 12rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .size {
    font-family: var(--font-mono);
    color: var(--color-muted);
  }

  em {
    font-style: normal;
    color: var(--color-muted);
  }

  .offset input {
    box-sizing: border-box;
    width: var(--field-w);
    min-height: var(--target-min);
    background: var(--color-paper);
    border: var(--rule);
    border-radius: var(--radius);
    padding: 0 var(--space-2);
    font: inherit;
  }

  .opacity input {
    width: var(--field-w);
    vertical-align: middle;
    accent-color: var(--color-ink);
  }

  .failure {
    margin: 0 0 var(--space-5);
    font-size: var(--text-xs-size);
    color: var(--color-danger);
  }
</style>
