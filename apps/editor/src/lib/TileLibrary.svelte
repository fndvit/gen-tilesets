<!--
  The tile library — `09-editor.md` §10.

  Three display rules from §10.1 and §7.6, all of which are easy to get backwards:

  1. **A Tile's asset list is canonically ordered by id** (**D3**) and gets a
     plain list "with no drag affordance at all". `03` §4.2 sorted assets
     precisely so that dragging a list entry could not reshuffle the canvas, so
     an editor offering a drag would be offering a gesture with no effect. The
     ordering here comes from the package's own `canonicalAssets`, never a local
     sort.

  2. **The opposite rule applies to a palette** (**O6**, §7.6) — order there is
     authored and semantically significant, and it gets a contiguous bar rather
     than a list. Two adjacent lists in the same editor with opposite rules; the
     presentation has to make the difference legible. That one is Step 6b.

  3. **The editor never blocks a rename.** Where two Tiles share a name it
     appends the `Tile.id` to both wherever they appear and raises a §12.2
     advisory. Both are display behaviour; neither touches the file.
-->
<script lang="ts">
  import { canonicalAssets, type Tile, type TileAsset } from "@tileset/core";
  import {
    attach,
    exportPath,
    extensionOf,
    release,
    stored,
    tileNameOf,
  } from "../assets.js";
  import {
    addAssets,
    addTiles,
    deleteAsset,
    deleteTile,
    renameTile,
    setAssetWeight,
    tileReferences,
  } from "../document.js";
  import { parseWeight } from "../fields.js";
  import { nextAssetId, nextIds, nextTileId } from "../ids.js";
  import { session } from "../session.svelte.js";
  import NumericInput from "./NumericInput.svelte";

  const tiles = $derived(session.file.config.tiles);

  /** Failed attaches and refused actions. Session state; never the file. */
  let problems = $state<string[]>([]);
  const report = (message: string) => (problems = [...problems, message]);

  /** Which drop target is armed. Purely visual. */
  let over = $state<string | null>(null);

  /**
   * **E13** — an attach measures and writes all three `meta` keys, or it fails.
   *
   * The measurement happens *before* any transition, so a file that will not
   * decode never reaches the document: "an asset that will not decode is a
   * failed attach, not an attach with two keys missing."
   *
   * **E4 applies here with force: these three keys and nothing else.** `meta` is
   * tempting precisely because `06` **C4** exempts it from strictness, and `07`
   * **R4** makes it additive-only — a key parked there is never removed and
   * never retyped, and travels to every consumer.
   */
  async function buildAsset(tileId: string, assetId: string, file: File): Promise<TileAsset> {
    const { width, height } = await attach(tileId, assetId, file);
    return {
      id: assetId,
      // A UI constant with no spec content: `03` §4.1 admits any weight >= 0,
      // and equal weights are the only starting point that expresses no opinion.
      weight: 1,
      meta: {
        // §10.3: `src` is "the path §11.1 will export to". The editor's own
        // provider bridges it to the object URL for now (§11.2).
        src: exportPath(tileId, assetId, extensionOf(file.name)),
        // §10.3: measured at attach, then frozen. The renderer never measures.
        width,
        height,
      },
    };
  }

  /** Drop on the library background: one Tile per file, per `DECISIONS.md`. */
  async function dropAsTiles(files: File[]): Promise<void> {
    const ids = nextIds(
      files.length,
      tiles.map((t) => t.id),
      nextTileId,
    );
    const built: Tile[] = [];

    for (const [index, file] of files.entries()) {
      const tileId = ids[index]!;
      try {
        // A fresh Tile has no assets yet, so the first id is always `a1`.
        const asset = await buildAsset(tileId, nextAssetId([]), file);
        built.push({ id: tileId, name: tileNameOf(file.name), assets: [asset] });
      } catch (cause) {
        report(`${file.name} — ${String(cause instanceof Error ? cause.message : cause)}`);
      }
    }

    session.apply(addTiles(built));
  }

  /** Drop onto a Tile: the files become further variants of it. */
  async function dropAsAssets(tile: Tile, files: File[]): Promise<void> {
    const ids = nextIds(
      files.length,
      tile.assets.map((a) => a.id),
      nextAssetId,
    );
    const built: TileAsset[] = [];

    for (const [index, file] of files.entries()) {
      try {
        built.push(await buildAsset(tile.id, ids[index]!, file));
      } catch (cause) {
        report(`${file.name} — ${String(cause instanceof Error ? cause.message : cause)}`);
      }
    }

    session.apply(addAssets(tile.id, built));
  }

  function filesFrom(event: DragEvent): File[] {
    const list = event.dataTransfer?.files;
    return list === undefined ? [] : Array.from(list);
  }

  function onDrop(event: DragEvent, tile: Tile | null): void {
    event.preventDefault();
    event.stopPropagation();
    over = null;
    const files = filesFrom(event);
    if (files.length === 0) return;
    void (tile === null ? dropAsTiles(files) : dropAsAssets(tile, files));
  }

  function onDragOver(event: DragEvent, key: string): void {
    event.preventDefault();
    event.stopPropagation();
    over = key;
  }

  /** The file picker behind the "Add files…" button. Same path as a drop. */
  let picker = $state<HTMLInputElement | null>(null);

  function onPick(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const files = input.files === null ? [] : Array.from(input.files);
    if (files.length > 0) void dropAsTiles(files);
    // Cleared so choosing the same file twice in a row fires `change` again.
    input.value = "";
  }

  /**
   * §4.2 / `DECISIONS.md`: refused, with the references named. The check runs
   * here so the refusal can be explained; the transition refuses again on its
   * own terms.
   */
  function removeTile(tile: Tile): void {
    const references = tileReferences(session.file, tile.id);
    if (references.length > 0) {
      report(
        `"${tile.name}" is used by ${references
          .map((r) => `operation ${r.operationId}, palette entry ${r.entry + 1}`)
          .join("; ")}. Remove those entries first.`,
      );
      return;
    }
    for (const asset of tile.assets) release(tile.id, asset.id);
    session.apply(deleteTile(tile.id));
  }

  function removeAsset(tile: Tile, assetId: string): void {
    if (tile.assets.length <= 1) {
      report(`"${tile.name}" must keep at least one asset (03 §4.1). Delete the Tile instead.`);
      return;
    }
    release(tile.id, assetId);
    session.apply(deleteAsset(tile.id, assetId));
  }

  function changeWeight(tile: Tile, assetId: string, text: string): void {
    const before = session.file;
    session.apply(setAssetWeight(tile.id, assetId, text));
    // A refusal is an identity, so this is how the caller learns of one (§10.2).
    if (session.file === before && parseWeight(text) === 0) {
      report(`"${tile.name}" must keep one non-zero weight (09 §10.2, 06 §6).`);
    }
  }

  /**
   * §10.1 — where two Tiles share a name, the `Tile.id` is appended to **both**
   * wherever they appear. `06` §5.3 assigns that clarity here: enforcing
   * uniqueness in the schema "would make the editor block a rename for a reason
   * the engine does not care about".
   */
  const duplicated = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const tile of tiles) counts.set(tile.name, (counts.get(tile.name) ?? 0) + 1);
    return counts;
  });

  const displayName = (tile: Tile): string =>
    (duplicated.get(tile.name) ?? 0) > 1 ? `${tile.name} (${tile.id})` : tile.name;
</script>

<!--
  The list is **not** a drop target. An earlier version made the library
  container itself take new-tile drops, and once it filled with cards there was
  no background left to hit — adding a second Tile became unreachable. The two
  targets are now disjoint objects rather than a container and its children:
  a Tile card takes variants of that Tile, and the zone below always takes new
  Tiles.

  `09` §3.1: this document specifies affordances and their obligations, not
  their appearance. The obligation here is E13's.
-->
<div class="library">
  {#each tiles as tile (tile.id)}
    {@const assets = canonicalAssets(tile)}
    {@const total = assets.reduce((n, a) => n + a.weight, 0)}
    <article
      class="tile"
      class:armed={over === tile.id}
      ondragover={(e) => onDragOver(e, tile.id)}
      ondragleave={() => (over = null)}
      ondrop={(e) => onDrop(e, tile)}
    >
      <header>
        <!--
          The rename is never blocked, and it commits on every keystroke
          because `Tile.name` has no illegal value to be mid-way through:
          `06` **C10** leaves it "not unique, not charset-limited, possibly
          empty". There is nothing for E5's parse gate to gate.
        -->
        <input
          class="name"
          value={tile.name}
          oninput={(e) => session.apply(renameTile(tile.id, e.currentTarget.value))}
          aria-label="Tile name"
          spellcheck="false"
        />
        <code class="id">{tile.id}</code>
        <button class="remove" onclick={() => removeTile(tile)} aria-label="Delete tile">
          ×
        </button>
      </header>

      {#if (duplicated.get(tile.name) ?? 0) > 1}
        <!-- §12.2's sixth advisory. Never blocks, never modifies the file. -->
        <p class="advisory">
          Shares a name with another Tile — shown as <code>{displayName(tile)}</code>.
          Legal: <strong>D1</strong> keeps a name collision out of output.
        </p>
      {/if}

      <!--
        A plain list, ordered by id, with **no drag affordance** (D3, §10.1).
        `canonicalAssets` is the package's own ordering, not a local sort.
      -->
      <ul class="assets">
        {#each assets as asset (asset.id)}
          {@const file = stored(tile.id, asset.id)}
          <li>
            {#if file}
              <img src={file.url} alt="" />
            {:else}
              <span class="missing" title="No attached file in this session">?</span>
            {/if}

            <div class="meta">
              <code>{asset.id}</code>
              {#if file}
                <!-- E13's frozen measurement. Nothing in V1 reads it but §12.2. -->
                <span class="dims">{file.width}×{file.height}</span>
                {#if file.width !== file.height}
                  <span class="advisory-inline" title="07 R8">centre-cropped</span>
                {/if}
              {/if}
            </div>

            <NumericInput
              label="weight"
              step="1"
              value={asset.weight}
              parse={parseWeight}
              onCommit={(t) => changeWeight(tile, asset.id, t)}
            />

            <span class="share">
              {#if asset.weight === 0}
                <em title="03 §4.1 — legal, and never chosen">never</em>
              {:else}
                {Math.round((asset.weight / total) * 100)}%
              {/if}
            </span>

            <button
              class="remove"
              onclick={() => removeAsset(tile, asset.id)}
              aria-label="Delete asset"
            >
              ×
            </button>
          </li>
        {/each}
      </ul>
    </article>
  {/each}
</div>

<!--
  Always present, whether the library is empty or full, so a second Tile is
  never unreachable. The button is the same code path — dropping is not always
  the convenient gesture, and neither is specified anywhere: `09` §10.3 fixes
  what an attach *writes* (**E13**) and leaves what starts one alone.
-->
<div
  class="newzone"
  class:armed={over === "new"}
  role="region"
  aria-label="Drop image files here to create new tiles"
  ondragover={(e) => onDragOver(e, "new")}
  ondragleave={() => (over = null)}
  ondrop={(e) => onDrop(e, null)}
>
  <span>
    {tiles.length === 0 ? "Drop image files here" : "Drop here for more Tiles"}
    <em>one Tile each · drop onto a Tile to add variants</em>
  </span>
  <button onclick={() => picker?.click()}>Add files…</button>
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
</div>

{#if problems.length > 0}
  <ul class="problems">
    {#each problems as problem, i (i)}
      <li>{problem}</li>
    {/each}
    <li><button onclick={() => (problems = [])}>clear</button></li>
  </ul>
{/if}

<style>
  /* The panel shell and its heading belong to `lib/Section.svelte`, which wraps
     this component in the sidebar. */

  .library {
    display: grid;
    gap: 0.5rem;
  }

  .library:not(:empty) {
    margin-bottom: 0.5rem;
  }

  /* Always present, so a second Tile is never unreachable. */
  .newzone {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border: 1px dashed #cbd5e0;
    border-radius: 6px;
    padding: 0.6rem 0.7rem;
    font-size: 0.8rem;
    color: #a0aec0;
  }

  .newzone.armed {
    border-color: #3182ce;
    background: #eef4fb;
    color: #2b6cb0;
  }

  .newzone em {
    display: block;
    font-style: normal;
    font-size: 0.7rem;
    color: #b5c0cf;
  }

  .newzone button {
    background: #cbd5e0;
    border: 1px solid #a0aec0;
    color: #1a202c;
    border-radius: 4px;
    padding: 0.25rem 0.55rem;
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .picker {
    display: none;
  }

  .tile {
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 0.5rem 0.6rem;
  }

  .tile.armed {
    border-color: #3182ce;
  }

  header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .name {
    flex: 1;
    background: transparent;
    border: 1px solid transparent;
    color: inherit;
    border-radius: 3px;
    padding: 0.15rem 0.3rem;
    font: inherit;
    font-size: 0.85rem;
    min-width: 0;
  }

  .name:hover,
  .name:focus {
    border-color: #cbd5e0;
    background: #f4f6f9;
    outline: none;
  }

  .id {
    font-size: 0.7rem;
    color: #a0aec0;
  }

  .remove {
    background: transparent;
    border: 0;
    color: #a0aec0;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0 0.25rem;
  }

  .remove:hover {
    color: #c53030;
  }

  .advisory {
    margin: 0.35rem 0 0;
    font-size: 0.7rem;
    color: #8a6d1f;
  }

  .assets {
    list-style: none;
    margin: 0.4rem 0 0;
    padding: 0;
    display: grid;
    gap: 0.3rem;
  }

  .assets li {
    display: grid;
    grid-template-columns: 28px 1fr 9rem 3rem auto;
    align-items: center;
    gap: 0.5rem;
  }

  .assets img,
  .missing {
    width: 28px;
    height: 28px;
    border-radius: 3px;
    background: #ffffff;
    object-fit: cover;
    display: grid;
    place-items: center;
    color: #a0aec0;
    font-size: 0.75rem;
  }

  .meta {
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
    font-size: 0.7rem;
    color: #a0aec0;
    min-width: 0;
  }

  .dims {
    color: #a0aec0;
  }

  .advisory-inline {
    color: #8a6d1f;
  }

  .share {
    font-size: 0.72rem;
    color: #5a6b80;
    text-align: right;
  }

  .share em {
    font-style: normal;
    color: #a0aec0;
  }

  .problems {
    list-style: none;
    margin: 0.75rem 0 0;
    padding: 0;
    display: grid;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: #c53030;
  }

  .problems button {
    background: #cbd5e0;
    border: 1px solid #a0aec0;
    color: inherit;
    border-radius: 4px;
    padding: 0.15rem 0.45rem;
    font: inherit;
    font-size: 0.7rem;
    cursor: pointer;
  }
</style>
