/**
 * Salts, rerolls, and the load flags — `09-editor.md` §8; `04` §8; `05` **X5**.
 *
 * The arithmetic is small and the failure it prevents is specific, which is why
 * it is worth a file: `06` §5.2 names this exact control — *the editor's reroll
 * button increments a salt; the author clicks it; the config visibly changes; the
 * picture does not.*
 */

import type { Operation, TilesetConfig } from "@tileset/core";
import { describe, expect, it } from "vitest";
import { newDocument, rerollAssets, rerollOperation, setReseedOnLoad } from "./document.js";
import {
  drawLoadSalt,
  inertFlags,
  loadVaries,
  nextSalt,
  offersReseedOnLoad,
  SALT_MODULUS,
} from "./reseed.js";

const op = (over: Partial<Operation> = {}): Operation => ({
  id: "op1",
  salt: 0,
  reseedOnLoad: false,
  selection: { type: "all" },
  source: { type: "random" },
  target: "opacity",
  mapping: { range: [0, 1] },
  blend: "set",
  ...over,
});

const config = (operations: Operation[], over: Partial<TilesetConfig> = {}): TilesetConfig => ({
  ...newDocument().config,
  operations,
  ...over,
});

describe("the salt wraps at 2³² — 09 §8.3, 06 C9", () => {
  it("increments by one", () => {
    expect(nextSalt(0)).toBe(1);
    expect(nextSalt(41)).toBe(42);
  });

  it("treats an absent salt as 0 — 06 §5.1", () => {
    expect(nextSalt(undefined)).toBe(1);
  });

  it("wraps rather than saturating, so the second click still moves the picture", () => {
    // Saturation is 06 §5.2's named failure: the config visibly changes and the
    // picture does not.
    expect(nextSalt(SALT_MODULUS - 1)).toBe(0);
    expect(SALT_MODULUS).toBe(2 ** 32);
  });

  it("never leaves the range 06 C9 admits", () => {
    for (const salt of [0, 1, 7, SALT_MODULUS - 2, SALT_MODULUS - 1]) {
      const next = nextSalt(salt);
      expect(Number.isInteger(next)).toBe(true);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(SALT_MODULUS);
    }
  });
});

describe("the reroll transitions — 02 §6.4", () => {
  it("moves one Operation's salt and leaves the others alone", () => {
    // `02` §6.3: an Operation's identity is its id, never its stack position.
    const file = { ...newDocument() };
    file.config = config([op({ id: "a" }), op({ id: "b", salt: 5 })]);
    const after = rerollOperation("b")(file);
    expect(after.config.operations[0]!.salt).toBe(0);
    expect(after.config.operations[1]!.salt).toBe(6);
  });

  it("rerolls assets without disturbing any Operation — 02 §6.4", () => {
    // The asset channel is separate, so every `tileId` stays exactly where it is
    // and only the variant within each Tile moves.
    const file = { ...newDocument() };
    file.config = config([op({ salt: 3 })], { assetSalt: 9 });
    const after = rerollAssets()(file);
    expect(after.config.assetSalt).toBe(10);
    expect(after.config.operations).toEqual(file.config.operations);
  });

  it("leaves the seed and the layout alone", () => {
    const file = { ...newDocument() };
    file.config = config([op()]);
    const after = rerollOperation("op1")(file);
    expect(after.config.defaultSeed).toBe(file.config.defaultSeed);
    expect(after.layout).toEqual(file.layout);
  });
});

describe("the reseedOnLoad control is offered from the registry — 09 §8.4, 05 X5", () => {
  it("is offered where the Source is stochastic", () => {
    expect(offersReseedOnLoad(op({ source: { type: "random" } }))).toBe(true);
    expect(offersReseedOnLoad(op({ source: { type: "valueNoise" } }))).toBe(true);
  });

  it("is withheld where it would be a control that does nothing — 05 §6.1", () => {
    expect(offersReseedOnLoad(op({ source: { type: "constant" } }))).toBe(false);
    expect(offersReseedOnLoad(op({ source: { type: "gradient" } }))).toBe(false);
  });

  it("reads the declaration, never a list of names", () => {
    // The property X5 buys: a Source registered later declares its own answer
    // and this keeps working with nothing edited here.
    const declared = ["constant", "random", "valueNoise", "gradient"];
    for (const name of declared) {
      expect(typeof offersReseedOnLoad(op({ source: { type: name } }))).toBe("boolean");
    }
  });
});

describe("a flag over a non-stochastic Source is reported, not cleared — 09 §8.4", () => {
  it("names the Operations 06 §10.4's second diagnostic covers", () => {
    const c = config([
      op({ id: "a", source: { type: "constant" }, reseedOnLoad: true }),
      op({ id: "b", source: { type: "random" }, reseedOnLoad: true }),
      op({ id: "c", source: { type: "gradient" }, reseedOnLoad: false }),
    ]);
    expect(inertFlags(c).map((o) => o.id)).toEqual(["a"]);
  });

  it("the transition still writes it — the editor must not silently correct", () => {
    // §8.4: the flag also moves the Operation's `random` Selection (`04` §8.2),
    // so it is not fully inert and clearing it would change the picture.
    const file = { ...newDocument() };
    file.config = config([op({ source: { type: "constant" } })]);
    expect(setReseedOnLoad("op1", true)(file).config.operations[0]!.reseedOnLoad).toBe(true);
  });
});

describe("the load preview is disabled where it provably does nothing — 09 §8.5", () => {
  it("is inert when no flag is set anywhere — 04 §8.3", () => {
    // "A config with the flag false throughout is byte-identical on every load
    // regardless of loadSalt."
    expect(loadVaries(config([op(), op({ id: "b" })]))).toBe(false);
  });

  it("varies when any Operation is flagged", () => {
    expect(loadVaries(config([op(), op({ id: "b", reseedOnLoad: true })]))).toBe(true);
  });

  it("varies when only the asset flag is set", () => {
    expect(loadVaries(config([op()], { reseedAssetsOnLoad: true }))).toBe(true);
  });

  it("counts a flag over a non-stochastic Source, because the Selection still moves", () => {
    // The asymmetry with `offersReseedOnLoad`: that one asks the Source, this
    // one asks the flag. `04` §8.2 is why they differ.
    const c = config([op({ source: { type: "constant" }, reseedOnLoad: true })]);
    expect(loadVaries(c)).toBe(true);
    expect(inertFlags(c)).toHaveLength(1);
  });
});

describe("drawing a loadSalt — 07 §9.3", () => {
  it("is never negative, which `| 0` would make it half the time", () => {
    // "`Math.random() * 2**32 | 0` is wrong: `|` coerces to int32 and yields a
    // negative number for half of all draws" — a value 06 C9 would reject if it
    // ever reached a field, and it never does, so nothing catches it.
    for (let i = 0; i < 500; i++) {
      const salt = drawLoadSalt();
      expect(Number.isInteger(salt)).toBe(true);
      expect(salt).toBeGreaterThanOrEqual(0);
      expect(salt).toBeLessThan(SALT_MODULUS);
    }
  });

  it("draws more than one value", () => {
    const drawn = new Set(Array.from({ length: 50 }, drawLoadSalt));
    expect(drawn.size).toBeGreaterThan(1);
  });
});
