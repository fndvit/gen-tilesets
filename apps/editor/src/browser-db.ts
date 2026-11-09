/**
 * The editor's one IndexedDB database, shared by everything it keeps across
 * reloads (B-016).
 *
 * Two modules keep things: `my-tiles.ts` (the gallery's uploads) and `keep.ts`
 * (the open tileset and its pictures, S4a). They share one database, so the
 * name, the version and the upgrade live here, once. Rejected: a database
 * each, which would repeat this and the fallback around it for no gain.
 *
 * ## Versions
 *
 * - **1** (S3c): `my-tiles`.
 * - **2** (S4a): adds `document` and `pictures`.
 *
 * The upgrade creates each store that is missing rather than branching on
 * `oldVersion`, so a database at any earlier version, or none, ends up with
 * all of them, and nothing already kept is touched.
 */

export const DB_NAME = "gen-tilesets-editor";
export const DB_VERSION = 2;

/** My tiles: `{ id, name, type, blob, added }`, keyed by `id`. */
export const MY_TILES = "my-tiles";
/** The open tileset: one record, keyed by `key`. */
export const DOCUMENT = "document";
/** The open tileset's pictures: `{ src, blob }`, keyed by `src`. */
export const PICTURES = "pictures";

const STORES: readonly [name: string, keyPath: string][] = [
  [MY_TILES, "id"],
  [DOCUMENT, "key"],
  [PICTURES, "src"],
];

/** Resolves an IndexedDB request, or rejects with its error. */
export function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

/** Resolves once a transaction has committed, or rejects when it fails or aborts. */
export function committed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

/**
 * Opens the database, creating or upgrading its stores. Rejects when the
 * browser has no IndexedDB or refuses it; each caller falls back to memory.
 *
 * `factory` is read inside the promise's chain on purpose: with site data
 * blocked, even reading `indexedDB` can throw.
 */
export async function openDatabase(factory: () => IDBFactory | undefined): Promise<IDBDatabase> {
  const idb = factory();
  if (idb === undefined) throw new Error("This browser has no IndexedDB.");
  const request = idb.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    for (const [name, keyPath] of STORES) {
      if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
    }
  };
  const db = await done(request);
  // A later build in another tab wants to upgrade: step aside rather than block
  // it. This tab's next write then fails, and says so.
  db.onversionchange = () => db.close();
  return db;
}
