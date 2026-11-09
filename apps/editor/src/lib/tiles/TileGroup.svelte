<!--
  One Tile, as a grey well inside the Tiles panel: a header (the title,
  editable on click, up to four thumbnails, the trash and the chevron) over
  its variants, a square "+" to add more and Reset weights.

  **The variants are listed by id, with no drag affordance** (**D3**, `09`
  §10.1). `03` §4.2 sorted assets precisely so that dragging a list entry could
  not reshuffle the canvas, so a drag here would be a gesture with no effect.
  The order is the package's `canonicalAssets`, never a local sort.

  **Renaming is checked by the section**, which refuses a name another group
  already has. Where an imported file holds two Tiles of the same name, the
  section passes the id as `note`, shown after the title on both, and a `hint`
  saying why. Both are display only.

  Dropping image files anywhere on the group adds them as variants. The
  refusal logic (last variant, last non-zero weight, a Tile still in use) is
  the section's; this component only reports gestures.
-->
<script lang="ts">
  import { canonicalAssets, type Tile } from "@vit-foundation/gen-tilesets";
  import { stored } from "../../assets.js";
  import AddBar from "../ui/AddBar.svelte";
  import Advisory from "../ui/Advisory.svelte";
  import Button from "../ui/Button.svelte";
  import Collapsible from "../ui/Collapsible.svelte";
  import IconButton from "../ui/IconButton.svelte";
  import TileAsset from "./TileAsset.svelte";

  interface Props {
    tile: Tile;
    /** `(t3)` where another Tile shares this name. */
    note?: string | undefined;
    hint?: string | undefined;
    /** An inline advisory at the top of the body (`09` §12.2's sixth: a shared name). */
    advisory?: string | undefined;
    onRename: (name: string) => void;
    onDelete: () => void;
    /** Every frame of a weight drag; the file follows it. */
    onWeightInput: (assetId: string, weight: number) => void;
    /** A weight drag's release, or a keyboard step. */
    onWeight: (assetId: string, weight: number) => void;
    onDeleteAsset: (assetId: string) => void;
    /** Every variant back to weight 1. */
    onResetWeights: () => void;
    /** The square "+": the section opens the Tile gallery in variants mode for this Tile (B-016 S3c). */
    onAdd: () => void;
    /** Files dropped on the group, to add as variants. */
    onFiles: (files: File[]) => void;
  }

  let {
    tile,
    note,
    hint,
    advisory,
    onRename,
    onDelete,
    onWeightInput,
    onWeight,
    onDeleteAsset,
    onResetWeights,
    onAdd,
    onFiles,
  }: Props = $props();

  let open = $state(true);
  let armed = $state(false);

  const assets = $derived(canonicalAssets(tile));
  /** Disabled, not hidden, when there is nothing to reset. */
  const equal = $derived(assets.every((a) => a.weight === 1));

  /** From the file, which follows a drag frame by frame, so every row's % moves with it. */
  const total = $derived(assets.reduce((n, a) => n + a.weight, 0));
  const percentOf = (weight: number) => (total > 0 ? Math.round((weight / total) * 100) : 0);

  /** The bar's thumbnails (Figma group B), kept while open too (Pol, Block F review). */
  const thumbs = $derived(assets.slice(0, 4).map((a) => stored(tile.id, a.id)?.url ?? null));

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    armed = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) onFiles(files);
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    armed = true;
  }
</script>

<div
  class="group"
  class:armed
  role="group"
  aria-label="Tile group {tile.name}"
  ondragover={onDragOver}
  ondragleave={() => (armed = false)}
  ondrop={onDrop}
>
  <Collapsible
    title={tile.name}
    variant="group"
    bind:open
    {note}
    {hint}
    {onRename}
    extras={preview}
  >
    {#snippet actions()}
      <IconButton icon="trash" label="Delete tile group {tile.name}" onclick={onDelete} />
    {/snippet}

    <div class="body">
      <Advisory when={advisory !== undefined}>{advisory}</Advisory>
      {#each assets as asset, i (asset.id)}
        <TileAsset
          tileId={tile.id}
          {asset}
          position={i + 1}
          percent={percentOf(asset.weight)}
          canDelete={assets.length > 1}
          onInput={(weight) => onWeightInput(asset.id, weight)}
          onCommit={(weight) => onWeight(asset.id, weight)}
          onDelete={() => onDeleteAsset(asset.id)}
        />
      {/each}
      <div class="add">
        <AddBar label="Add variants to {tile.name}" variant="square" haspopup="dialog" onclick={onAdd} />
        <Button label="Reset weights" variant="tertiary" disabled={equal} onclick={onResetWeights} />
      </div>
    </div>
  </Collapsible>
</div>

{#snippet preview()}
  {#each thumbs as url, i (i)}
    {#if url}
      <img class="mini" src={url} alt="" />
    {:else}
      <span class="mini"></span>
    {/if}
  {/each}
{/snippet}

<style>
  .group {
    border-radius: var(--radius);
    outline: var(--focus-w) solid transparent;
    outline-offset: var(--focus-offset);
    transition: outline-color var(--dur-fast) var(--ease);
  }

  /* Image files dragged over the group. */
  .group.armed {
    outline-color: var(--color-ink);
  }

  /* Inside the well: the thumbnails line up with the title above them. */
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--asset-gap);
    padding: var(--space-2) var(--space-4) var(--space-4) var(--space-5);
  }

  /* The square "+" on the left, Reset weights at the far right. */
  .add {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mini {
    display: block;
    box-sizing: border-box;
    width: var(--thumb-sm);
    height: var(--thumb-sm);
    border-radius: var(--radius-xs);
    object-fit: cover;
  }

  span.mini {
    background: var(--color-field);
  }
</style>
