/**
 * Keeping the open tileset across reloads: reopening it at boot, and saving it
 * after each change (B-016 S4a). The rules are in `keep.ts`, which is tested;
 * this holds the store, the timer and the one rune.
 *
 * A module holding a rune and calling into the stores, with no logic worth a
 * unit test, for the reason `drafting.svelte.ts` gives.
 *
 * ## Reopened before the editor mounts
 *
 * `main.ts` awaits `restore()` and only then mounts `App`. So the author never
 * sees the empty skeleton flash before their tileset, and the skeleton never
 * reaches the undo stack (`session.resume`). Measuring the pictures needs an
 * `Image`, not the page, so it works before mount.
 *
 * ## Saved at once, one write at a time
 *
 * `App.svelte` hands every new `session.file` to `schedule`. With no write in
 * flight it starts one at once. With one in flight it only remembers the
 * newest document, and writes that when the current write ends; the documents
 * in between are skipped. So a weight slider's drag costs a few writes, not
 * one per frame, and a slow write of a big picture cannot land after the
 * write that followed it.
 *
 * Pictures are attached before the transition that names them (`assets.ts`),
 * so watching the file is enough to catch them.
 *
 * Rejected: waiting for the changes to stop (a 400 ms debounce, with a save
 * on `pagehide` as the backstop). A reload inside the wait then depends on a
 * write begun while the page unloads, which is the least reliable moment to
 * begin one. Writing at once leaves only the length of one write for a reload
 * to fall into, and `keep.ts` commits each write at once to close that too.
 */

import type { TilesetFile } from "@vit-foundation/gen-tilesets";
import { adopt } from "./adopt.js";
import { stored } from "./assets.js";
import { prepareArchive } from "./import.js";
import {
  afterSave,
  archiveOf,
  isNoop,
  memoryStore,
  notKeptNotice,
  openStore,
  refusedNotice,
  savePlan,
  type BlobFor,
  type DocumentStore,
} from "./keep.js";
import type { Notice } from "./notices.js";
import { notices } from "./notices.svelte.js";
import { session } from "./session.svelte.js";

let store: DocumentStore = memoryStore();
/** The `Blob` last written under each `meta.src`: what the store holds. */
let saved: ReadonlyMap<string, Blob> = new Map();
/** The `session.file` last written, so an unchanged document is not written again. */
let savedFile: TilesetFile | null = null;
/** The newest document waiting for the write in flight to end, if any. */
let pending: TilesetFile | null = null;
let writing = false;

/** Shown while changes are not being kept. A condition, so New and Import do not clear it. */
let problem = $state.raw<Notice | null>(null);

const blobFor: BlobFor = (tileId, asset) => stored(tileId, asset.id)?.file;

async function save(file: TilesetFile): Promise<void> {
  const plan = savePlan(file, blobFor, saved);
  if (isNoop(plan, savedFile)) return;
  try {
    // The document is a `$state` proxy, which IndexedDB cannot clone.
    await store.write({ ...plan, file: $state.snapshot(plan.file) as TilesetFile });
    saved = afterSave(saved, plan);
    savedFile = file;
    problem = store.persistent ? null : notKeptNotice(null);
  } catch (cause) {
    problem = notKeptNotice(cause instanceof Error ? cause.message : String(cause));
  }
}

/** Writes `pending` until nothing newer is waiting. */
async function drain(): Promise<void> {
  writing = true;
  while (pending !== null) {
    const file = pending;
    pending = null;
    await save(file);
  }
  writing = false;
}

export const keeping = {
  /** The "won't be kept" condition, or `null` while changes are kept. */
  get notice(): Notice | null {
    return problem;
  },

  /**
   * Opens the store and reopens what it kept. Never throws: a kept tileset
   * that will not open leaves the empty document and a notice (Pol).
   */
  async restore(): Promise<void> {
    store = await openStore();
    if (!store.persistent) problem = notKeptNotice(null);

    let refusal: Parameters<typeof refusedNotice>[0] | null = null;
    try {
      const snapshot = await store.read();
      if (snapshot === null) return;
      const prepared = prepareArchive(await archiveOf(snapshot));
      if (prepared.kind !== "ready") {
        refusal = prepared;
      } else {
        await adopt(prepared, "resume");
        // What the store holds now: the bytes just attached, which are the
        // kept ones, under new `File` objects. A picture that failed to decode
        // keeps its kept `Blob`, so the first save neither rewrites nor drops it.
        const next = new Map(snapshot.pictures);
        for (const tile of session.file.config.tiles) {
          for (const asset of tile.assets) {
            const src = (asset.meta as { src?: unknown } | undefined)?.src;
            const blob = blobFor(tile.id, asset);
            if (typeof src === "string" && blob !== undefined) next.set(src, blob);
          }
        }
        saved = next;
        savedFile = session.file;
      }
    } catch (cause) {
      refusal = { kind: "unreadable", reason: cause instanceof Error ? cause.message : String(cause) };
    }
    if (refusal !== null) notices.push(refusedNotice(refusal));
  },

  /** Saves `file` now, or as soon as the write in flight ends. */
  schedule(file: TilesetFile): void {
    pending = file;
    if (!writing) void drain();
  },
};
