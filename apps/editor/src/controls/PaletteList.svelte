<!--
  The palette list — `09-editor.md` §7.6, resolving `04` open question 3;
  `DESIGN_SYSTEM.md` *Palette*.

  **`04` **O6** makes palette entry order authored and semantically significant**,
  against **D3**, which canonicalizes a Tile's asset list precisely so that
  dragging a list entry cannot reshuffle the canvas. Two adjacent lists in the
  same editor, with opposite rules. §7.6: "The presentation has to make the
  difference legible or the author will learn one and apply it to the other."

  §7.6 chose a single bar for that. The bar was hard to grasp (Pol, Block F): an
  entry was not visible as an entry, the controls edited one you could not see
  beside them, and the weight was a bare number. So the entries are rows again,
  and three things keep them from reading as the tile group's sorted list:
  - a **proportion strip** above them shows the sequence and the shares in one
    object, with `04` §6.3's thresholds under it wherever order matters;
  - the rows are **numbered**, and are dragged by a grip to rearrange them;
  - a **caption** under them says what order means under this Source.

  A Tile's asset list, by contrast, gets no drag affordance at all (§10.1) — see
  `tiles/TileGroup.svelte`. The rules live in `palette.ts`, where they are tested.
-->
<script lang="ts">
  import { tick } from "svelte";
  import type { PaletteEntry, Tile } from "@vit-foundation/gen-tilesets";
  import AddBar from "../lib/ui/AddBar.svelte";
  import Advisory from "../lib/ui/Advisory.svelte";
  import Icon from "../lib/ui/Icon.svelte";
  import Menu from "../lib/ui/Menu.svelte";
  import Popup from "../lib/ui/Popup.svelte";
  import Slider from "../lib/ui/Slider.svelte";
  import TilePicker from "./TilePicker.svelte";
  import {
    add,
    move,
    nameOf,
    percents,
    REFUSALS,
    remove,
    setTile,
    setWeight,
    shares,
    sliderMax,
    thresholds,
    thumbOf,
    type Edit,
    type Refusal,
  } from "./palette.js";

  interface Props {
    palette: PaletteEntry[];
    tiles: Tile[];
    /** §12.2's eighth advisory fires under a uniform Source. */
    sourceType: string | null;
    onChange: (palette: PaletteEntry[]) => void;
  }

  let { palette, tiles, sourceType, onChange }: Props = $props();

  /**
   * A key per row, so a moved row keeps its DOM (and its focus) instead of
   * every row repainting another entry. Entries carry no id of their own, and
   * an index key would leave focus on the old position after a move. Each edit
   * here reshapes the keys the same way; a palette that arrives with another
   * length (a different operation) gets fresh ones.
   */
  let nextKey = 0;
  let keys = $state<number[]>([]);
  $effect.pre(() => {
    if (keys.length !== palette.length) keys = palette.map(() => nextKey++);
  });

  const pct = $derived(percents(palette));
  const share = $derived(shares(palette));
  const top = $derived(sliderMax(palette));

  /** Thresholds mean something under every Source but `random` (`04` §6.4). */
  const banded = $derived(sourceType !== "random");
  let stripWidth = $state(0);
  const ticks = $derived(banded && stripWidth > 0 ? thresholds(palette, stripWidth) : []);

  /** The row under the pointer or holding focus: its segment is ringed. */
  let hovered = $state<number | null>(null);
  let focused = $state<number | null>(null);
  let dragging = $state<number | null>(null);
  const lit = $derived(dragging ?? focused ?? hovered);

  let refusal = $state<Refusal | null>(null);
  let reporting = $state(false);

  let list = $state<HTMLOListElement | undefined>(undefined);
  let addAnchor = $state<HTMLElement | undefined>(undefined);

  /** Which picker is open: an entry's (by index), "add", or none. */
  let picking = $state<number | "add" | null>(null);

  /**
   * The Source a reorder last happened under. The advisory is about a palette
   * *reordered* under `random` (§12.2), so it shows once the author has
   * reordered, not merely because the Source is random: a line that is always
   * there is a line nobody reads.
   */
  let reorderedUnder = $state<string | null>(null);
  const orderMeaningless = $derived(sourceType === "random" && palette.length > 1);
  // Not while a drag is still moving the row: only once it is let go.
  const showReorderAdvisory = $derived(orderMeaningless && reorderedUnder === sourceType && dragging === null);

  function refuse(reason: Refusal): void {
    refusal = reason;
    reporting = true;
  }

  function apply(edit: Edit): boolean {
    if (!edit.ok) {
      refuse(edit.reason);
      return false;
    }
    onChange(edit.palette);
    return true;
  }

  function reorder(from: number, to: number): void {
    const next = move(palette, from, to);
    if (next === palette) return;
    keys = move(keys, from, to);
    reorderedUnder = sourceType;
    onChange(next);
  }

  /** The row element at `index`, for focus after an edit. */
  const row = (index: number): HTMLElement | undefined =>
    (list?.children[index] as HTMLElement | undefined) ?? undefined;

  async function removeAt(index: number): Promise<void> {
    const edit = remove(palette, index);
    if (!edit.ok) return refuse(edit.reason);
    keys = keys.filter((_, i) => i !== index);
    onChange(edit.palette);
    await tick();
    // The row is gone: focus the next row's menu, or "Add entry" after the last.
    const next = row(Math.min(index, edit.palette.length - 1));
    const target =
      index < edit.palette.length
        ? next?.querySelector<HTMLElement>("[aria-haspopup=menu]")
        : addAnchor?.querySelector<HTMLElement>("button");
    target?.focus();
  }

  async function pick(tileId: string | null): Promise<void> {
    const at = picking;
    picking = null;
    if (at === "add") {
      keys = [...keys, nextKey++];
      onChange(add(palette, tileId));
      await tick();
      row(palette.length - 1)?.querySelector<HTMLElement>(".thumb-button")?.focus();
    } else if (at !== null) {
      onChange(setTile(palette, at, tileId));
      await tick();
      row(at)?.querySelector<HTMLElement>(".thumb-button")?.focus();
    }
  }

  function closePicker(refocus: boolean): void {
    const at = picking;
    picking = null;
    if (!refocus || at === null) return;
    const anchor = at === "add" ? addAnchor?.querySelector("button") : row(at)?.querySelector(".thumb-button");
    (anchor as HTMLElement | null | undefined)?.focus();
  }

  const pickerAnchor = $derived(
    picking === "add"
      ? addAnchor
      : picking !== null
        ? (row(picking)?.querySelector<HTMLElement>(".thumb-button") ?? undefined)
        : undefined,
  );

  /**
   * Dragging a row by its grip. The pointer is captured on the list, which
   * stays put while the rows move under it (a captured row would lose the
   * capture when it is reinserted). The rows swap live as the pointer crosses
   * a row's middle, as the bar's segments did.
   */
  function onGripDown(event: PointerEvent, index: number): void {
    if (event.button !== 0 || list === undefined) return;
    event.preventDefault();
    list.setPointerCapture(event.pointerId);
    dragging = index;
  }

  function onListMove(event: PointerEvent): void {
    if (dragging === null || list === undefined) return;
    const rows = Array.from(list.children) as HTMLElement[];
    let to = dragging;
    for (const [i, el] of rows.entries()) {
      const box = el.getBoundingClientRect();
      const middle = box.top + box.height / 2;
      if (i < dragging && event.clientY < middle) {
        to = i;
        break;
      }
      if (i > dragging && event.clientY > middle) to = i;
    }
    if (to !== dragging) {
      reorder(dragging, to);
      dragging = to;
    }
  }

  function onListUp(): void {
    dragging = null;
  }

  /** A weight drag moves the preview live, unless it would leave no weight at all. */
  function weightInput(index: number, weight: number): void {
    const edit = setWeight(palette, index, weight);
    if (edit.ok) onChange(edit.palette);
  }

  /** A weight drag's release or a keyboard step: refused in a Popup; the slider springs back. */
  function weightCommit(index: number, weight: number): void {
    apply(setWeight(palette, index, weight));
  }

  const caption = $derived(
    banded
      ? "Order matters: entries next to each other here end up next to each other on the canvas."
      : "Under the Random source every value is equally likely, so order does not matter here.",
  );
</script>

<div class="palette">
  <span class="t-label">Palette</span>

  <!--
    Read-only, and hidden from assistive tech: the rows say the same in words.
    A zero-weight entry is legal and means *listed but never chosen* (`03`
    §4.1), so §7.6 draws it "as a zero-width marker rather than disappearing".
  -->
  <div class="strip" aria-hidden="true" bind:clientWidth={stripWidth}>
    {#each palette as entry, index (keys[index] ?? index)}
      {@const thumb = thumbOf(tiles, entry.tileId)}
      <span
        class="segment"
        class:zero={entry.weight === 0}
        class:clear={thumb.clear}
        class:lit={lit === index}
        style:flex-grow={share[index]}
        style:background-image={thumb.url && entry.weight > 0 ? `url("${thumb.url}")` : undefined}
      ></span>
    {/each}
  </div>
  {#if ticks.length > 0}
    <div class="ticks t-console" aria-hidden="true">
      {#each ticks as t (t.at)}
        <span class={t.align} style:left="{t.at * 100}%">{t.label}</span>
      {/each}
    </div>
  {/if}

  <ol
    class="rows"
    aria-label="Palette, in order"
    bind:this={list}
    onpointermove={onListMove}
    onpointerup={onListUp}
    onpointercancel={onListUp}
  >
    {#each palette as entry, index (keys[index] ?? index)}
      {@const thumb = thumbOf(tiles, entry.tileId)}
      {@const name = nameOf(tiles, entry.tileId)}
      <li
        class="entry"
        class:zero={entry.weight === 0}
        class:dragging={dragging === index}
        onpointerenter={() => (hovered = index)}
        onpointerleave={() => (hovered = hovered === index ? null : hovered)}
        onfocusin={() => (focused = index)}
        onfocusout={() => (focused = focused === index ? null : focused)}
      >
        <!-- Pointer only: the menu's Move earlier / Move later is the keyboard path (WCAG 2.5.7). -->
        <span class="grip" aria-hidden="true" title="Drag to reorder" onpointerdown={(e) => onGripDown(e, index)}>
          <Icon name="grip" />
        </span>
        <span class="number t-console" aria-hidden="true">{index + 1}</span>
        <button
          type="button"
          class="thumb-button"
          aria-label="Tile of entry {index + 1}: {name}, change"
          aria-haspopup="dialog"
          aria-expanded={picking === index}
          onclick={() => (picking = picking === index ? null : index)}
        >
          {#if thumb.url}
            <img src={thumb.url} alt="" />
          {:else}
            <span class="thumb" class:clear={thumb.clear}></span>
          {/if}
        </button>
        <span class="name t-body" class:muted={entry.tileId === null}>{name}</span>
        <span class="slider">
          <Slider
            label="Weight of entry {index + 1}, {name}"
            min={0}
            max={top}
            step={0.01}
            value={entry.weight}
            onInput={(weight) => weightInput(index, weight)}
            onCommit={(weight) => weightCommit(index, weight)}
          />
        </span>
        <span class="share t-value">{pct[index]}%</span>
        <Menu
          label="More for entry {index + 1}"
          items={[
            { label: "Change tile…", icon: "swap", onSelect: () => (picking = index) },
            { label: "Move earlier", icon: "up", disabled: index === 0, onSelect: () => reorder(index, index - 1) },
            {
              label: "Move later",
              icon: "down",
              disabled: index === palette.length - 1,
              onSelect: () => reorder(index, index + 1),
            },
            { label: "Remove", icon: "trash", onSelect: () => void removeAt(index) },
          ]}
        />
      </li>
    {/each}
  </ol>

  {#if showReorderAdvisory}
    <Advisory when={true}>
      Under the Random source, order means nothing: reordering only reshuffles the canvas.
    </Advisory>
  {:else}
    <p class="caption t-body">{caption}</p>
  {/if}

  <span class="add" bind:this={addAnchor}>
    <AddBar label="Add entry" onclick={() => (picking = picking === "add" ? null : "add")} />
  </span>
</div>

{#if picking !== null && pickerAnchor}
  <TilePicker
    anchor={pickerAnchor}
    {tiles}
    current={picking === "add" ? undefined : palette[picking]?.tileId}
    onPick={(id) => void pick(id)}
    onClose={closePicker}
  />
{/if}

<Popup title="Palette" bind:open={reporting} onClose={() => (refusal = null)}>
  <p class="t-body refusal">{refusal ? REFUSALS[refusal] : ""}</p>
</Popup>

<style>
  /* One column that never grows past the body (the implicit `auto` column would). */
  .palette {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
    color: var(--color-ink);
  }

  /* ── The strip ── */
  .strip {
    display: flex;
    gap: var(--space-1);
    height: var(--strip-h);
  }

  /* Each segment is filled with its tile's picture, so the strip reads as a sample of the canvas. */
  .segment {
    flex: 0 1 0;
    min-width: 0;
    border-radius: var(--radius-xs);
    background-color: var(--color-field);
    background-repeat: repeat-x;
    background-size: auto 100%;
    transition: box-shadow var(--dur-fast) var(--ease);
  }

  .segment.clear {
    box-sizing: border-box;
    border: var(--rule-w) solid var(--color-edge);
    background: linear-gradient(
        to top right,
        transparent calc(50% - 0.5px),
        var(--color-edge) 50%,
        transparent calc(50% + 0.5px)
      ),
      var(--color-panel);
  }

  .segment.zero {
    flex: 0 0 var(--strip-zero);
    border: 0;
    background: var(--color-ink);
  }

  .segment.lit {
    position: relative;
    z-index: 1;
    box-shadow:
      0 0 0 var(--rule-strong) var(--color-well),
      0 0 0 calc(2 * var(--rule-strong)) var(--color-accent);
  }

  .ticks {
    position: relative;
    height: var(--text-console-size);
    margin-top: calc(-1 * var(--space-2));
    color: var(--color-muted);
  }

  .ticks span {
    position: absolute;
    top: 0;
    white-space: nowrap;
  }

  .ticks .centre {
    transform: translateX(-50%);
  }

  .ticks .end {
    transform: translateX(-100%);
  }

  /* ── The rows ── */
  .rows {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .entry {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--thumb);
    padding-right: var(--space-1);
    border-radius: var(--radius-sm);
    transition:
      background-color var(--dur-fast) var(--ease),
      box-shadow var(--dur-fast) var(--ease);
  }

  .entry:hover {
    background: var(--color-hover);
  }

  /* The dragged row is lifted off the well. */
  .entry.dragging {
    z-index: 1;
    background: var(--color-panel);
    box-shadow: var(--shadow-float);
  }

  .grip {
    display: grid;
    flex: none;
    place-items: center;
    width: var(--target-min);
    height: var(--thumb);
    border-radius: var(--radius-sm);
    color: var(--color-muted);
    cursor: grab;
    touch-action: none;
    transition:
      color var(--dur-fast) var(--ease),
      background-color var(--dur-fast) var(--ease);
  }

  .grip:hover,
  .dragging .grip {
    background: var(--color-hover);
    color: var(--color-ink);
  }

  .dragging .grip {
    cursor: grabbing;
  }

  .number {
    flex: none;
    width: var(--entry-num-w);
    color: var(--color-muted);
    text-align: right;
  }

  .thumb-button {
    flex: none;
    padding: 0;
    border: 0;
    border-radius: var(--radius-xs);
    background: none;
    cursor: pointer;
    transition: transform var(--dur-fast) var(--ease);
  }

  .thumb-button:hover {
    transform: scale(1.08);
  }

  img,
  .thumb {
    display: block;
    box-sizing: border-box;
    width: var(--thumb);
    height: var(--thumb);
    border-radius: var(--radius-xs);
    object-fit: cover;
    box-shadow: 0 0 0 var(--rule-w) var(--black-12);
  }

  .thumb {
    background: var(--color-field);
  }

  .thumb.clear {
    border: var(--rule-w) solid var(--color-edge);
    background: linear-gradient(
        to top right,
        transparent calc(50% - 0.5px),
        var(--color-edge) 50%,
        transparent calc(50% + 0.5px)
      ),
      var(--color-panel);
    box-shadow: none;
  }

  .name {
    flex: 0 1 var(--entry-name-w);
    min-width: 0;
    overflow: hidden;
    line-height: var(--leading-title);
    text-box: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name.muted {
    color: var(--color-muted);
  }

  .slider {
    flex: 1 1 0;
    min-width: var(--target-min);
  }

  .share {
    flex: none;
    width: var(--share-w);
    text-align: right;
  }

  .zero .share {
    color: var(--color-muted);
  }

  .caption {
    margin: 0;
    color: var(--color-muted);
    line-height: var(--leading-hint);
    text-box: none;
  }

  .add {
    display: block;
  }

  .refusal {
    margin: 0;
    line-height: var(--leading-hint);
    text-box: none;
  }
</style>
