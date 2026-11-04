<!--
  The Figma *Tile asset*: one variant of a tile group. A 32px thumbnail, the
  weight slider and the variant's share as a %.

  **Delete is a badge on the thumbnail** (Pol, Block D; not in Figma): a black
  circle with a white cross at its top-right corner, shown while the row is
  hovered or has focus. It is focusable while hidden, so Tab reaches it and
  shows it. With one variant left it stays, disabled, because a Tile with no
  assets cannot resolve (`03` §4.1).

  The thumbnail's hint carries E13's frozen measurement and `07` **R8**'s
  centre-crop note. The asset id is not shown: `a1`, `a2` tell the author
  nothing (Pol, Block D review). Controls are named by position instead.

  The slider sets the raw `asset.weight` on 0–2. The % is computed by the
  group, which follows a drag live (`onInput`) so every row's share moves
  together. The file changes once, on release (`onCommit`).
-->
<script lang="ts">
  import type { TileAsset } from "@vit-foundation/gen-tilesets";
  import { stored } from "../../assets.js";
  import Hint from "../ui/Hint.svelte";
  import Icon from "../ui/Icon.svelte";
  import Slider from "../ui/Slider.svelte";

  interface Props {
    tileId: string;
    asset: TileAsset;
    /** 1-based position in the group, for accessible names. */
    position: number;
    /** This variant's share of the group, 0–100, rounded. */
    percent: number;
    canDelete: boolean;
    onInput: (weight: number) => void;
    onCommit: (weight: number) => void;
    onDelete: () => void;
  }

  let { tileId, asset, position, percent, canDelete, onInput, onCommit, onDelete }: Props = $props();

  const file = $derived(stored(tileId, asset.id));

  const details = $derived(
    file === undefined
      ? "No attached file in this session."
      : `${file.width}×${file.height}${
          file.width !== file.height ? " · not square, so it is centre-cropped" : ""
        }`,
  );
</script>

<div class="asset">
  <span class="thumb">
    <Hint text={details}>
      {#snippet children(hintId)}
        {#if file}
          <img src={file.url} alt="" aria-describedby={hintId} />
        {:else}
          <span class="missing" aria-describedby={hintId}></span>
        {/if}
      {/snippet}
    </Hint>
    <button
      type="button"
      class="badge"
      aria-label="Delete variant {position}"
      disabled={!canDelete}
      onclick={onDelete}
    >
      <Icon name="close" />
    </button>
  </span>
  <Slider
    label="Weight of variant {position}"
    min={0}
    max={2}
    step={0.01}
    value={asset.weight}
    {onInput}
    {onCommit}
  />
  <span class="share t-label">{percent}%</span>
</div>

<style>
  .asset {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--thumb);
  }

  .thumb {
    position: relative;
    flex: none;
    width: var(--thumb);
    height: var(--thumb);
  }

  img,
  .missing {
    display: block;
    width: var(--thumb);
    height: var(--thumb);
    object-fit: cover;
  }

  .missing {
    box-sizing: border-box;
    border: var(--rule);
  }

  .badge {
    position: absolute;
    top: calc(-1 * var(--space-2));
    right: calc(-1 * var(--space-2));
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--badge);
    height: var(--badge);
    padding: 0;
    border: 0;
    border-radius: var(--radius-round);
    background: var(--color-bar);
    color: var(--color-on-bar);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--dur-fast) var(--ease);
  }

  /* The ring around a circle: the outline follows the radius. */
  .badge:focus-visible {
    outline: var(--focus-w) solid var(--color-ink);
    outline-offset: var(--focus-offset);
  }

  .asset:hover .badge,
  .asset:focus-within .badge {
    opacity: 1;
    pointer-events: auto;
  }

  .badge:disabled {
    background: var(--color-inactive);
    cursor: default;
  }

  .share {
    flex: none;
    width: var(--share-w);
    text-align: right;
  }
</style>
