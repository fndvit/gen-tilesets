<!--
  One variant of a tile group, as one compact line: a 24px thumbnail, the
  weight slider, the variant's share as a % in mono, and a delete cross.

  **Delete is shown on demand** (Pol, Block D): the cross at the row's end is
  visible while the row is hovered or has focus, and its column is always
  reserved so nothing moves. It is focusable while hidden, so Tab reaches it
  and shows it. With one variant left it stays, disabled, because a Tile with
  no assets cannot resolve (`03` §4.1).

  The thumbnail's hint carries E13's frozen measurement and `07` **R8**'s
  centre-crop note. The asset id is not shown: `a1`, `a2` tell the author
  nothing (Pol, Block D review). Controls are named by position instead.

  The slider sets the raw `asset.weight` on 0–2. The file follows a drag on
  every frame (`onInput`), so the tileset and every row's % move with it (Pol,
  Stage 2); release (`onCommit`) closes the drag as one undo entry.
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
  <span class="share t-console">{percent}%</span>
  <button
    type="button"
    class="delete"
    aria-label="Delete variant {position}"
    disabled={!canDelete}
    onclick={onDelete}
  >
    <Icon name="close" />
  </button>
</div>

<style>
  .asset {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-height: var(--row-h);
    padding-right: var(--space-1);
    border-radius: var(--radius);
    transition: background-color var(--dur-fast) var(--ease);
  }

  .asset:hover {
    background: var(--color-hover);
  }

  .thumb {
    flex: none;
    width: var(--thumb);
    height: var(--thumb);
  }

  img,
  .missing {
    display: block;
    box-sizing: border-box;
    width: var(--thumb);
    height: var(--thumb);
    border-radius: var(--radius-xs);
    object-fit: cover;
  }

  .missing {
    border: var(--rule-w) dashed var(--color-rule);
  }

  .share {
    flex: none;
    width: var(--share-w);
    color: var(--color-ink);
    text-align: right;
  }

  .delete {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--target-min);
    height: var(--target-min);
    padding: 0;
    border: 0;
    border-radius: var(--radius);
    background: none;
    color: var(--color-label);
    cursor: pointer;
    opacity: 0;
    transition:
      opacity var(--dur-fast) var(--ease),
      background-color var(--dur-fast) var(--ease);
  }

  .asset:hover .delete,
  .asset:focus-within .delete {
    opacity: 1;
  }

  .delete:hover:not(:disabled) {
    background: var(--color-pressed);
    color: var(--color-ink);
  }

  .delete:active:not(:disabled) {
    background: var(--color-rule);
    color: var(--color-paper);
  }

  .delete:disabled {
    color: var(--color-disabled);
    cursor: default;
  }
</style>
