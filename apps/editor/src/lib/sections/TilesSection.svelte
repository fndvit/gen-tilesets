<!--
  The Figma *Tiles* section: the tile library (`09-editor.md` §10), where
  pictures enter the editor.

  One `TileGroup` per Tile, 4px apart, then the "+" bar that adds a group.
  **N files make one group** (redesign Block D, replacing `DECISIONS.md`
  D13's one-Tile-per-file): the files become its variants `a1…aN`, and it is
  named after the first file that attached. Dropping files on the section,
  outside any group, does the same. Dropping on a group, or its square "+",
  adds variants to it.

  **Refusals are reported after the attempt, in a `Popup`**, never in the
  layout (Block C rule): a file that will not attach, a Tile an operation
  still uses (§4.2, D15), the last variant (`03` §4.1), the last non-zero
  weight (§10.2, `06` §6). Each check runs here so the refusal can be
  explained; the transition refuses again on its own terms.

  **Names are unique in the editor** (Pol, Block D, overriding `09` §10.1's
  "never blocks a rename"). A rename to a name another group has, ignoring case
  and spaces, is refused with a popup, and a new group from `grass.png` becomes
  `grass 2` when `grass` is taken. The schema still allows duplicates (`06`
  §5.3), so an imported file may hold some: those show their id after the
  title, with a hint (§12.2's sixth advisory).
-->
<script lang="ts">
  import type { Tile } from "@vit-foundation/gen-tilesets";
  import { attachAll, heldTileIds, tileNameOf } from "../../assets.js";
  import {
    addAssets,
    addTiles,
    deleteAsset,
    deleteTile,
    renameTile,
    resetAssetWeights,
    setAssetWeight,
    tileNameTaken,
    tileReferences,
    uniqueTileName,
  } from "../../document.js";
  import { nextTileId } from "../../ids.js";
  import { session } from "../../session.svelte.js";
  import Section from "../Section.svelte";
  import TileGroup from "../tiles/TileGroup.svelte";
  import AddBar from "../ui/AddBar.svelte";
  import Popup from "../ui/Popup.svelte";

  const tiles = $derived(session.file.config.tiles);

  /** What the last action could not do. Session state; never the file. */
  let problems = $state<string[]>([]);
  let reporting = $state(false);

  function report(messages: string[]): void {
    if (messages.length === 0) return;
    problems = messages;
    reporting = true;
  }

  /** Files dragged over the section background. Purely visual. */
  let armed = $state(false);

  /**
   * Tile ids handed out to an attach still in flight. Two drops in quick
   * succession would otherwise both allocate before either commits, and
   * `addTiles` does not check for duplicates.
   */
  const reserved = new Set<string>();

  async function addGroup(files: File[]): Promise<void> {
    // The store's ids too: a deleted Tile's bytes stay for undo (assets.ts).
    const tileId = nextTileId([...tiles.map((t) => t.id), ...heldTileIds(), ...reserved]);
    reserved.add(tileId);
    const { assets, attached, failures } = await attachAll(tileId, [], files).finally(() =>
      reserved.delete(tileId),
    );
    const first = attached[0];
    if (first !== undefined) {
      // Read after the await, so a group committed meanwhile is counted too.
      const name = uniqueTileName(session.file, tileNameOf(first.name));
      session.apply(addTiles([{ id: tileId, name, assets }]));
    }
    report(failures);
  }

  async function addVariants(tile: Tile, files: File[]): Promise<void> {
    const { assets, failures } = await attachAll(tile.id, tile.assets.map((a) => a.id), files);
    session.apply(addAssets(tile.id, assets));
    report(failures);
  }

  /** One hidden file picker. `target` says what the chosen files are for. */
  let picker = $state<HTMLInputElement | null>(null);
  let target: Tile | null = null;

  function pick(tile: Tile | null): void {
    target = tile;
    picker?.click();
  }

  function onPick(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const files = input.files === null ? [] : Array.from(input.files);
    if (files.length > 0) void (target === null ? addGroup(files) : addVariants(target, files));
    // Cleared so choosing the same file twice in a row fires `change` again.
    input.value = "";
  }

  function rename(tile: Tile, name: string): void {
    if (tileNameTaken(session.file, name, tile.id)) {
      report([`Another group is already called "${name}". Choose a different name.`]);
      return;
    }
    session.apply(renameTile(tile.id, name));
  }

  function removeTile(tile: Tile): void {
    const references = tileReferences(session.file, tile.id);
    if (references.length > 0) {
      report([
        `"${tile.name}" is used by ${references
          .map((r) => `operation ${r.operationId}, palette entry ${r.entry + 1}`)
          .join("; ")}. Remove those entries first.`,
      ]);
      return;
    }
    // The bytes are not released: undo can bring the Tile back (assets.ts).
    session.apply(deleteTile(tile.id));
  }

  /** A refused transition returns the same file, which is how the caller learns of it. */
  function refused(transition: (file: typeof session.file) => typeof session.file): boolean {
    const before = session.file;
    session.apply(transition);
    return session.file === before;
  }

  function removeAsset(tile: Tile, assetId: string): void {
    if (tile.assets.length <= 1) {
      report([`"${tile.name}" must keep at least one variant. Delete the group instead.`]);
      return;
    }
    if (refused(deleteAsset(tile.id, assetId))) {
      report([`"${tile.name}" must keep one variant with a weight above 0.`]);
    }
  }

  function changeWeight(tile: Tile, assetId: string, weight: number): void {
    if (refused(setAssetWeight(tile.id, assetId, String(weight))) && weight === 0) {
      report([`"${tile.name}" must keep one variant with a weight above 0.`]);
    }
  }

  /** Only an imported file can hold these: the editor refuses to make one. */
  const isDuplicate = (tile: Tile) => tileNameTaken(session.file, tile.name, tile.id);

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    armed = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) void addGroup(files);
  }
</script>

<Section title="Tiles">
  <div
    class="library"
    class:armed
    role="region"
    aria-label="Tile groups. Drop image files here to add a group."
    ondragover={(event) => {
      event.preventDefault();
      armed = true;
    }}
    ondragleave={() => (armed = false)}
    ondrop={onDrop}
  >
    {#each tiles as tile (tile.id)}
      <TileGroup
        {tile}
        note={isDuplicate(tile) ? `(${tile.id})` : undefined}
        hint={isDuplicate(tile)
          ? "This file was imported with two groups of the same name, so both show their id. Rename one to tell them apart."
          : undefined}
        onRename={(name) => rename(tile, name)}
        onDelete={() => removeTile(tile)}
        onWeight={(assetId, weight) => changeWeight(tile, assetId, weight)}
        onDeleteAsset={(assetId) => removeAsset(tile, assetId)}
        onResetWeights={() => session.apply(resetAssetWeights(tile.id))}
        onAdd={() => pick(tile)}
        onFiles={(files) => void addVariants(tile, files)}
      />
    {/each}
    <AddBar label="Add tile group" onclick={() => pick(null)} />
  </div>

  <input
    class="picker"
    type="file"
    multiple
    accept="image/*"
    bind:this={picker}
    onchange={onPick}
    tabindex="-1"
    aria-hidden="true"
  />
</Section>

<Popup title="Tiles" bind:open={reporting} onClose={() => (problems = [])}>
  {#each problems as problem, i (i)}
    <p class="t-body">{problem}</p>
  {/each}
</Popup>

<style>
  .library {
    display: grid;
    gap: var(--space-2);
    outline: var(--focus-w) solid transparent;
    outline-offset: var(--focus-offset);
    transition: outline-color var(--dur-fast) var(--ease);
  }

  /* Image files dragged over the section, outside any group. */
  .library.armed {
    outline-color: var(--color-ink);
  }

  .picker {
    display: none;
  }
</style>
