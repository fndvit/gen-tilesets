/**
 * The Tile gallery's logic, kept out of `TileGallery.svelte` so it can be
 * tested (CLAUDE.md: `.svelte` files can't be).
 *
 * ## Picks come from two places
 *
 * A pick is a key: `gallery:<entry id>` for a picture of the editor's
 * collection, `mine:<id>` for one the author uploaded (`my-tiles.ts`). The
 * prefix keeps the two apart, since nothing stops an uploaded picture's hash
 * from sharing the shape of a collection id, and it lets one list hold both
 * **in pick order**, which is the variant order the add makes (`a1, a2…`).
 * Rejected: two lists, one per source, which would lose the order between
 * them.
 */

import type { TilesetFile } from "@vit-foundation/gen-tilesets";
import { tileNameTaken } from "../../document.js";

export type PickKey = `gallery:${string}` | `mine:${string}`;

export const galleryKey = (id: string): PickKey => `gallery:${id}`;
export const mineKey = (id: string): PickKey => `mine:${id}`;

/** Splits a key back into where it came from and the id there. */
export function sourceOf(key: PickKey): { source: "gallery" | "mine"; id: string } {
  const at = key.indexOf(":");
  return { source: key.slice(0, at) as "gallery" | "mine", id: key.slice(at + 1) };
}

/** Picks `key`, at the end of the order, or unpicks it. */
export function togglePick(picked: readonly PickKey[], key: PickKey): PickKey[] {
  return picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key];
}

/** Picks every key not yet picked, at the end, in the order given: a fresh upload arrives picked. */
export function pickAll(picked: readonly PickKey[], keys: readonly PickKey[]): PickKey[] {
  return [...picked, ...keys.filter((k, i) => !picked.includes(k) && keys.indexOf(k) === i)];
}

/** What the gallery adds: a new group, or variants of one. */
export type GalleryMode = { kind: "group" } | { kind: "variants"; tileName: string };

/** The verb: "Add 3 tiles", "Add 1 variant"; "Add tiles" while nothing is picked (and it is disabled). */
export function verbOf(mode: GalleryMode, n: number): string {
  const noun = mode.kind === "group" ? "tile" : "variant";
  if (n === 0) return `Add ${noun}s`;
  return `Add ${n} ${n === 1 ? noun : `${noun}s`}`;
}

/** The footer's count. */
export function countOf(n: number): string {
  return n === 0 ? "None picked" : `${n} picked`;
}

/**
 * The new group's name, checked on Add (never while typing, the editor's
 * commit rule): `null` when it will do, else the Field error's words.
 * "Taken" is `tileNameTaken`'s, so it ignores case and outer spaces exactly as
 * a rename does.
 */
export function checkName(file: TilesetFile, name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === "") return "Give the new group a name.";
  if (tileNameTaken(file, trimmed)) return `Another group is already called "${trimmed}". Choose a different name.`;
  return null;
}

/** The picked pictures as files, in pick order, and the ones that could not be had. */
export interface PickedFiles {
  files: File[];
  failures: string[];
}

/**
 * Turns the picks into files **in pick order**, whichever source each came
 * from. `load` fetches or reads one pick; each runs at once, in parallel, and
 * their results are laid back in the order picked. A failed pick is left out
 * and named, and the rest still arrive, as a drop of several files does.
 */
export async function filesOf(picked: readonly PickKey[], load: (key: PickKey) => Promise<PickedFiles>): Promise<PickedFiles> {
  const results = await Promise.all(picked.map(load));
  return { files: results.flatMap((r) => r.files), failures: results.flatMap((r) => r.failures) };
}
