<!--
  The Selection step's layers (B-033, Block 3). An Operation's `selection` is a
  list of layers, ORed: the operation affects every cell any layer selects.

  **One layer looks like the step always did**: the glyph grid and the chosen
  option's well, then "+ Add selection layer". A single-layer author sees one
  new row and nothing else (Pol chose this layout over a chip strip,
  2026-11-12).

  **Two or more are an accordion**, one row per layer: a small glyph, "Layer
  N", its label and a mono summary (`layerSummary`), and a × beside it. Only the
  open row (`draft.activeLayer`) unfolds to the glyph grid and well, so each
  layer's settings stay readable as a summary while another is edited. The
  open layer is also the one the preview's brush and drag edit (`App.svelte`).

  **No reordering.** Order only moves the scatter of Random layers (they are
  channelled by position, Block 1), so a reorder control would offer a change
  the author cannot see the point of. It can come with B-034, where order means
  something.

  The state changes are `addLayer`, `removeLayer` and `openLayer` in
  `draft.svelte.ts`, where a test can reach them (CLAUDE.md, Testing).
-->
<script lang="ts">
  import { tick, type Snippet } from "svelte";
  import { selections } from "@vit-foundation/gen-tilesets";
  import { selectionParamHints } from "../../controls/param-hints.js";
  import ParamFields from "../../controls/ParamFields.svelte";
  import {
    addLayer,
    defaultParams,
    openLayer,
    removeLayer,
    shiftsScatter,
    type Draft,
    type DraftLayer,
  } from "../../draft.svelte.js";
  import AddBar from "../ui/AddBar.svelte";
  import GlyphGrid from "../ui/GlyphGrid.svelte";
  import Hint from "../ui/Hint.svelte";
  import IconButton from "../ui/IconButton.svelte";
  import { labelFor, layerSummary } from "./labels.js";
  import { SELECTION_GLYPHS } from "./selection-glyphs.js";

  interface Item {
    value: string;
    label: string;
    disabled?: boolean;
    src?: string;
  }

  interface Props {
    draft: Draft;
    /** The glyph grid's cells, with coordinate-bound types already disabled where a breakpoint resizes. */
    items: Item[];
    /** `OperationBody`'s caption-over-well, so a layer's fields sit in the same well every step uses. */
    options: Snippet<[string, Snippet]>;
  }

  let { draft, items, options }: Props = $props();

  const base = $props.id();

  /** Each row's header, to take focus after a removal. */
  const heads: HTMLButtonElement[] = $state([]);
  let addRow = $state<HTMLDivElement | undefined>(undefined);

  /**
   * Choosing a type materializes every parameter at its schema default (§7.1,
   * `06` §5.1), so the fields show exactly what the file will contain.
   */
  function choose(layer: DraftLayer, name: string): void {
    layer.type = name;
    layer.params = defaultParams(selections.get(name).params);
  }

  /**
   * Removes a layer and puts focus somewhere the author can see: the header of
   * the row now open, or, once one layer is left and the rows are gone, the
   * Add row. The pressed × is gone with its row, so leaving focus alone would
   * drop it to `<body>` (2.4.3).
   */
  async function remove(i: number): Promise<void> {
    const open = removeLayer(draft, i);
    await tick();
    if (draft.layers.length > 1) heads[open]?.focus();
    else addRow?.querySelector("button")?.focus();
  }

  const nameOf = (layer: DraftLayer): string =>
    layer.type === null ? "no type yet" : labelFor(layer.type);
</script>

{#if draft.layers.length === 1}
  {@render editor(draft.layers[0]!)}
{:else}
  <ol class="layers" aria-label="Selection layers">
    {#each draft.layers as layer, i (layer)}
      {@const open = i === draft.activeLayer}
      {@const src = layer.type === null ? undefined : SELECTION_GLYPHS[layer.type]}
      <li class="layer" class:open>
        <div class="row">
          <button
            type="button"
            class="head"
            aria-expanded={open}
            aria-controls="{base}-{i}"
            bind:this={heads[i]}
            onclick={() => openLayer(draft, i)}
          >
            {#if src}
              <img class="glyph" {src} alt="" />
            {:else}
              <span class="glyph blank" class:untyped={layer.type === null} aria-hidden="true"></span>
            {/if}
            <span class="number t-console">Layer {i + 1}</span>
            <span class="name t-title" class:unset={layer.type === null}>
              {layer.type === null ? "Not set" : labelFor(layer.type)}
            </span>
            <span class="summary t-console">{layerSummary(layer)}</span>
          </button>
          <!--
            Removing renumbers the layers after this one, and a Random layer's
            scatter follows its number (Block 1), so its picture changes. Said
            only when it is true (Pol, Block 3).
          -->
          <Hint text={shiftsScatter(draft, i) ? "Random layers after this one get a new scatter." : undefined}>
            {#snippet children()}
              <IconButton
                icon="close"
                label="Remove layer {i + 1} ({nameOf(layer)})"
                onclick={() => void remove(i)}
              />
            {/snippet}
          </Hint>
        </div>
        {#if open}
          <div class="body" id="{base}-{i}">
            {@render editor(layer)}
          </div>
        {/if}
      </li>
    {/each}
  </ol>
{/if}

<div class="add" bind:this={addRow}>
  <AddBar label="Add selection layer" onclick={() => addLayer(draft)} />
</div>

<!--
  One layer's picker and fields. **Invariant O2** — a Selection is a pure
  function of `(x, y)` and its own parameters; it never reads the accumulated
  `TileState`.
-->
{#snippet editor(layer: DraftLayer)}
  <GlyphGrid {items} value={layer.type} onChange={(name) => choose(layer, name)} label="Selection" />
  {#if layer.type !== null}
    {@const type = layer.type}
    {@const schema = selections.get(type).params}
    {#if Object.keys(schema).length > 0}
      {#snippet fields()}
        <ParamFields
          {schema}
          values={layer.params}
          hints={selectionParamHints(type)}
          onChange={(name, value) => (layer.params[name] = value)}
        />
      {/snippet}
      {@render options(type, fields)}
    {/if}
  {/if}
{/snippet}

<style>
  .layers {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* As a step row: a wash on hover, the accent wash while open (DESIGN_SYSTEM.md, Interaction). */
  .head {
    display: flex;
    flex: 1 1 0;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
    min-height: 32px;
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color var(--dur-fast) var(--ease);
  }

  .layer:not(.open) .head:hover {
    background: var(--color-hover);
  }

  .open .head {
    background: var(--color-accent-wash);
    cursor: default;
  }

  .glyph {
    flex: none;
    box-sizing: border-box;
    width: var(--step-dot);
    height: var(--step-dot);
  }

  .blank {
    border: var(--rule-w) solid var(--color-edge);
    border-radius: var(--radius-xs);
  }

  .blank.untyped {
    border-style: dashed;
  }

  .number {
    flex: none;
    color: var(--color-muted);
    text-box: none;
  }

  .name {
    flex: none;
    line-height: var(--leading-title);
    text-box: none;
  }

  .open .name {
    color: var(--color-accent);
  }

  .name.unset {
    color: var(--color-muted);
  }

  .summary {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    color: var(--color-muted);
    text-align: right;
    text-box: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* The open layer's picker and well, under its header. */
  .body {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-5) 0 var(--space-6) var(--space-3);
  }
</style>
