/**
 * The first visit (B-017, O3a): Mosaic opens through the template path, and
 * every way that can fail leaves one notice and a replay's tour, never a throw.
 */

import { describe, expect, it } from "vitest";
import { firstVisitFailedNotice, FIRST_VISIT_TEMPLATE, openFirstVisit, type FirstVisitDeps } from "./first-visit.js";
import type { Archive, Prepared } from "./import.js";
import type { Notice } from "./notices.js";
import type { Manifest, TemplateEntry } from "./starters.js";

const mosaic: TemplateEntry = { id: FIRST_VISIT_TEMPLATE, label: "Mosaic", path: "starters/mosaic/", thumb: "t.webp", summary: "" };
const archive: Archive = new Map();
const ready = { kind: "ready", file: {}, incoming: [], upgrades: [] } as unknown as Extract<Prepared, { kind: "ready" }>;

/** Deps that succeed, with each call recorded; `over` replaces any of them. */
function deps(over: Partial<FirstVisitDeps> = {}) {
  const pushed: Notice[] = [];
  const adopted: unknown[] = [];
  const loaded: TemplateEntry[] = [];
  const base: FirstVisitDeps = {
    manifest: async () => ({ templates: [{ ...mosaic, id: "other" }, mosaic], gallery: [] }) as Manifest,
    loadTemplate: async (entry) => {
      loaded.push(entry);
      return archive;
    },
    prepare: () => ready,
    adopt: async (prepared) => void adopted.push(prepared),
    push: (notice) => void pushed.push(notice),
  };
  return { deps: { ...base, ...over }, pushed, adopted, loaded };
}

describe("openFirstVisit", () => {
  it("opens Mosaic, by id, and runs the first-visit tour", async () => {
    const d = deps();
    expect(await openFirstVisit(d.deps)).toBe("first");
    expect(d.loaded.map((e) => e.id)).toEqual([FIRST_VISIT_TEMPLATE]);
    expect(d.adopted).toEqual([ready]);
    expect(d.pushed).toEqual([]);
  });

  const failures: [string, Partial<FirstVisitDeps>, RegExp][] = [
    ["the manifest fails", { manifest: async () => Promise.reject(new Error("starters.json: 404")) }, /404/],
    ["the manifest lists no Mosaic", { manifest: async () => ({ templates: [], gallery: [] }) as Manifest }, /no "mosaic"/],
    ["a picture fails", { loadTemplate: async () => Promise.reject(new Error("tiles/t1/a1.webp: 404")) }, /a1\.webp/],
    ["it is newer", { prepare: () => ({ kind: "newer", declared: 99 }) }, /schemaVersion 99/],
    [
      "it is invalid",
      { prepare: () => ({ kind: "invalid", errors: [{ path: "/layout", code: "MISSING_KEY", message: "bad" }] }) },
      /\/layout: bad/,
    ],
    ["adopting throws", { adopt: async () => Promise.reject("boom") }, /boom/],
  ];

  for (const [name, over, reason] of failures) {
    it(`pushes one notice and runs as a replay when ${name}`, async () => {
      const d = deps(over);
      expect(await openFirstVisit(d.deps)).toBe("replay");
      expect(d.pushed).toHaveLength(1);
      expect(d.pushed[0]!.key).toBe("first-visit-failed");
      expect(d.pushed[0]!.kind).toBe("failure");
      expect(d.pushed[0]!.data!.join("\n")).toMatch(reason);
    });
  }
});

describe("firstVisitFailedNotice", () => {
  it("signs itself with its reasons, so a new reason shows again", () => {
    expect(firstVisitFailedNotice(["a", "b"]).signature).toBe("a\nb");
    expect(firstVisitFailedNotice(["a"]).signature).not.toBe(firstVisitFailedNotice(["b"]).signature);
  });
});
