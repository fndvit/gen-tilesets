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

import { canonicalAssets, paletteTotal, type PaletteEntry, type Tile } from "@vit-foundation/gen-tilesets";
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

export interface Threshold {
  /** Position along the strip, 0–1. */
  at: number;
  label: string;
  align: "start" | "centre" | "end";
}

/**
 * The labels under the strip: 0, each band edge, and 1. A band edge is where a
 * non-zero share ends (`04` §6.3's cumulative thresholds); edges at the same
 * place are one label. An inner label that would collide with a kept neighbour
 * at this strip width is dropped; 0 and 1 are always kept.
 */
export function thresholds(palette: PaletteEntry[], width: number, charWidth = 7.3, gap = 6): Threshold[] {
  const total = paletteTotal(palette);
  const edges: number[] = [];
  let acc = 0;
  for (const entry of palette) {
    acc += entry.weight;
    const at = total > 0 ? acc / total : 0;
    if (entry.weight > 0 && at > 0 && at < 1 && !edges.some((e) => Math.abs(e - at) < 1e-9)) edges.push(at);
  }

  const label = (at: number): string => (at === 0 || at === 1 ? String(at) : at.toFixed(2));
  const span = (t: Threshold): [number, number] => {
    const w = t.label.length * charWidth;
    const x = t.at * width;
    return t.align === "start" ? [x, x + w] : t.align === "end" ? [x - w, x] : [x - w / 2, x + w / 2];
  };

  const first: Threshold = { at: 0, label: "0", align: "start" };
  const last: Threshold = { at: 1, label: "1", align: "end" };
  const kept: Threshold[] = [first];
  const end = span(last);
  for (const at of edges) {
    const t: Threshold = { at, label: label(at), align: "centre" };
    const [a, b] = span(t);
    const prev = span(kept[kept.length - 1]!);
    if (a >= prev[1] + gap && b + gap <= end[0]) kept.push(t);
  }
  kept.push(last);
  return kept;
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
