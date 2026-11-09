/**
 * Keeping the open tileset across reloads (B-016 S4a, Pol, 2026-11-09).
 *
 * Until S4a the document and its pictures lived only in the tab (`assets.ts`,
 * `09` §15 Q8). My tiles already outlived a reload (`my-tiles.ts`), so a
 * reload that kept the gallery's pictures and dropped the tileset made from
 * them read as a bug. Now the tileset is kept too.
 *
 * ## What is kept (Pol)
 *
 * What an Export holds: the `TilesetFile` and the bytes of every picture it
 * names. **Not** the undo history, the open draft, which sections are open or
 * the load preview. Undo starts empty after a reload. Rejected: keeping the
 * history, which means up to 100 whole files plus the bytes of every deleted
 * picture, for an undo past a reload that nobody asked for.
 *
 * ## Restoring is opening
 *
 * `archiveOf` turns what was kept into the same `Archive` an exported zip
 * reads as, and the caller runs it through `prepareArchive` (`import.ts`). So
 * a tileset kept by an older editor is migrated exactly as an import is, and
 * one that a newer editor kept, or that no longer validates, is refused the
 * same way. There is no second reader to drift from the first.
 *
 * ## Saving writes only what changed
 *
 * A picture can be megabytes, and the document changes on every committed
 * edit. `savePlan` therefore puts only the pictures whose bytes the store does
 * not already hold, removes those the document no longer names, and always
 * puts the document. The caller writes the plan in one transaction, so a
 * reload never finds a document whose pictures are not written yet.
 *
 * "Already holds" is **object identity** of the `Blob`, not a comparison of
 * bytes. Within one asset store a `meta.src` always holds the same `File`
 * (`assets.ts` never re-attaches under a held pair), and when `replaceAll`
 * swaps the store for a New or an Import, every `File` is a new object, so a
 * path reused by the incoming document is written again. Rejected: hashing,
 * which reads every picture on every edit to find out what identity already
 * says.
 *
 * ## A picture with no bytes keeps what was kept
 *
 * A document can name a picture the asset store has no bytes for (one that
 * failed to decode on import, or on restore). The plan neither puts nor
 * removes it: whatever bytes were kept stay, and the next reload tries them
 * again. Only a picture the document no longer names is removed.
 *
 * ## Two tabs (Pol)
 *
 * Each tab saves its own document, and the last change wins. Nothing is
 * guarded: while both tabs are open nothing is lost, and the next reload shows
 * whichever was changed last.
 *
 * ## What is tested
 *
 * Everything here but the IndexedDB adapter runs on `memoryStore`. The adapter
 * is a thin translation of `read` and `write`, checked in the browser, for the
 * reason `my-tiles.ts` gives.
 */

import type { TileAsset, TilesetFile } from "@vit-foundation/gen-tilesets";
import { committed, DOCUMENT, done, openDatabase, PICTURES } from "./browser-db.js";
import { FILE_NAME } from "./export.js";
import type { Archive, Prepared } from "./import.js";
import type { Notice } from "./notices.js";

/** What was kept: the document, and each picture's bytes by `meta.src`. */
export interface Snapshot {
  file: TilesetFile;
  pictures: ReadonlyMap<string, Blob>;
}

/** One save: the pictures to write, the ones to drop, and the document. */
export interface SavePlan {
  file: TilesetFile;
  put: { src: string; blob: Blob }[];
  remove: string[];
}

/** Where the open tileset is kept. */
export interface DocumentStore {
  /** False when it is kept in memory only, and is gone on reload. */
  readonly persistent: boolean;
  /** What was kept, or `null` when nothing was. */
  read(): Promise<Snapshot | null>;
  /** Applies a plan, all of it or none. Rejects when the browser refuses (a full quota). */
  write(plan: SavePlan): Promise<void>;
}

/** The bytes the asset store holds for one asset, or `undefined`. */
export type BlobFor = (tileId: string, asset: TileAsset) => Blob | undefined;

/** `meta.src`, or `undefined` where the asset names none. Same test as `import.ts`'s. */
function srcOf(asset: TileAsset): string | undefined {
  const src = (asset.meta as { src?: unknown } | undefined)?.src;
  return typeof src === "string" && src !== "" ? src : undefined;
}

/**
 * Every picture the document names, by `meta.src`, with the asset store's
 * bytes where it has them (`undefined` where it does not).
 */
export function picturesOf(file: TilesetFile, blobFor: BlobFor): Map<string, Blob | undefined> {
  const out = new Map<string, Blob | undefined>();
  for (const tile of file.config.tiles) {
    for (const asset of tile.assets) {
      const src = srcOf(asset);
      if (src !== undefined) out.set(src, blobFor(tile.id, asset));
    }
  }
  return out;
}

/**
 * What a save must write, given what the store already holds (`saved`, the
 * `Blob` last written under each `meta.src`). See "Saving writes only what
 * changed" above.
 */
export function savePlan(file: TilesetFile, blobFor: BlobFor, saved: ReadonlyMap<string, Blob>): SavePlan {
  const named = picturesOf(file, blobFor);
  const put: SavePlan["put"] = [];
  for (const [src, blob] of named) {
    if (blob !== undefined && saved.get(src) !== blob) put.push({ src, blob });
  }
  const remove = [...saved.keys()].filter((src) => !named.has(src));
  return { file, put, remove };
}

/** What the store holds once `plan` is written. */
export function afterSave(saved: ReadonlyMap<string, Blob>, plan: SavePlan): Map<string, Blob> {
  const next = new Map(saved);
  for (const src of plan.remove) next.delete(src);
  for (const { src, blob } of plan.put) next.set(src, blob);
  return next;
}

/** Whether writing `plan` would change nothing the store holds. */
export function isNoop(plan: SavePlan, savedFile: TilesetFile | null): boolean {
  return plan.put.length === 0 && plan.remove.length === 0 && plan.file === savedFile;
}

/**
 * What was kept, as the archive an export of it would read as: `tileset.json`
 * and each picture at its `meta.src`.
 *
 * `JSON.stringify`, not `export.ts`'s `serialize`: that stamps the running
 * `engineVersion`, which is a claim an export makes, and a reload is not an
 * export. The document comes back as it was kept.
 */
export async function archiveOf(snapshot: Snapshot): Promise<Archive> {
  const archive = new Map<string, Uint8Array>();
  archive.set(FILE_NAME, new TextEncoder().encode(JSON.stringify(snapshot.file)));
  for (const [src, blob] of snapshot.pictures) {
    archive.set(src, new Uint8Array(await blob.arrayBuffer()));
  }
  return archive;
}

/** Why the kept tileset did not open: `prepareArchive` refused it, or reading it threw. */
export type Refusal = Exclude<Prepared, { kind: "ready" }> | { kind: "unreadable"; reason: string };

/**
 * The failure notice for a kept tileset that did not open (Pol: start empty,
 * and say why). The record itself is left alone until the next change
 * overwrites it.
 */
export function refusedNotice(refusal: Refusal): Notice {
  const data =
    refusal.kind === "newer"
      ? [`It was saved by a newer build (schemaVersion ${refusal.declared}). Update the editor.`]
      : refusal.kind === "invalid"
        ? refusal.errors.map((e) => `${e.path || "/"}: ${e.message}`)
        : [refusal.reason];
  return {
    key: "restore-refused",
    signature: data.join("\n"),
    kind: "failure",
    title: "Your last tileset couldn't be reopened",
    data,
    body: "You're starting with an empty tileset. Your next change replaces the one that was kept.",
  };
}

/**
 * The condition shown while changes are not being kept: storage is missing or
 * blocked (`reason` null), or a save was refused (`reason` says why).
 */
export function notKeptNotice(reason: string | null): Notice {
  return {
    key: "not-kept",
    signature: reason ?? "",
    kind: "failure",
    title: "Changes won't be kept across reloads",
    ...(reason === null
      ? { body: "This browser window doesn't allow the editor to store anything. Export to keep your work." }
      : { data: [reason], body: "Export to keep your work." }),
  };
}

/** A store kept in memory: the fallback, and what the tests run on. */
export function memoryStore(): DocumentStore {
  let file: TilesetFile | null = null;
  const pictures = new Map<string, Blob>();
  return {
    persistent: false,
    read: async () => (file === null ? null : { file, pictures: new Map(pictures) }),
    write: async (plan) => {
      for (const src of plan.remove) pictures.delete(src);
      for (const { src, blob } of plan.put) pictures.set(src, blob);
      file = plan.file;
    },
  };
}

/** The one record in the `document` store. */
const CURRENT = "current";

function indexedStore(db: IDBDatabase): DocumentStore {
  return {
    persistent: true,
    read: async () => {
      const transaction = db.transaction([DOCUMENT, PICTURES]);
      const record = await done(transaction.objectStore(DOCUMENT).get(CURRENT) as IDBRequest<{ file: TilesetFile } | undefined>);
      const rows = await done(transaction.objectStore(PICTURES).getAll() as IDBRequest<{ src: string; blob: Blob }[]>);
      if (record === undefined) return null;
      return { file: record.file, pictures: new Map(rows.map((r) => [r.src, r.blob])) };
    },
    write: async (plan) => {
      const transaction = db.transaction([DOCUMENT, PICTURES], "readwrite");
      const pictures = transaction.objectStore(PICTURES);
      plan.remove.forEach((src) => pictures.delete(src));
      plan.put.forEach((row) => pictures.put(row));
      transaction.objectStore(DOCUMENT).put({ key: CURRENT, file: plan.file, savedAt: Date.now() });
      // Commit now rather than when the task ends: a reload right after an
      // edit unloads the page first, and an uncommitted transaction is lost.
      // Checked in the browser: without this, Tab-then-reload dropped the edit.
      const result = committed(transaction);
      transaction.commit?.();
      await result;
    },
  };
}

/**
 * Opens where the tileset is kept: IndexedDB when the browser allows it, else
 * memory, which the caller reports (`notKeptNotice(null)`).
 */
export async function openStore(factory: () => IDBFactory | undefined = () => globalThis.indexedDB): Promise<DocumentStore> {
  try {
    return indexedStore(await openDatabase(factory));
  } catch {
    return memoryStore();
  }
}
