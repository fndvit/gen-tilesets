<!--
  The palette builder — `09-editor.md` §7.6, resolving `04` open question 3.

  **`04` **O6** makes palette entry order authored and semantically significant**,
  against **D3**, which canonicalizes a Tile's asset list precisely so that
  dragging a list entry cannot reshuffle the canvas. Two adjacent lists in the
  same editor, with opposite rules. §7.6: "The presentation has to make the
  difference legible or the author will learn one and apply it to the other."

  **So the palette is a single contiguous bar, segmented by weight. Not a list of
  rows.** The reason is `04` §6.4's: under a banded Source, threshold adjacency
  *is* spatial adjacency — "water has to sit next to sand and not next to grass,
  and order is the only way the author says so". A bar shows adjacency and
  proportion in one object, and shows the thresholds where the segments meet.
  Reordering is dragging a segment along the bar, "which reads as rearranging a
  sequence rather than sorting a list".

  A Tile's asset list, by contrast, gets no drag affordance at all (§10.1) — see
  `TileLibrary.svelte`.
-->
<script lang="ts">
  import { paletteTotal, type PaletteEntry, type Tile } from "@fndvit/gen-tilesets";

  interface Props {
    palette: PaletteEntry[];
    tiles: Tile[];
    /** §12.2's eighth advisory fires under a uniform Source. */
    sourceType: string | null;
    onChange: (palette: PaletteEntry[]) => void;
  }

  let { palette, tiles, sourceType, onChange }: Props = $props();

  /** `04` §6.3's `total`. Taken from the package, not recomputed. */
  const total = $derived(paletteTotal(palette));

  let selected = $state(0);

  const nameOf = (tileId: string | null): string =>
    tileId === null ? "clear" : (tiles.find((t) => t.id === tileId)?.name ?? tileId);

  /** A stable colour per entry, so a segment stays recognisable while dragging. */
  const hueOf = (tileId: string | null): string => {
    if (tileId === null) return "#e2e8f0";
    let h = 0;
    for (const ch of tileId) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `hsl(${h} 45% 42%)`;
  };

  function replace(next: PaletteEntry[]): void {
    onChange(next);
  }

  function move(from: number, to: number): void {
    if (to < 0 || to >= palette.length || from === to) return;
    const next = [...palette];
    const [entry] = next.splice(from, 1);
    next.splice(to, 0, entry!);
    replace(next);
    selected = to;
  }

  /**
   * Dragging a segment along the bar. The drop index is whichever segment the
   * pointer is over, so the sequence rearranges live.
   */
  let bar = $state<HTMLElement | null>(null);
  let dragging = $state<number | null>(null);

  function indexAt(clientX: number): number {
    if (bar === null || total <= 0) return 0;
    const box = bar.getBoundingClientRect();
    const x = (clientX - box.left) / box.width;
    let cumulative = 0;
    for (const [index, entry] of palette.entries()) {
      cumulative += entry.weight / total;
      if (x <= cumulative) return index;
    }
    return palette.length - 1;
  }

  function onPointerDown(event: PointerEvent, index: number): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragging = index;
    selected = index;
  }

  function onPointerMove(event: PointerEvent): void {
    if (dragging === null) return;
    const to = indexAt(event.clientX);
    if (to !== dragging) {
      move(dragging, to);
      dragging = to;
    }
  }

  function onPointerUp(): void {
    dragging = null;
  }

  function setWeight(index: number, text: string): void {
    const n = Number(text);
    // `06` §6: weight >= 0, finite. Zero is legal -- "listed but never chosen".
    if (!Number.isFinite(n) || n < 0) return;
    const next = palette.map((e, i) => (i === index ? { ...e, weight: n } : e));
    // `06` §7.3: a palette's weights sum > 0, or nothing can ever win the walk.
    if (paletteTotal(next) <= 0) return;
    replace(next);
  }

  function setTile(index: number, tileId: string | null): void {
    replace(palette.map((e, i) => (i === index ? { ...e, tileId } : e)));
  }

  function add(tileId: string | null): void {
    replace([...palette, { tileId, weight: 1 }]);
    selected = palette.length;
  }

  function remove(index: number): void {
    // `06` §7.3: at least one entry.
    if (palette.length <= 1) return;
    const next = palette.filter((_, i) => i !== index);
    if (paletteTotal(next) <= 0) return;
    replace(next);
    selected = Math.min(selected, next.length - 1);
  }

  /**
   * The selected entry, or `undefined` if the selection is stale — `palette`
   * shrinks when an entry is removed. Derived in the script rather than with
   * `{@const}` in the markup, which Svelte only allows as an immediate child of
   * a block.
   */
  const current = $derived(palette[selected]);

  /** §12.2's eighth advisory — `04` §6.4's *accepted, not a defect*. */
  const orderMeaningless = $derived(sourceType === "random" && palette.length > 1);
</script>

<div class="palette">
  <div class="row">
    <span class="label">palette</span>
    <span class="hint">order is meaningful — <code>04</code> <strong>O6</strong></span>
  </div>

  <!--
    Weights are the segment widths. A zero-weight entry is legal and means
    *listed but never chosen* (`03` §4.1), so §7.6 renders it "as a zero-width
    marker rather than disappearing — vanishing would make an entry that still
    exists in the file invisible in the editor".
  -->
  <div
    class="bar"
    role="group"
    aria-label="Palette, in authored order"
    bind:this={bar}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
  >
    {#each palette as entry, index (index)}
      {@const share = total > 0 ? entry.weight / total : 0}
      <button
        class="segment"
        class:on={selected === index}
        class:zero={entry.weight === 0}
        class:null={entry.tileId === null}
        style="flex-grow: {share}; background: {hueOf(entry.tileId)};"
        onpointerdown={(e) => onPointerDown(e, index)}
        onclick={() => (selected = index)}
        title="{nameOf(entry.tileId)} — weight {entry.weight}"
        aria-label="Palette entry {index + 1}: {nameOf(entry.tileId)}"
      >
        {#if share > 0.12}<span>{nameOf(entry.tileId)}</span>{/if}
      </button>
    {/each}
  </div>

  <p class="thresholds">
    {#each palette as entry, index (index)}
      <span class:on={selected === index}>
        {nameOf(entry.tileId)}
        <em>{total > 0 ? Math.round((entry.weight / total) * 100) : 0}%</em>
      </span>
    {/each}
  </p>

  {#if current !== undefined}
    <div class="entry">
      <select
        value={current.tileId ?? ""}
        onchange={(e) => setTile(selected, e.currentTarget.value === "" ? null : e.currentTarget.value)}
        aria-label="Tile for this entry"
      >
        <!--
          **`null` is an ordinary palette entry** meaning *clear this cell*
          (`04` §6.3, `02` §8.1). It is offered here alongside the Tiles, and it
          is **not** a Tile in the library — `02` §8.1 is explicit that "empty"
          never appears as a selectable entry there.
        -->
        <option value="">∅ clear this cell</option>
        {#each tiles as tile (tile.id)}
          <option value={tile.id}>{tile.name} ({tile.id})</option>
        {/each}
      </select>

      <input
        type="number"
        min="0"
        step="1"
        value={current.weight}
        oninput={(e) => setWeight(selected, e.currentTarget.value)}
        aria-label="Weight"
      />

      <button onclick={() => move(selected, selected - 1)} aria-label="Move earlier">←</button>
      <button onclick={() => move(selected, selected + 1)} aria-label="Move later">→</button>
      <button
        class="remove"
        disabled={palette.length <= 1}
        onclick={() => remove(selected)}
        aria-label="Remove entry"
      >
        ×
      </button>
    </div>
  {/if}

  <div class="add">
    <button onclick={() => add(tiles[0]?.id ?? null)}>+ entry</button>
    <button onclick={() => add(null)}>+ clear</button>
    {#if tiles.length === 0}
      <span class="hint">No Tiles yet — only <code>∅ clear</code> is available.</span>
    {/if}
  </div>

  {#if orderMeaningless}
    <!--
      §12.2's eighth advisory, from `04` §6.4's *accepted, not a defect*: "under a
      `random` Source, reordering a palette reshuffles the canvas with no visible
      reason, because uniform values make adjacency meaningless. The bar
      presentation implies a spatial meaning that a `random` Source does not
      deliver." §7.6 carries it as an advisory rather than giving the editor two
      palette presentations.
    -->
    <p class="advisory">
      Under <code>random</code> the values are uniform, so adjacency means nothing —
      reordering reshuffles the canvas with no visible reason. The bar implies a spatial
      meaning this Source does not deliver (<code>04</code>&nbsp;§6.4).
    </p>
  {/if}
</div>

<style>
  .palette {
    display: grid;
    gap: 0.4rem;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
  }

  .label {
    font-size: 0.8rem;
    color: #1a202c;
  }

  .hint {
    font-size: 0.68rem;
    color: #a0aec0;
  }

  .bar {
    display: flex;
    height: 2rem;
    border-radius: 4px;
    overflow: hidden;
    background: #f7fafc;
    touch-action: none;
  }

  .segment {
    flex-basis: 0;
    min-width: 0;
    border: 0;
    border-right: 1px solid #f4f6f9;
    color: #f7fafc;
    font: inherit;
    font-size: 0.7rem;
    cursor: grab;
    padding: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  .segment:active {
    cursor: grabbing;
  }

  .segment.on {
    box-shadow: inset 0 0 0 2px #1a202c;
  }

  /* A zero-weight entry is legal and must stay visible (§7.6). */
  .segment.zero {
    flex: none;
    width: 4px;
    background-image: repeating-linear-gradient(
      45deg,
      #a0aec0 0 2px,
      transparent 2px 4px
    ) !important;
  }

  .segment.null {
    background-image: repeating-linear-gradient(
      -45deg,
      #cbd5e0 0 6px,
      #e2e8f0 6px 12px
    ) !important;
    color: #5a6b80;
  }

  .thresholds {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0;
    font-size: 0.68rem;
    color: #a0aec0;
  }

  .thresholds span.on {
    color: #4a5568;
  }

  .thresholds em {
    font-style: normal;
    color: #5a6b80;
  }

  .entry {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }

  select,
  input {
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    color: inherit;
    border-radius: 4px;
    padding: 0.22rem 0.3rem;
    font: inherit;
    font-size: 0.75rem;
    min-width: 0;
  }

  select {
    flex: 1;
  }

  input {
    width: 3.5rem;
  }

  .entry button,
  .add button {
    background: #cbd5e0;
    border: 1px solid #a0aec0;
    color: #1a202c;
    border-radius: 4px;
    padding: 0.2rem 0.45rem;
    font: inherit;
    font-size: 0.72rem;
    cursor: pointer;
  }

  .entry button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .remove:hover:not(:disabled) {
    color: #c53030;
  }

  .add {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }

  .advisory {
    margin: 0;
    font-size: 0.68rem;
    line-height: 1.45;
    color: #8a6d1f;
  }

  code {
    font-family: ui-monospace, monospace;
    color: #2b6cb0;
  }
</style>
