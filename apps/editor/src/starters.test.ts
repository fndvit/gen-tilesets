/**
 * Starters (B-016): the manifest, the two loaders, and the committed content.
 *
 * The loaders take `fetch` as an argument, so most cases run on an in-memory
 * map. The last block reads the real files under `public/` through the same
 * loaders with an `fs`-backed fetch: that is what fails CI when a schema bump
 * leaves the template behind, or when the manifest points at a file nobody
 * committed.
 */

import { SCHEMA_VERSION, validate, type TilesetFile } from "@vit-foundation/gen-tilesets";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FILE_NAME } from "./export.js";
import { prepareArchive } from "./import.js";
import {
  loadGalleryFiles,
  loadManifest,
  loadTemplate,
  MANIFEST_PATH,
  parseManifest,
  type Fetch,
  type GalleryEntry,
  type TemplateEntry,
} from "./starters.js";

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

/** A fetch over a map of URL → bytes. Anything else is a 404. */
const fakeFetch = (files: Record<string, Uint8Array | string>): { fetch: Fetch; asked: string[] } => {
  const asked: string[] = [];
  const fetch: Fetch = async (url) => {
    asked.push(url);
    const body = files[url];
    if (body === undefined) return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    const data = typeof body === "string" ? bytes(body) : body;
    return { ok: true, status: 200, arrayBuffer: async () => data.slice().buffer };
  };
  return { fetch, asked };
};

const template: TemplateEntry = {
  id: "demo",
  label: "Demo",
  path: "templates/demo/",
  thumb: "templates/demo/thumb.webp",
  summary: "1 tile group · 0 operations",
};

const doc = {
  schemaVersion: 2,
  engineVersion: "0.0.0",
  config: {
    rows: 2,
    columns: 2,
    defaultSeed: "s",
    assetSalt: 0,
    reseedAssetsOnLoad: false,
    tiles: [
      {
        id: "t1",
        name: "leaf",
        assets: [
          { id: "a1", weight: 1, meta: { src: "tiles/t1/a1.svg", width: 8, height: 8 } },
          { id: "a2", weight: 1, meta: { src: "tiles/t1/a2.svg", width: 8, height: 8 } },
        ],
      },
    ],
    operations: [],
  },
  layout: { cellSize: 40, referenceWidth: 80, yOffset: 0, horizontalAlignment: "gutter" },
};

const BASE = "/app/";
const served = {
  [`${BASE}templates/demo/${FILE_NAME}`]: JSON.stringify(doc),
  [`${BASE}templates/demo/tiles/t1/a1.svg`]: "<svg>1</svg>",
  [`${BASE}templates/demo/tiles/t1/a2.svg`]: "<svg>2</svg>",
};

describe("parseManifest", () => {
  const good = () => ({
    templates: [{ ...template }],
    gallery: [{ id: "t1-a1", label: "leaf 1", src: "templates/demo/tiles/t1/a1.svg", thumb: "x.webp" }],
  });

  it("accepts a well-formed manifest and drops unknown keys", () => {
    const manifest = parseManifest({ ...good(), later: true, gallery: [{ ...good().gallery[0], extra: 1 }] });
    expect(manifest).toEqual(good());
  });

  it.each([
    ["not an object", null, /the manifest must be an object/],
    ["no templates", { gallery: [] }, /templates must be an array/],
    ["a template with no label", { ...good(), templates: [{ ...template, label: undefined }] }, /templates\[0\]\.label/],
    ["an empty string", { ...good(), templates: [{ ...template, thumb: "" }] }, /templates\[0\]\.thumb/],
    ["a path without a trailing slash", { ...good(), templates: [{ ...template, path: "templates/demo" }] }, /must end in \//],
    ["a repeated gallery id", { ...good(), gallery: [good().gallery[0], good().gallery[0]] }, /gallery\[1\]\.id repeats "t1-a1"/],
  ])("refuses %s, naming the field", (_, json, message) => {
    expect(() => parseManifest(json)).toThrow(message);
  });
});

describe("loadManifest", () => {
  it("fetches the manifest under the base URL", async () => {
    const { fetch, asked } = fakeFetch({ [BASE + MANIFEST_PATH]: JSON.stringify({ templates: [], gallery: [] }) });
    expect(await loadManifest(fetch, BASE)).toEqual({ templates: [], gallery: [] });
    expect(asked).toEqual(["/app/starters.json"]);
  });

  it("throws on a 404 and on bad JSON", async () => {
    await expect(loadManifest(fakeFetch({}).fetch, BASE)).rejects.toThrow("/app/starters.json: HTTP 404");
    await expect(loadManifest(fakeFetch({ [BASE + MANIFEST_PATH]: "{" }).fetch, BASE)).rejects.toThrow(/not valid JSON/);
  });
});

describe("loadTemplate", () => {
  it("builds the archive an export would unpack to, and it opens", async () => {
    const { fetch, asked } = fakeFetch(served);
    const archive = await loadTemplate(template, fetch, BASE);

    expect([...archive.keys()]).toEqual([FILE_NAME, "tiles/t1/a1.svg", "tiles/t1/a2.svg"]);
    expect(asked).toHaveLength(3);

    const prepared = prepareArchive(archive);
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.incoming.map((i) => i.file.name)).toEqual(["a1.svg", "a2.svg"]);
  });

  it("fetches a picture two assets share only once", async () => {
    const shared = structuredClone(doc);
    shared.config.tiles[0]!.assets[1]!.meta.src = "tiles/t1/a1.svg";
    const { fetch, asked } = fakeFetch({ ...served, [`${BASE}templates/demo/${FILE_NAME}`]: JSON.stringify(shared) });
    await loadTemplate(template, fetch, BASE);
    expect(asked).toHaveLength(2);
  });

  it("throws on a missing picture, naming it, rather than opening with a hole", async () => {
    const { [`${BASE}templates/demo/tiles/t1/a2.svg`]: _, ...rest } = served;
    await expect(loadTemplate(template, fakeFetch(rest).fetch, BASE)).rejects.toThrow(
      "/app/templates/demo/tiles/t1/a2.svg: HTTP 404",
    );
  });
});

describe("loadGalleryFiles", () => {
  const entries: GalleryEntry[] = [
    { id: "t1-a2", label: "leaf 2", src: "templates/demo/tiles/t1/a2.svg", thumb: "x" },
    { id: "t9-a1", label: "gone 1", src: "templates/demo/tiles/t9/a1.svg", thumb: "x" },
    { id: "t1-a1", label: "leaf 1", src: "templates/demo/tiles/t1/a1.svg", thumb: "x" },
  ];

  it("returns Files in pick order, named by id, with the failures by label", async () => {
    const { files, failures } = await loadGalleryFiles(entries, fakeFetch(served).fetch, BASE);
    expect(files.map((f) => [f.name, f.type])).toEqual([
      ["t1-a2.svg", "image/svg+xml"],
      ["t1-a1.svg", "image/svg+xml"],
    ]);
    expect(await files[0]!.text()).toBe("<svg>2</svg>");
    expect(failures).toEqual(["gone 1: /app/templates/demo/tiles/t9/a1.svg: HTTP 404"]);
  });
});

/**
 * The committed content. A future schema bump fails here until the template is
 * migrated again (with the package's own `migrate()`, never by hand: E2).
 */
describe("the committed starters", () => {
  const PUBLIC = new URL("../public/", import.meta.url);
  const diskFetch: Fetch = async (url) => {
    const path = new URL(url.replace(/^\//, ""), PUBLIC);
    if (!existsSync(path)) return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    const data = readFileSync(path);
    return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array(data).buffer };
  };
  const exists = (path: string): boolean => existsSync(new URL(path, PUBLIC));

  it("every template is current, valid, complete and summarised truthfully", async () => {
    const manifest = await loadManifest(diskFetch, "/");
    expect(manifest.templates.length).toBeGreaterThan(0);

    for (const entry of manifest.templates) {
      expect(exists(entry.thumb), entry.thumb).toBe(true);

      const file = JSON.parse(readFileSync(new URL(entry.path + FILE_NAME, PUBLIC), "utf8")) as TilesetFile;
      expect(file.schemaVersion, `${entry.id} needs migrating`).toBe(SCHEMA_VERSION);
      expect(validate(file)).toEqual([]);

      // Throws if any `meta.src` is not on disk.
      const prepared = prepareArchive(await loadTemplate(entry, diskFetch, "/"));
      expect(prepared.kind).toBe("ready");
      if (prepared.kind !== "ready") return;
      expect(prepared.upgrades).toEqual([]);
      expect(prepared.incoming).toHaveLength(file.config.tiles.reduce((n, t) => n + t.assets.length, 0));

      expect(entry.summary).toBe(
        `${file.config.tiles.length} tile groups · ${file.config.operations.length} operations`,
      );
    }
  });

  it("every gallery entry's picture and thumbnail exist", () => {
    const manifest = parseManifest(JSON.parse(readFileSync(new URL(MANIFEST_PATH, PUBLIC), "utf8")));
    expect(manifest.gallery.length).toBeGreaterThan(0);
    for (const entry of manifest.gallery) {
      expect(exists(entry.src), entry.src).toBe(true);
      expect(exists(entry.thumb), entry.thumb).toBe(true);
    }
  });
});
