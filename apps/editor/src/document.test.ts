import { describe, expect, it } from "vitest";
import {
  newDocument,
  rerollSeed,
  setCellSize,
  setDefaultSeed,
  setHorizontalAlignment,
  setReferenceWidth,
  setRows,
  setYOffset,
  type Transition,
} from "./document.js";
import { parseCellSize, parseReferenceWidth, parseRows, parseYOffset } from "./fields.js";
import { validate } from "@fndvit/gen-tilesets";

const doc = () => newDocument();

/** Every transition is `TilesetFile -> TilesetFile`, so this composes them. */
const run = (...transitions: Transition[]) =>
  transitions.reduce((file, t) => t(file), doc());

describe("newDocument — 08 §3.4's valid skeleton", () => {
  it("is a legal file with nothing in it — 06 §5", () => {
    const file = doc();
    expect(file.schemaVersion).toBe(3);
    expect(file.engineVersion).toEqual(expect.any(String));
    expect(file.config.tiles).toEqual([]);
    expect(file.config.operations).toEqual([]);
    // "Rejecting it would mean the editor cannot save a document until it is
    // finished."
    expect(file.config.defaultSeed.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * The field-by-field assertions above are a description of the skeleton; this
   * is the test of it. It matters more since v0.2.0: `<Tileset>` asserts
   * `validate()` on its `file` prop in a development build (**S3**), so an
   * invalid starting document would no longer draw a blank preview — it would
   * throw on the editor's first paint, before the author touched anything.
   */
  it("actually validates, which the DEV-build preview now depends on", () => {
    expect(validate(doc())).toEqual([]);
  });

  it("derives `columns` rather than hardcoding it — E1", () => {
    const file = doc();
    expect(file.config.columns).toBe(10);
    expect(file.config.columns * file.layout.cellSize).toBeGreaterThanOrEqual(
      file.layout.referenceWidth,
    );
    // "gutter" wants even.
    expect(file.config.columns % 2).toBe(0);
  });

  it("starts with no bleed, and yOffset at the identity", () => {
    const file = doc();
    expect(file.config.columns * file.layout.cellSize).toBe(file.layout.referenceWidth);
    expect(file.layout.yOffset).toBe(0);
  });

  it("writes the optional fields explicitly — 09 §11.3, 06 §5.1", () => {
    // "The defaults exist so hand-written fixtures stay short, not so saved
    // files can be sparse."
    const file = doc();
    expect(file.config.assetSalt).toBe(0);
    expect(file.config.reseedAssetsOnLoad).toBe(false);
  });

  it("draws a fresh seed each time — 09 §8.2", () => {
    const seeds = new Set(Array.from({ length: 40 }, () => doc().config.defaultSeed));
    expect(seeds.size).toBeGreaterThan(1);
    for (const seed of seeds) expect(seed).toMatch(/^[a-z]+-[a-z]+-\d{1,2}$/);
  });
});

describe("transitions — E5", () => {
  it("re-derives `columns` on each of the three destructive fields — E12", () => {
    // 09 §9.3 names three where 02 §7.5 named one, "because `columns` derives
    // from all three".
    expect(run(setReferenceWidth("1200")).config.columns).toBe(12);
    expect(run(setCellSize("120")).config.columns).toBe(10); // ceil(1000/120)=9 -> 10
    expect(run(setHorizontalAlignment("column")).config.columns).toBe(11);
  });

  it("does not re-derive `columns` on the two that are not destructive", () => {
    const before = doc().config.columns;
    expect(run(setRows("40")).config.columns).toBe(before);
    expect(run(setYOffset("0.5")).config.columns).toBe(before);
  });

  it("writes the field it names and nothing else", () => {
    const file = run(setRows("12"));
    const base = doc();
    expect(file.config.rows).toBe(12);
    expect(file.layout).toEqual(base.layout);
  });

  it("holds E1's guarantees across a sequence of edits", () => {
    const file = run(
      setCellSize("175"),
      setReferenceWidth("1280"),
      setHorizontalAlignment("gutter"),
    );
    expect(file.config.columns).toBe(8);
    expect(file.config.columns * file.layout.cellSize).toBe(1400);
    expect(file.config.columns % 2).toBe(0);
  });

  /**
   * **The refusal contract.** "A transition is defined on every legal file and
   * produces a legal file — it never returns `null`, never throws to signal
   * refusal, and never lands a half-change."
   */
  const refusals: [name: string, make: (t: string) => Transition, bad: string[]][] = [
    ["rows", setRows, ["0", "-3", "1.5", "", "  ", "abc", "NaN", "Infinity"]],
    ["cellSize", setCellSize, ["0", "-1", "", "abc", "Infinity"]],
    ["referenceWidth", setReferenceWidth, ["0", "-1", "", "abc", "-Infinity"]],
    // 06 §8 makes yOffset half-open: 1 is refused along with 1.4.
    ["yOffset", setYOffset, ["1", "1.4", "-0.1", "", "abc"]],
  ];

  for (const [name, make, values] of refusals) {
    it(`returns the file unchanged rather than landing an illegal ${name}`, () => {
      const before = doc();
      for (const bad of values) {
        expect(make(bad)(before)).toEqual(before);
      }
    });
  }

  it("never coerces a refused value into range — 06 §9.2, 02 §7.4", () => {
    // The tempting exception. "A loader that silently rewrites a value produces
    // a picture the file does not describe, and the author's next save writes
    // the rewritten value back over their own."
    expect(run(setYOffset("1.4")).layout.yOffset).toBe(0);
    expect(run(setYOffset("-2")).layout.yOffset).toBe(0);
  });

  it("accepts the boundary values 06 admits", () => {
    expect(run(setYOffset("0")).layout.yOffset).toBe(0);
    expect(run(setYOffset("0.999")).layout.yOffset).toBe(0.999);
    expect(run(setRows("1")).config.rows).toBe(1);
  });

  it("commits E5's own example — `1.` is a legal number, `1.` typed is not partial", () => {
    // 09 §4.2's example is about what the *control* holds. Number("1.") is 1, so
    // the value does commit; the control keeps showing "1." until blur.
    expect(parseCellSize("1.")).toBe(1);
    expect(run(setCellSize("1.")).layout.cellSize).toBe(1);
  });
});

describe("fields — the shared constraint, 06 §5 and §8", () => {
  it("agrees with the transitions about what is legal", () => {
    // One definition, two callers. If these drifted, a control would refuse a
    // value the file accepts, or accept one validate() would reject -- which
    // E15 calls a defect in the editor's edit vocabulary.
    const before = doc();
    const cases: [(t: string) => number | null, (t: string) => Transition][] = [
      [parseRows, setRows],
      [parseCellSize, setCellSize],
      [parseReferenceWidth, setReferenceWidth],
      [parseYOffset, setYOffset],
    ];
    for (const [parse, make] of cases) {
      for (const text of ["0", "1", "0.5", "-1", "", "abc", "1e3", "Infinity", "0.999"]) {
        const changed = make(text)(before) !== before;
        expect(changed).toBe(parse(text) !== null);
      }
    }
  });
});

describe("the seed — 09 §8.2, 02 §6.6", () => {
  it("writes whatever the author types", () => {
    // "The author never sees a hash. They type a string." No format is imposed:
    // `06` §5 constrains `defaultSeed` only to length >= 1.
    expect(run(setDefaultSeed("sunset-3")).config.defaultSeed).toBe("sunset-3");
    expect(run(setDefaultSeed("draft b ✱")).config.defaultSeed).toBe("draft b ✱");
  });

  it("refuses an empty field rather than writing one — 02 §4.1 requires a seed", () => {
    // E5: in-flight input lives in the control and reaches the file only when it
    // parses. An empty seed would make the config unrenderable standalone.
    // One document, applied to directly: `doc()` draws a fresh memorable seed
    // on every call, so comparing across two of them compares two random words.
    const before = doc();
    expect(setDefaultSeed("")(before)).toEqual(before);
    expect(setDefaultSeed("   ")(before)).toEqual(before);
  });

  it("trims, so two seeds cannot differ by an invisible character", () => {
    // `02` §6.6 hashes the string, so "sunset " and "sunset" are different
    // pictures with nothing on screen to tell them apart (`DECISIONS.md` D23).
    expect(run(setDefaultSeed("  sunset  ")).config.defaultSeed).toBe("sunset");
  });

  it("generates a memorable seed, not hex — 02 §6.6", () => {
    // The value of a seed is that it can be written down and returned to.
    const seed = run(rerollSeed()).config.defaultSeed;
    expect(seed).toMatch(/^[a-z]+-[a-z]+-\d+$/);
  });

  it("touches nothing but the seed", () => {
    const before = doc();
    const after = setDefaultSeed("other")(before);
    expect(after.layout).toEqual(before.layout);
    expect(after.config.columns).toBe(before.config.columns);
    expect(after.config.operations).toBe(before.config.operations);
  });
});
