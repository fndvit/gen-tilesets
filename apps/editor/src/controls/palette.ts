/**
 * The palette list's rules — `09-editor.md` §7.6, `DESIGN_SYSTEM.md` *Palette*.
 *
 * Moved out of `PaletteList.svelte` so every refusal is tested: vitest cannot
 * load a `.svelte` file. Each edit returns the next palette, or the reason it
 * was refused, which the list reports in a Popup after the attempt (as Tiles
 * does), never as a silent no-op.
 *
 * **`null` is an ordinary palette entry** meaning *clear this cell* (`04` §6.3,
 * `02` §8.1). It is never a Tile in the library.
 */

import {
  canonicalAssets,
  effectiveSeeds,
  evalSource,
  isTileMapping,
  operationCtx,
  paletteTotal,
  selection,
  sources,
  type PaletteEntry,
  type Tile,
  type TilesetConfig,
} from "@vit-foundation/gen-tilesets";
import { stored } from "../assets.js";

export type Refusal = "last-entry" | "last-weight";

export type Edit = { ok: true; palette: PaletteEntry[] } | { ok: false; reason: Refusal };

/** The Popup's words for each refusal. */
export const REFUSALS: Record<Refusal, string> = {
  "last-entry": "A palette needs at least one entry, so the last one cannot be removed.",
  "last-weight":
    "At least one entry needs a weight above zero, or no tile could ever be chosen. Raise another entry's weight first.",
};

/** `06` §7.3: at least one entry, and the weights never all zero. */
function checked(palette: PaletteEntry[]): Edit {
  if (palette.length === 0) return { ok: false, reason: "last-entry" };
  if (paletteTotal(palette) <= 0) return { ok: false, reason: "last-weight" };
  return { ok: true, palette };
}

/** Moves one item; generic, so the list can move its row keys the same way. Returns `list` itself for a no-op. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to || from < 0 || from >= list.length) return list;
  const next = [...list];
  const [entry] = next.splice(from, 1);
  next.splice(to, 0, entry!);
  return next;
}

/** A new entry goes at the end with weight 1, so it is chosen at once. */
export function add(palette: PaletteEntry[], tileId: string | null): PaletteEntry[] {
  return [...palette, { tileId, weight: 1 }];
}

export function remove(palette: PaletteEntry[], index: number): Edit {
  return checked(palette.filter((_, i) => i !== index));
}

/** `06` §6: a weight is finite and >= 0. Zero is legal: "listed but never chosen". */
export function setWeight(palette: PaletteEntry[], index: number, weight: number): Edit {
  if (!Number.isFinite(weight) || weight < 0) return { ok: true, palette };
  return checked(palette.map((e, i) => (i === index ? { ...e, weight } : e)));
}

export function setTile(palette: PaletteEntry[], index: number, tileId: string | null): PaletteEntry[] {
  return palette.map((e, i) => (i === index ? { ...e, tileId } : e));
}

/** Each entry's share of the total, 0–1. */
export function shares(palette: PaletteEntry[]): number[] {
  const total = paletteTotal(palette);
  return palette.map((e) => (total > 0 ? e.weight / total : 0));
}

/** Each entry's share as a rounded percentage, for the row's %. */
export function percents(palette: PaletteEntry[]): number[] {
  return shares(palette).map((s) => Math.round(s * 100));
}

/**
 * The slider's top: 2, as in the tile group, or the largest weight if that is
 * more, so an imported weight of 5 is shown as 5 and a drag does not clip it.
 */
export function sliderMax(palette: PaletteEntry[]): number {
  return Math.max(2, ...palette.map((e) => e.weight));
}

/**
 * The entry a Constant pattern paints: the first with a weight above zero.
 *
 * `constant` emits `t = 0` (`04` §5.2), and the walk picks the first entry whose
 * running total is strictly above `0 × total` — the first non-zero weight, not
 * necessarily `palette[0]`. `-1` for a palette with no weight at all, which
 * `06` §7.3 forbids.
 */
export function constantEntry(palette: PaletteEntry[]): number {
  return palette.findIndex((e) => e.weight > 0);
}

/**
 * Which entry `t` lands on — `applyTileMapping`'s walk (`packages/tileset/src/mapping.ts`),
 * copied so it can answer with an **index**.
 *
 * The engine answers with a tile id, and two entries can name the same tile (or
 * both be clear), so counting its answers could not tell their shares apart.
 * A copy can drift, so `palette.test.ts` checks it against `applyTileMapping`
 * cell by cell; if the engine's walk changes, that test fails here.
 *
 * Strict comparison, so a zero weight never wins; at exactly `t = 1` (a
 * Gradient's far corner) the last non-zero entry wins, as in the engine.
 */
export function entryIndex(palette: PaletteEntry[], t: number): number {
  return entryWalk(palette)(t);
}

/**
 * `entryIndex` with the palette read once, for a whole field of `t`s.
 *
 * The running totals are summed in the same order as the walk above, so they
 * are the same floats, and the fall-through is the last non-zero entry, which
 * is where the walk's `last` ends up. `coverageOf` needs this: the palette it
 * gets is the draft's `$state` proxy, and reading it per cell took ~14 ms a
 * drag move on a 61×120 grid (T4); the walk per cell is now plain numbers.
 */
function entryWalk(palette: PaletteEntry[]): (t: number) => number {
  const total = paletteTotal(palette);
  const bounds: number[] = [];
  let cumulative = 0;
  let last = -1;
  for (const [i, entry] of palette.entries()) {
    cumulative += entry.weight;
    bounds.push(cumulative);
    if (entry.weight > 0) last = i;
  }
  return (t) => {
    const target = t * total;
    for (let i = 0; i < bounds.length; i++) if (bounds[i]! > target) return i;
    return last;
  };
}

/**
 * The pattern's value `t` at every cell the Operation selects, in reading order.
 *
 * Built only from the package's exports, the way `generate()` builds it: the
 * Selection's predicate from `selection()`, and the Source evaluated against
 * `operationCtx` with the same effective seeds. So a share measured from this
 * is what Save would paint with this seed and load salt, cell for cell.
 *
 * Split from `coverageOf` because it does not read the palette: a weight drag
 * re-counts this list, and never re-evaluates the pattern.
 */
export function fieldOf(config: TilesetConfig, operationId: string, seed: string, loadSalt: number): number[] {
  const op = config.operations.find((o) => o.id === operationId);
  if (op === undefined) return [];
  const selected = selection(config, operationId, seed, loadSalt);
  const source = sources.get(op.source.type);
  const ctx = operationCtx(config, op, effectiveSeeds(seed, loadSalt));
  const params = op.source as Record<string, unknown>;
  const field: number[] = [];
  for (let y = 0; y < config.rows; y++) {
    for (let x = 0; x < config.columns; x++) {
      if (selected(x, y)) field.push(evalSource(source, params, x, y, ctx));
    }
  }
  return field;
}

/**
 * Each entry's share of the selected cells, 0–1, by **entry index** — the
 * measured "≈ painted" figure under Noise, Gradient and any ordered pattern.
 * All zeros when nothing is selected; the list shows "—" for that, not 0%.
 */
export function coverageOf(field: readonly number[], palette: PaletteEntry[]): number[] {
  const counts = palette.map(() => 0);
  const walk = entryWalk(palette);
  for (const t of field) {
    const i = walk(t);
    if (i >= 0) counts[i]! += 1;
  }
  return counts.map((n) => (field.length > 0 ? n / field.length : 0));
}

/** `coverageOf(fieldOf(...))` for an Operation whose mapping is a palette. */
export function coverage(config: TilesetConfig, operationId: string, seed: string, loadSalt: number): number[] {
  const op = config.operations.find((o) => o.id === operationId);
  if (op === undefined || !isTileMapping(op.mapping)) return [];
  return coverageOf(fieldOf(config, operationId, seed, loadSalt), op.mapping.palette);
}

/** A thumbnail for an entry: the tile's first asset, or `null` for clear or a missing picture. */
export function thumbOf(tiles: readonly Tile[], tileId: string | null): { clear: boolean; url: string | null } {
  const tile = tileId === null ? undefined : tiles.find((t) => t.id === tileId);
  const asset = tile ? canonicalAssets(tile)[0] : undefined;
  return { clear: tileId === null, url: tile && asset ? (stored(tile.id, asset.id)?.url ?? null) : null };
}

export function nameOf(tiles: readonly Tile[], tileId: string | null): string {
  return tileId === null ? "clear" : (tiles.find((t) => t.id === tileId)?.name ?? tileId);
}

/**
 * Constant's kept-entries line: the other entries' names, or `null` when there
 * are none. The draft keeps them so switching the Pattern back restores the
 * list; Save writes only the shown entry (T0).
 */
export function keptText(palette: PaletteEntry[], tiles: readonly Tile[], shown: number): string | null {
  const names = palette.filter((_, i) => i !== shown).map((e) => nameOf(tiles, e.tileId));
  if (names.length === 0) return null;
  const list = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} and ${names.at(-1)!}`;
  const verb = names.length === 1 ? "is" : "are";
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} ${verb} kept until you save, in case you switch back to a pattern that uses a palette.`;
}
