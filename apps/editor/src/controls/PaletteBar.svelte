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
  `tiles/TileGroup.svelte`.
-->
<script lang="ts">
  import { paletteTotal, type PaletteEntry, type Tile } from "@vit-foundation/gen-tilesets";
  import NumericInput from "../lib/NumericInput.svelte";
  import Button from "../lib/ui/Button.svelte";
  import FieldRow from "../lib/ui/FieldRow.svelte";
  import Hint from "../lib/ui/Hint.svelte";

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
    // Read before `replace`: the parent can hand back the longer palette at once,
    // and `palette.length` afterwards would point one past the new entry.
    const index = palette.length;
    replace([...palette, { tileId, weight: 1 }]);
    selected = index;
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

  /**
   * The label's hint: order matters (`04` **O6**), and under `random` it does
   * not, which is §12.2's eighth advisory. "Under a `random` Source, reordering
   * a palette reshuffles the canvas with no visible reason, because uniform
   * values make adjacency meaningless" (`04` §6.4); §7.6 carries it as an
   * advisory rather than giving the editor two palette presentations.
   */
  const paletteHint = $derived(
    orderMeaningless
      ? "Under the Random source every value is equally likely, so neighbours mean nothing: reordering only reshuffles the canvas."
      : "Order matters: under a banded source, entries next to each other on the bar end up next to each other on the canvas. Drag a segment to move it.",
  );

  const tileOptions = $derived([
    // **`null` is an ordinary palette entry** meaning *clear this cell* (`04`
    // §6.3, `02` §8.1). It is offered alongside the Tiles and is **not** a Tile
    // in the library: "empty" never appears as a selectable entry there.
    { value: "", label: "clear" },
    ...tiles.map((t) => ({ value: t.id, label: t.name })),
  ]);

  function parseWeight(text: string): number | null {
    const n = Number(text.trim());
    return text.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
  }
</script>

<div class="palette">
  <Hint text={paletteHint}>
    {#snippet children()}
      <span class="t-label">Palette</span>
    {/snippet}
  </Hint>

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
        type="button"
        class="segment t-xs"
        class:on={selected === index}
        class:zero={entry.weight === 0}
        class:null={entry.tileId === null}
        style:flex-grow={share}
        onpointerdown={(e) => onPointerDown(e, index)}
        onclick={() => (selected = index)}
        aria-label="Palette entry {index + 1}: {nameOf(entry.tileId)}, weight {entry.weight}"
        aria-pressed={selected === index}
      >
        {#if share > 0.12}<span>{nameOf(entry.tileId)}</span>{/if}
      </button>
    {/each}
  </div>

  <p class="thresholds t-console">
    {#each palette as entry, index (index)}
      <span class:on={selected === index}>
        {nameOf(entry.tileId)} {total > 0 ? Math.round((entry.weight / total) * 100) : 0}%
      </span>
    {/each}
  </p>

  {#if current !== undefined}
    <FieldRow label="Tile" align="center">
      {#snippet children()}
        <select
          class="select t-body"
          value={current.tileId ?? ""}
          onchange={(e) => setTile(selected, e.currentTarget.value === "" ? null : e.currentTarget.value)}
          aria-label="Tile for entry {selected + 1}"
        >
          {#each tileOptions as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      {/snippet}
    </FieldRow>

    <NumericInput
      label="Weight"
      value={current.weight}
      parse={parseWeight}
      onCommit={(text) => setWeight(selected, text)}
      hint="Zero keeps the entry listed but never chosen. The weights cannot all be zero."
    />

    <div class="actions">
      <Button label="Earlier" disabled={selected === 0} onclick={() => move(selected, selected - 1)} />
      <Button
        label="Later"
        disabled={selected === palette.length - 1}
        onclick={() => move(selected, selected + 1)}
      />
      <Button label="Remove" disabled={palette.length <= 1} onclick={() => remove(selected)} />
    </div>
  {/if}

  <!-- With no Tiles yet, a new entry is `clear`, the only one available. -->
  <div class="actions">
    <Button label="+ Entry" onclick={() => add(tiles[0]?.id ?? null)} />
    <Button label="+ Clear" onclick={() => add(null)} />
  </div>
</div>

<style>
  /* One column that never grows past the body (the implicit `auto` column would). */
  .palette {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
    color: var(--color-ink);
  }

  .bar {
    display: flex;
    height: var(--thumb);
    border: var(--rule);
    background: var(--color-paper);
    touch-action: none;
  }

  .segment {
    flex-basis: 0;
    min-width: 0;
    padding: 0 var(--space-2);
    border: 0;
    border-right: var(--rule-w) solid var(--color-paper);
    background: var(--color-ink);
    color: var(--color-paper);
    overflow: hidden;
    white-space: nowrap;
    cursor: grab;
  }

  .segment:last-child {
    border-right: 0;
  }

  .segment:active {
    cursor: grabbing;
  }

  /* An empty entry clears cells, so it reads as paper, not as a tile. */
  .segment.null {
    background: var(--color-paper);
    color: var(--color-ink);
    border-right-color: var(--color-ink);
  }

  /* Selected and hover = the glyph look: inactive fill, ink text. */
  .segment:hover,
  .segment.on {
    background: var(--color-inactive);
    color: var(--color-ink);
  }

  /* A zero-weight entry is legal and must stay visible (§7.6). */
  .segment.zero {
    flex: none;
    width: var(--space-2);
    padding: 0;
  }

  .thresholds {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin: 0;
  }

  /* Inactive grey is unreadable on paper, so the selected share is underlined instead. */
  .thresholds .on {
    text-decoration: underline;
  }

  .select {
    width: var(--field-w);
    padding: 0;
    border: 0;
    border-bottom: var(--rule);
    border-radius: var(--radius);
    background: transparent;
    color: var(--color-ink);
    cursor: pointer;
  }

  /* As the numeric fields: hover and focus thicken the underline. */
  .select:hover,
  .select:focus-visible {
    outline: none;
    border-bottom-width: var(--focus-w);
    margin-bottom: calc(var(--rule-w) - var(--focus-w));
  }

  .actions {
    display: flex;
    gap: var(--chip-gap);
  }
</style>
