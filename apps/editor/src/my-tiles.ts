/**
 * My tiles — the pictures the author uploaded into the Tile gallery (B-016
 * S3c, Pol).
 *
 * The gallery has an Upload… button. What it uploads joins the gallery under
 * "My tiles", and **is kept across reloads** (Pol, S3c), so a picture
 * uploaded once can be added to any later tileset. That makes this the
 * editor's first browser storage: until now nothing outlived the tab.
 *
 * ## Where it is kept
 *
 * IndexedDB, one object store of `{ id, name, type, blob, added }` records.
 * Rejected: `localStorage`, which holds strings only (a picture would be
 * base64, a third larger) and has a quota of a few MB. And not the document:
 * My tiles belongs to the browser, not to a tileset, so it must survive New
 * and Import, and it must never be exported.
 *
 * ## When it can't be kept
 *
 * IndexedDB can be missing or refuse to open (a private window in some
 * browsers, blocked site data). `openShelf` then hands back a shelf kept in
 * memory for the tab, with `persistent: false`, and the gallery says so in a
 * line. The author still gets everything except surviving a reload. Rejected:
 * refusing to upload at all, which would take away the add for the sake of the
 * keeping.
 *
 * ## One copy per picture
 *
 * A record's id is the SHA-256 of its bytes, so uploading the same file twice
 * keeps one copy and the second upload only picks it again. The name is the
 * first upload's.
 *
 * ## What is tested
 *
 * Everything here but the IndexedDB adapter runs on `memoryShelf`. The adapter
 * is a thin translation of the same four calls, checked in the browser (the
 * repo has no IndexedDB fake, and adding one for four calls was not worth it).
 */

import { committed, done, MY_TILES, openDatabase } from "./browser-db.js";

/** One uploaded picture. */
export interface MyTile {
  /** The SHA-256 of the bytes, hex. */
  id: string;
  /** The uploaded file's name, which becomes a new group's default name and the asset's extension. */
  name: string;
  /** The MIME type, kept so the `File` rebuilt on Add is the one uploaded. */
  type: string;
  blob: Blob;
  /** When it was uploaded (ms since the epoch). Newest shows first. */
  added: number;
}

/** Where My tiles is kept. */
export interface TileShelf {
  /** False when it is kept in memory only, and is gone on reload. */
  readonly persistent: boolean;
  /** Every record, newest first. */
  list(): Promise<MyTile[]>;
  /** Adds or replaces a record. Rejects when the browser refuses (a full quota). */
  put(tile: MyTile): Promise<void>;
  remove(ids: readonly string[]): Promise<void>;
}

/** The order the gallery shows My tiles in: newest first, then by id so equal times are stable. */
export function newestFirst(tiles: readonly MyTile[]): MyTile[] {
  return [...tiles].sort((a, b) => b.added - a.added || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The SHA-256 of `bytes`, as lower-case hex. */
export async function idOf(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A shelf kept in memory: the fallback, and what the tests run on. */
export function memoryShelf(): TileShelf {
  const records = new Map<string, MyTile>();
  return {
    persistent: false,
    list: async () => newestFirst([...records.values()]),
    put: async (tile) => void records.set(tile.id, tile),
    remove: async (ids) => ids.forEach((id) => records.delete(id)),
  };
}

function indexedShelf(db: IDBDatabase): TileShelf {
  return {
    persistent: true,
    list: async () => newestFirst(await done(db.transaction(MY_TILES).objectStore(MY_TILES).getAll() as IDBRequest<MyTile[]>)),
    put: async (tile) => {
      const transaction = db.transaction(MY_TILES, "readwrite");
      transaction.objectStore(MY_TILES).put(tile);
      await committed(transaction);
    },
    remove: async (ids) => {
      const transaction = db.transaction(MY_TILES, "readwrite");
      const store = transaction.objectStore(MY_TILES);
      ids.forEach((id) => store.delete(id));
      await committed(transaction);
    },
  };
}

/**
 * Opens My tiles: IndexedDB when the browser allows it, else memory.
 *
 * Opening also reads once, because some browsers open a database they will
 * then refuse to read or write (Firefox's private mode used to); a shelf that
 * fails that first read is treated as not there at all.
 */
export async function openShelf(factory: () => IDBFactory | undefined = () => globalThis.indexedDB): Promise<TileShelf> {
  try {
    // Inside the try: with site data blocked, even reading `indexedDB` can throw.
    // The database is shared with the open tileset's keeping (`browser-db.ts`).
    const shelf = indexedShelf(await openDatabase(factory));
    await shelf.list();
    return shelf;
  } catch {
    return memoryShelf();
  }
}

/** What an upload did: the ids it accepted, in file order, and why the others were refused. */
export interface Uploaded {
  /** Every accepted file's id, including one that was already on the shelf. No repeats. */
  ids: string[];
  /** One line per refused file, naming it. */
  failures: string[];
}

/**
 * Puts files on the shelf, one by one, as `attachAll` attaches them.
 *
 * Each file is checked with `check` first (the editor passes the same
 * measurement an attach makes, `assets.ts`'s `measure`), so a file that would
 * fail on Add never reaches My tiles. A file already on the shelf is not
 * written again, but its id is returned, so the gallery picks it.
 */
export async function upload(
  shelf: TileShelf,
  files: readonly File[],
  check: (file: File) => Promise<void>,
  now: () => number = Date.now,
): Promise<Uploaded> {
  const held = new Set((await shelf.list()).map((t) => t.id));
  const ids: string[] = [];
  const failures: string[] = [];
  // One batch shares a time, stepped down by a millisecond per file, so newest
  // first still shows the batch in the order it was chosen.
  const start = now() + files.length;
  for (const [i, file] of files.entries()) {
    try {
      const id = await idOf(await file.arrayBuffer());
      if (!held.has(id)) {
        await check(file);
        await shelf.put({ id, name: file.name, type: file.type, blob: file, added: start - i });
        held.add(id);
      }
      if (!ids.includes(id)) ids.push(id);
    } catch (cause) {
      failures.push(`${file.name}: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }
  return { ids, failures };
}

/** A record as the `File` the attach path takes. */
export function fileOf(tile: MyTile): File {
  return new File([tile.blob], tile.name, { type: tile.type });
}
