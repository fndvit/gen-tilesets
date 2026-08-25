/**
 * The asset providers — `./provider.ts`, `07` §4, `08` §4.3.
 *
 * `defaultProvider` shipped untested. What matters about both is the pair of
 * properties `07` §4.4 names: the `(tileId, assetId)` key is never collapsed to
 * `assetId`, and a missing `meta.src` **throws** rather than reaching the
 * substrate as `undefined` — resolution never substitutes.
 */

import { describe, expect, it } from "vitest";
import { assetKey, defaultProvider, prefixedProvider, type AssetRef } from "./provider.js";

const ref = (meta: Record<string, unknown>, tileId = "water", assetId = "a1"): AssetRef => ({
  tileId,
  assetId,
  meta,
});

describe("defaultProvider", () => {
  it("renames meta.src and nothing else", () => {
    expect(defaultProvider(ref({ src: "tiles/water/a1.svg" }))).toEqual({
      src: "tiles/water/a1.svg",
    });
  });

  it("ignores the rest of meta", () => {
    // `06` **C4** validates `meta` as an object and inspects nothing inside it,
    // so the renderer must not start caring either (**R4** is additive).
    expect(defaultProvider(ref({ src: "a.svg", author: "someone", dpr: 2 }))).toEqual({
      src: "a.svg",
    });
  });

  const bad: Array<[string, Record<string, unknown>]> = [
    ["absent", {}],
    ["misspelled", { scr: "a.svg" }],
    ["not a string", { src: 42 }],
    ["null", { src: null }],
    ["empty", { src: "" }],
  ];

  it.each(bad)("throws when meta.src is %s", (_label, meta) => {
    expect(() => defaultProvider(ref(meta))).toThrow(/no string `meta\.src`/);
  });

  it("names the pair in the error, not just the asset", () => {
    // Two Tiles may legitimately both hold an `a1` (`06` §6), so `a1` alone does
    // not identify the failure.
    expect(() => defaultProvider(ref({}, "grass", "a1"))).toThrow(/grass\/a1/);
  });
});

describe("prefixedProvider", () => {
  it("anchors at the root when the prefix is empty", () => {
    // SvelteKit's `base` is `""` at the site root. The separator is still
    // emitted, because `tiles/a.svg` is the relative path this function exists to
    // replace — returning it here would reintroduce the 404 in the default
    // configuration.
    expect(prefixedProvider("")(ref({ src: "tiles/a.svg" }))).toEqual({ src: "/tiles/a.svg" });
  });

  it("joins a SvelteKit `base`, which has no trailing slash", () => {
    expect(prefixedProvider("/app")(ref({ src: "tiles/a.svg" }))).toEqual({
      src: "/app/tiles/a.svg",
    });
  });

  it("joins a Vite BASE_URL, which always has one", () => {
    expect(prefixedProvider("/app/")(ref({ src: "tiles/a.svg" }))).toEqual({
      src: "/app/tiles/a.svg",
    });
  });

  it('handles BASE_URL\'s default of "/"', () => {
    expect(prefixedProvider("/")(ref({ src: "tiles/a.svg" }))).toEqual({ src: "/tiles/a.svg" });
  });

  it("never emits a doubled slash, whichever form the host passes", () => {
    for (const prefix of ["", "/", "/app", "/app/", "/deep/app", "/deep/app/"]) {
      const { src } = prefixedProvider(prefix)(ref({ src: "tiles/water/a1.svg" })) as {
        src: string;
      };
      expect(src).not.toContain("//");
      expect(src.endsWith("tiles/water/a1.svg")).toBe(true);
    }
  });

  it("leaves a protocol-relative prefix alone", () => {
    // Only one trailing slash is trimmed, so `//cdn.example.com` stays a
    // protocol-relative URL — a caller who writes one means it.
    expect(prefixedProvider("//cdn.example.com/")(ref({ src: "a.svg" }))).toEqual({
      src: "//cdn.example.com/a.svg",
    });
  });

  it("throws on a missing meta.src, exactly as defaultProvider does", () => {
    // One check, one throw site: the two providers differ only in what they do
    // with the string.
    expect(() => prefixedProvider("/app")(ref({}))).toThrow(/no string `meta\.src`/);
  });
});

describe("assetKey", () => {
  it("keys on the pair", () => {
    expect(assetKey("water", "a1")).not.toBe(assetKey("grass", "a1"));
  });
});
