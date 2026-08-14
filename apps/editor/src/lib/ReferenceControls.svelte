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
    gap: 0.4rem;
    margin-bottom: 0.6rem;
    font-size: 0.75rem;
    color: #4a5568;
    flex-wrap: wrap;
  }

  /* The picker is driven by the buttons; a bare file input beside them would be
     a second, differently-styled affordance for the same thing. */
  input[type="file"] {
    display: none;
  }

  .reference button {
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    color: #4a5568;
    border-radius: 4px;
    padding: 0.2rem 0.45rem;
    font: inherit;
    font-size: 0.72rem;
    cursor: pointer;
  }

  .reference button:disabled {
    cursor: default;
  }

  .match.on {
    background: #c6f6d5;
    border-color: #9ae6b4;
    color: #22543d;
  }

  .name {
    max-width: 12rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .size {
    font-family: ui-monospace, monospace;
    color: #5a6b80;
  }

  em {
    font-style: normal;
    font-size: 0.7rem;
    color: #a0aec0;
  }

  .offset input {
    width: 4.5rem;
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    border-radius: 4px;
    padding: 0.15rem 0.3rem;
    font: inherit;
    font-size: 0.72rem;
  }

  .opacity input {
    width: 5rem;
    vertical-align: middle;
  }

  .failure {
    margin: 0 0 0.6rem;
    font-size: 0.75rem;
    color: #c53030;
  }
</style>
