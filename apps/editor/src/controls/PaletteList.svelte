<!--
  The palette list — `09-editor.md` §7.6, resolving `04` open question 3;
  `DESIGN_SYSTEM.md` *Palette*.

  **`04` **O6** makes palette entry order authored and semantically significant**,
  against **D3**, which canonicalizes a Tile's asset list precisely so that
  dragging a list entry cannot reshuffle the canvas. Two adjacent lists in the
  same editor, with opposite rules. §7.6: "The presentation has to make the
  difference legible or the author will learn one and apply it to the other."

  ## Its shape follows the Pattern (T0–T1)

  The weights mean different things under different Patterns, and showing them
  one way read as chances everywhere. Measured with three equal weights, Noise
  paints the middle entry 68–75% and Constant paints only the first. So:

  - **Random:** order means nothing, so the rows have no number and no grip and
    the Menu no Move items. The % is each entry's **chance**, from the weights.
  - **Noise, Gradient, and any other Pattern:** an ordered list, numbered and
    dragged by a grip. The % is the **measured** share of the selected cells,
    "≈68%" (`coverage`, passed in). The strip draws the same shares, so the two
    always agree; no threshold labels, which described weights and not what is
    painted.
  - **Constant:** one tile, not a palette — the entry `t = 0` lands on
    (`constantEntry`). The other entries stay in the draft, named in a line,
    and Save writes only this one (`mappingOf`).

  Advisory 8 (a palette reordered under Random) is retired: under Random there
  is no order to change. A Tile's asset list still gets no drag affordance at
  all (§10.1) — see `tiles/TileGroup.svelte`. The rules live in `palette.ts`,
  where they are tested.
-->
<script lang="ts">
  import { tick } from "svelte";
  import type { PaletteEntry, Tile } from "@vit-foundation/gen-tilesets";
  import Advisory from "../lib/ui/Advisory.svelte";
  import AddBar from "../lib/ui/AddBar.svelte";
  import Icon from "../lib/ui/Icon.svelte";
  import Menu from "../lib/ui/Menu.svelte";
  import Popup from "../lib/ui/Popup.svelte";
  import Slider from "../lib/ui/Slider.svelte";
  import TilePicker from "./TilePicker.svelte";
  import {
    add,
    constantEntry,
    keptText,
    move,
    nameOf,
    percents,
    REFUSALS,
    remove,
    setTile,
    setWeight,
    shares,
    sliderMax,
    thumbOf,
    type Edit,
    type Refusal,
  } from "./palette.js";

  interface Props {
    palette: PaletteEntry[];
    tiles: Tile[];
    /** The operation's Pattern (its Source), which decides the list's shape. `null` before one is chosen. */
    sourceType: string | null;
    /**
     * Each entry's measured share of the selected cells, 0–1, by index; `null`
     * shows "—" (no Pattern or Selection yet, or nothing selected). Read under
     * every Pattern but Random and Constant. The caller measures, so this list
     * stays presentational.
     */
    coverage?: number[] | null;
    onChange: (palette: PaletteEntry[]) => void;
  }

  let { palette, tiles, sourceType, coverage = null, onChange }: Props = $props();

  type Mode = "chance" | "measured" | "constant";
  const mode: Mode = $derived(
    sourceType === "random" ? "chance" : sourceType === "constant" ? "constant" : "measured",
  );
  const ordered = $derived(mode === "measured");

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

  const top = $derived(sliderMax(palette));

  /** The strip's widths: the chances under Random, the measured shares otherwise (weights until measured). */
  const strip = $derived(mode === "measured" && coverage !== null ? coverage : shares(palette));

  /** Each row's %: "33%" (a chance), "≈68%" (measured) or "—" (nothing measured yet). */
  const readouts = $derived.by(() => {
    if (mode !== "measured") return percents(palette).map((n) => `${n}%`);
    if (coverage === null) return palette.map(() => "—");
    return coverage.map((c) => `≈${Math.round(c * 100)}%`);
  });

  /** Under Constant: the one entry painted, and the line naming the others. */
  const shown = $derived(Math.max(0, constantEntry(palette)));
  const kept = $derived(keptText(palette, tiles, shown));

  /** The row under the pointer or holding focus: its segment is ringed. */
  let hovered = $state<number | null>(null);
  let focused = $state<number | null>(null);
  let dragging = $state<number | null>(null);
  const lit = $derived(dragging ?? focused ?? hovered);

  let refusal = $state<Refusal | null>(null);
  let reporting = $state(false);

  let list = $state<HTMLElement | undefined>(undefined);
  let addAnchor = $state<HTMLElement | undefined>(undefined);
  let oneButton = $state<HTMLButtonElement | undefined>(undefined);

  /** Which picker is open: an entry's (by index), "add", or none. */
  let picking = $state<number | "add" | null>(null);

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
    onChange(next);
  }

  /** The row element at `index`, for focus after an edit. */
  const row = (index: number): HTMLElement | undefined =>
    (list?.children[index] as HTMLElement | undefined) ?? undefined;

  /** The thumbnail button that opens entry `index`'s picker: Constant's one, or the row's. */
  const thumbButton = (index: number): HTMLElement | undefined =>
    mode === "constant" ? oneButton : (row(index)?.querySelector<HTMLElement>(".thumb-button") ?? undefined);

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
      thumbButton(palette.length - 1)?.focus();
    } else if (at !== null) {
      onChange(setTile(palette, at, tileId));
      await tick();
      thumbButton(at)?.focus();
    }
  }

  function closePicker(refocus: boolean): void {
    const at = picking;
    picking = null;
    if (!refocus || at === null) return;
    (at === "add" ? addAnchor?.querySelector<HTMLElement>("button") : thumbButton(at))?.focus();
  }

  const pickerAnchor = $derived(
    picking === "add" ? addAnchor : picking !== null ? thumbButton(picking) : undefined,
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

  /**
   * The T1 mock's captions: what the % means, and what order does, under this
   * Pattern. Noise's says why the middle wins and what to do about it (N1); the
   * longer why is in the "How noise works" popover on the Pattern step.
   */
  const caption = $derived(
    mode === "chance"
      ? "Each cell picks a tile at random. The % is each tile's chance."
      : sourceType === null
        ? "Choose a pattern to see what each entry paints."
        : sourceType === "valueNoise"
          ? "Order matters: neighbours in this list meet on the canvas. Middle entries cover more because noise rarely reaches its ends. Give the first and last entries more weight to even it out."
          : sourceType === "gradient"
            ? "Order matters: the bands follow this list from one side to the other. ≈ is what each one paints with this seed."
            : "Order matters: neighbours in this list meet on the canvas. ≈ is what each one paints with this seed.",
  );
</script>

{#if mode === "constant"}
  {@const entry = palette[shown]}
  {@const thumb = thumbOf(tiles, entry?.tileId ?? null)}
  {@const name = nameOf(tiles, entry?.tileId ?? null)}
  <!--
    No label of its own: the options caption above already says "Tile", and a
    second one inside the well read as a stutter (Pol, T4). The button's name
    still carries it for a screen reader.
  -->
  <div class="palette">
    <div class="one">
      <button
        type="button"
        class="thumb-button"
        bind:this={oneButton}
        aria-label="Tile: {name}, change"
        aria-haspopup="dialog"
        aria-expanded={picking === shown}
        onclick={() => (picking = picking === shown ? null : shown)}
      >
        {#if thumb.url}
          <img class="large" src={thumb.url} alt="" />
        {:else}
          <span class="thumb large" class:clear={thumb.clear}></span>
        {/if}
      </button>
      <span class="who">
        <span class="t-body" class:muted={entry?.tileId === null}>{name}</span>
        <span class="t-console muted">every selected cell</span>
      </span>
    </div>
    <Advisory when={kept !== null}>{kept}</Advisory>
  </div>
{:else}
  <div class="palette">
    <div class="head">
      <span class="t-label">Palette</span>
      <span class="head-note t-console">{mode === "chance" ? "chance" : "≈ painted"}</span>
    </div>

    <!--
      Read-only, and hidden from assistive tech: the rows say the same in words.
      A zero share is drawn "as a zero-width marker rather than disappearing"
      (§7.6), whether its weight is zero or it paints no cell.
    -->
    <div class="strip" aria-hidden="true">
      {#each palette as entry, index (keys[index] ?? index)}
        {@const thumb = thumbOf(tiles, entry.tileId)}
        {@const zero = (strip[index] ?? 0) === 0}
        <span
          class="segment"
          class:zero
          class:clear={thumb.clear}
          class:lit={lit === index}
          style:flex-grow={strip[index] ?? 0}
          style:background-image={thumb.url && !zero ? `url("${thumb.url}")` : undefined}
        ></span>
      {/each}
    </div>

    <svelte:element
      this={ordered ? "ol" : "ul"}
      role="list"
      class="rows"
      aria-label={ordered ? "Palette, in order" : "Palette"}
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
          {#if ordered}
            <!-- Pointer only: the menu's Move earlier / Move later is the keyboard path (WCAG 2.5.7). -->
            <span class="grip" aria-hidden="true" title="Drag to reorder" onpointerdown={(e) => onGripDown(e, index)}>
              <Icon name="grip" />
            </span>
            <span class="number t-console" aria-hidden="true">{index + 1}</span>
          {/if}
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
          <span class="share t-value" class:measured={mode === "measured"}>{readouts[index]}</span>
          <Menu
            label="More for entry {index + 1}"
            items={ordered
              ? [
                  { label: "Change tile…", icon: "swap", onSelect: () => (picking = index) },
                  { label: "Move earlier", icon: "up", disabled: index === 0, onSelect: () => reorder(index, index - 1) },
                  {
                    label: "Move later",
                    icon: "down",
                    disabled: index === palette.length - 1,
                    onSelect: () => reorder(index, index + 1),
                  },
                  { label: "Remove", icon: "trash", onSelect: () => void removeAt(index) },
                ]
              : [
                  { label: "Change tile…", icon: "swap", onSelect: () => (picking = index) },
                  { label: "Remove", icon: "trash", onSelect: () => void removeAt(index) },
                ]}
          />
        </li>
      {/each}
    </svelte:element>

    <p class="caption t-body">{caption}</p>

    <span class="add" bind:this={addAnchor}>
      <AddBar label="Add entry" onclick={() => (picking = picking === "add" ? null : "add")} />
    </span>
  </div>
{/if}

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
    container-type: inline-size;
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .head-note {
    color: var(--color-muted);
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

  .slider {
    flex: 1 1 0;
    min-width: var(--target-min);
  }

  .share {
    flex: none;
    width: var(--share-w);
    text-align: right;
  }

  /* "≈68%" is wider than "33%". */
  .share.measured {
    width: var(--share-measured-w);
  }

  .zero .share {
    color: var(--color-muted);
  }

  /* ── Constant: one tile ── */
  .one {
    display: flex;
    align-items: center;
    gap: var(--space-5);
  }

  img.large,
  .thumb.large {
    width: var(--thumb-lg);
    height: var(--thumb-lg);
  }

  .who {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .muted {
    color: var(--color-muted);
  }

  /* The narrowest sidebars (T1): tighter rows, and the right-hand label goes. */
  @container (max-width: 250px) {
    .entry {
      gap: var(--space-2);
    }

    .head-note {
      display: none;
    }
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
