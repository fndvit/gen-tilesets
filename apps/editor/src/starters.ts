/**
 * Starters — the templates and the tile gallery (B-016).
 *
 * The editor ships ready-made content under `public/`: whole tilesets to open
 * (templates) and single pictures to add (the gallery). `starters.json` lists
 * both. This module is the pure half: the manifest's shape, a parser that
 * refuses a malformed one, and the two loaders. Fetching is injected, so the
 * tests run on an in-memory map and nothing here knows about the DOM.
 *
 * ## Nothing is fetched up front
 *
 * The first template is ~1 MB of pictures; the editor's whole build is a few
 * hundred KB. So the manifest is fetched only when the New tileset popup or the
 * gallery opens, a template's files only when it is chosen, and a gallery
 * picture's full file only when it is added. Until then the UI shows the small
 * committed thumbnails the manifest points at.
 *
 * ## The gallery points into the template's files
 *
 * Today every gallery picture is one of Collage's, and the manifest names it by
 * path rather than holding a copy. The manifest is what decouples the two: when
 * the gallery grows past Collage (Pol, S1), its new entries simply point
 * somewhere else, and no consumer changes.
 *
 * ## Failure is loud
 *
 * A template is a document: a missing picture would open it with a hole the
 * author did not make and cannot repair from anywhere. So `loadTemplate` throws
 * on any failed fetch, naming the path, and the caller reports it as a refused
 * import. The gallery adds pictures one by one, as a drop of several files
 * does, so a failure there is per picture and the rest still arrive.
 *
 * ## Re-encoding the pictures
 *
 * The committed SVGs are Collage's originals with each embedded PNG re-encoded
 * as WebP, quality 90, at the same pixel size (10.8 MB → 0.86 MB). Pol approved
 * that by eye against a side-by-side page (S3a). Lossless WebP was
 * pixel-identical but 5.7 MB, and rejected for the size. `starters.md` has the
 * procedure for re-doing it with new pictures.
 */

import { FILE_NAME } from "./export.js";
import { mimeOf, nameOf, readArchive, type Archive } from "./import.js";

/** Where the manifest lives, relative to the app's base URL. */
export const MANIFEST_PATH = "starters.json";

/** A whole tileset the New tileset popup can open. */
export interface TemplateEntry {
  id: string;
  /** Shown in the Template list, and in "Open <label>". */
  label: string;
  /** The folder holding `tileset.json` and `tiles/`, in export layout. Ends in `/`. */
  path: string;
  /** A committed picture of the template, 192 × 120. */
  thumb: string;
  /** The muted line under the label: "6 tile groups · 5 operations". */
  summary: string;
}

/** One picture the tile gallery offers. */
export interface GalleryEntry {
  id: string;
  /**
   * The cell's accessible name ("Blue 1"). Not shown: the cells carry no
   * visible label (Pol, 2026-11-09).
   */
  label: string;
  /** The full picture, fetched only on Add. */
  src: string;
  /** A committed 104 px square thumbnail. */
  thumb: string;
}

export interface Manifest {
  templates: TemplateEntry[];
  gallery: GalleryEntry[];
}

/** What a fetch needs to be, here: the standard one fits. */
export type Fetch = (url: string) => Promise<Pick<Response, "ok" | "status" | "arrayBuffer">>;

function fail(where: string, what: string): never {
  throw new Error(`${MANIFEST_PATH}: ${where} ${what}`);
}

function strings<K extends string>(value: unknown, where: string, keys: readonly K[]): Record<K, string> {
  if (typeof value !== "object" || value === null) fail(where, "must be an object");
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const field = record[key];
    if (typeof field !== "string" || field === "") fail(`${where}.${key}`, "must be a non-empty string");
  }
  return Object.fromEntries(keys.map((key) => [key, record[key]])) as Record<K, string>;
}

function list<T>(value: unknown, where: string, each: (item: unknown, at: string) => T & { id: string }): T[] {
  if (!Array.isArray(value)) fail(where, "must be an array");
  const seen = new Set<string>();
  return value.map((item, i) => {
    const entry = each(item, `${where}[${i}]`);
    if (seen.has(entry.id)) fail(`${where}[${i}].id`, `repeats "${entry.id}"`);
    seen.add(entry.id);
    return entry;
  });
}

/**
 * The manifest, checked. Throws on anything malformed, naming the field; it
 * never fills a gap with a default (CLAUDE.md: failure is loud). Unknown keys
 * are dropped, so a consumer only ever sees the fields typed above.
 */
export function parseManifest(json: unknown): Manifest {
  if (typeof json !== "object" || json === null) fail("the manifest", "must be an object");
  const { templates, gallery } = json as Record<string, unknown>;
  return {
    templates: list(templates, "templates", (item, at) => {
      const entry = strings(item, at, ["id", "label", "path", "thumb", "summary"] as const);
      if (!entry.path.endsWith("/")) fail(`${at}.path`, "must end in /");
      return entry;
    }),
    gallery: list(gallery, "gallery", (item, at) => strings(item, at, ["id", "label", "src", "thumb"] as const)),
  };
}

async function bytesAt(fetch: Fetch, url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

/** Fetches and parses the manifest. `base` is the app's base URL, ending in `/`. */
export async function loadManifest(fetch: Fetch, base: string): Promise<Manifest> {
  const bytes = await bytesAt(fetch, base + MANIFEST_PATH);
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch (cause) {
    fail("the manifest", `is not valid JSON: ${cause instanceof Error ? cause.message : cause}`);
  }
  return parseManifest(json);
}

/**
 * A template as an `Archive`, the same map an exported zip unpacks to, so it
 * opens through `prepareArchive` and `adopt` like any import.
 *
 * The pictures to fetch are the ones `readArchive` reports **missing** from an
 * archive that holds only the document. That reuses its walk of `meta.src`
 * rather than writing a second one, so what is fetched is exactly what an
 * import would look for.
 *
 * Throws on any failed fetch, naming the path. Nothing is substituted.
 */
export async function loadTemplate(entry: TemplateEntry, fetch: Fetch, base: string): Promise<Archive> {
  const root = base + entry.path;
  const archive = new Map<string, Uint8Array>([[FILE_NAME, await bytesAt(fetch, root + FILE_NAME)]]);
  const wanted = [...new Set(readArchive(archive).missing)];
  const pictures = await Promise.all(wanted.map((src) => bytesAt(fetch, root + src)));
  wanted.forEach((src, i) => archive.set(src, pictures[i]!));
  return archive;
}

/** What a gallery add fetched: the files in pick order, and the pictures that failed. */
export interface GalleryFiles {
  files: File[];
  /** One line per picture that failed, naming it by its label. */
  failures: string[];
}

/**
 * The picked gallery pictures as `File`s, in pick order, ready for the same
 * attach path a drop takes.
 *
 * A file is named after the entry's id plus the source's extension
 * ("t1-a1.svg"). The source's own basename would not do: two groups' pictures
 * are both `a1.svg`, and the attach-failure notice would not say which.
 */
export async function loadGalleryFiles(entries: readonly GalleryEntry[], fetch: Fetch, base: string): Promise<GalleryFiles> {
  const results = await Promise.allSettled(entries.map((entry) => bytesAt(fetch, base + entry.src)));
  const files: File[] = [];
  const failures: string[] = [];
  results.forEach((result, i) => {
    const entry = entries[i]!;
    if (result.status === "fulfilled") {
      const name = nameOf(entry.src);
      const dot = name.lastIndexOf(".");
      const ext = dot === -1 ? "" : name.slice(dot);
      files.push(new File([result.value as BlobPart], entry.id + ext, { type: mimeOf(entry.src) }));
    } else {
      failures.push(`${entry.label}: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
    }
  });
  return { files, failures };
}

/**
 * A loader that runs once and is then shared, until it fails.
 *
 * The manifest is fetched the first time a popup needs it (never at startup),
 * then every popup and every reopening shares the one result. A **rejected**
 * load is forgotten, so the next call tries again: a failed fetch is often a
 * dropped connection, and holding on to it would leave the templates
 * unreachable until a reload.
 */
export function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (pending === null) {
      const attempt = load();
      pending = attempt;
      attempt.catch(() => {
        if (pending === attempt) pending = null;
      });
    }
    return pending;
  };
}
