/**
 * The asset providers — `./provider.ts`, `07` §4, `08` §4.3.
 *
 * `defaultProvider` shipped untested. What matters about both is the pair of
 * properties `07` §4.4 names: the `(tileId, assetId)` key is never collapsed to
 * `assetId`, and a missing `meta.src` **throws** rather than reaching the
 * substrate as `undefined` — resolution never substitutes.
 */

import { describe, expect, it, vi } from "vitest";
import {
  assetKey,
  defaultProvider,
  loadBlocked,
  parseAssetKey,
  prefixedProvider,
  recordLoadFailure,
  resolveDrawable,
  type AssetProvider,
  type AssetRef,
} from "./provider.js";

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

describe("parseAssetKey — assetKey's inverse", () => {
  /**
   * This exists because the open-coded version was wrong *and silent*. Two call
   * sites split the key on `" "`, which it has never contained, so `assetId` came
   * back `undefined` and the guard after it returned early — a failed image decode
   * reported nothing through `onAssetError`. Nothing typechecked wrong and nothing
   * threw. A round-trip assertion is what makes that unrepeatable.
   */
  it("round-trips every identifier 06 C10 permits", () => {
    for (const tileId of ["a", "grass", "TILE_1", "a-b-c", "0", "x".repeat(64)]) {
      for (const assetId of ["a1", "A", "_", "v-2", "9"]) {
        expect(parseAssetKey(assetKey(tileId, assetId))).toEqual({ tileId, assetId });
      }
    }
  });

  it("does not split on a space, which is what the bug did", () => {
    expect(assetKey("grass", "a1")).not.toContain(" ");
    expect(assetKey("grass", "a1").split(" ")).toHaveLength(1);
  });

  it("returns null rather than half a pair for a non-key", () => {
    // A caller that got `{ tileId, assetId: undefined }` proceeded silently. Null
    // is the one shape that cannot be used by accident.
    expect(parseAssetKey("grass a1")).toBeNull();
    expect(parseAssetKey("")).toBeNull();
  });
});

describe("resolveDrawable — onAssetError fires for every failure shape", () => {
  const r = ref({ src: "a.svg" });

  it("passes a drawable through and reports nothing", () => {
    const report = vi.fn();
    expect(resolveDrawable(defaultProvider, r, report)).toEqual({ src: "a.svg" });
    expect(report).not.toHaveBeenCalled();
  });

  it("reports a synchronous throw and stores a handled rejection", async () => {
    const report = vi.fn();
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      const value = resolveDrawable(defaultProvider, ref({}), report);
      // Not synchronously: the caller is a `$derived`, where a host writing
      // `$state` from `onAssetError` would throw state_unsafe_mutation.
      expect(report).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(report).toHaveBeenCalledTimes(1);
      expect(value).toBeInstanceOf(Promise);
      // Nothing awaits it, as when every cell for the key is culled.
      await new Promise((done) => setTimeout(done, 0));
      expect(unhandled).not.toHaveBeenCalled();
      await expect(value).rejects.toThrow();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("reports a returned promise that rejects, once, and still hands back the rejection", async () => {
    const report = vi.fn();
    const cause = new Error("404");
    const lazy: AssetProvider = () => Promise.reject(cause);
    const value = resolveDrawable(lazy, r, report);
    await expect(value).rejects.toBe(cause);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(r, cause);
  });

  it("reports nothing for a returned promise that resolves", async () => {
    const report = vi.fn();
    const lazy: AssetProvider = async () => ({ src: "a.svg" });
    await expect(resolveDrawable(lazy, r, report)).resolves.toEqual({ src: "a.svg" });
    expect(report).not.toHaveBeenCalled();
  });
});

describe("load failures are keyed by src — a new src is a new attempt", () => {
  const key = assetKey("water", "a1");

  it("records a failure once per src", () => {
    const once = recordLoadFailure(new Map(), key, "a.svg");
    expect(once?.get(key)).toBe("a.svg");
    expect(recordLoadFailure(once!, key, "a.svg")).toBeNull();
    expect(recordLoadFailure(once!, key, "b.svg")?.get(key)).toBe("b.svg");
  });

  it("blocks only the src that failed", () => {
    const failed = new Map([[key, "a.svg"]]);
    expect(loadBlocked(failed, key, { src: "a.svg" })).toBe(true);
    // The host changed provider or file: the key resolves elsewhere and is retried.
    expect(loadBlocked(failed, key, { src: "b.svg" })).toBe(false);
    expect(loadBlocked(failed, assetKey("water", "a2"), { src: "a.svg" })).toBe(false);
  });

  it("never blocks a pending promise, whose src is not known yet", () => {
    const failed = new Map([[key, "a.svg"]]);
    const pending = new Promise<never>(() => {});
    expect(loadBlocked(failed, key, pending)).toBe(false);
    expect(loadBlocked(failed, key, undefined)).toBe(false);
  });
});
