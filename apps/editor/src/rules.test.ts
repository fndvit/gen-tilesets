/**
 * The Breakpoints transitions — `document.ts`, 0.7.0.
 *
 * The property that matters is **E5**: every one of these is total and produces a
 * legal file, refusing by returning its input. So every case ends by validating.
 */

import { describe, expect, it } from "vitest";
import { validate, type Operation, type TilesetFile } from "@fndvit/gen-tilesets";
import {
  addOperation,
  addRule,
  addRuleField,
  moveRule,
  newDocument,
  removeRule,
  removeRuleField,
  setCellSize,
  setRuleField,
  type Transition,
} from "./document.js";

const run = (file: TilesetFile, ...transitions: Transition[]) => transitions.reduce((f, t) => t(f), file);

const rect: Operation = {
  id: "gap",
  selection: { type: "rect", x: 0, y: 0, width: 2, height: 2 },
  source: { type: "constant" },
  target: "opacity",
  mapping: { range: [0, 0] },
  blend: "set",
};

describe("addRule", () => {
  it("adds a legal rule that changes nothing yet", () => {
    const f = run(newDocument(), addRule());
    expect(f.responsive).toEqual([{ maxWidth: 600, columns: f.config.columns }]);
    expect(validate(f)).toEqual([]);
  });

  it("puts the next rule below the narrowest bound", () => {
    const f = run(newDocument(), addRule(), addRule());
    expect(f.responsive!.map((r) => r.maxWidth)).toEqual([600, 300]);
  });

  it("falls back to cellSize when a coordinate-bound Operation pins the grid", () => {
    const f = run(newDocument(), addOperation(rect), addRule());
    expect(f.responsive).toEqual([{ maxWidth: 600, cellSize: f.layout.cellSize }]);
    expect(validate(f)).toEqual([]);
  });
});

describe("rule fields", () => {
  it("sets a field from text, and refuses text that does not parse", () => {
    const f = run(newDocument(), addRule(), setRuleField(0, "columns", "4"));
    expect(f.responsive![0]!.columns).toBe(4);
    expect(run(f, setRuleField(0, "columns", "4.5"))).toBe(f);
    expect(run(f, setRuleField(0, "maxWidth", "-1"))).toBe(f);
  });

  it("adds a field at the base's own value, and removes it again", () => {
    const base = run(newDocument(), addRule());
    const f = run(base, addRuleField(0, "rows"));
    expect(f.responsive![0]!.rows).toBe(base.config.rows);
    expect(run(f, removeRuleField(0, "rows"))).toEqual(base);
  });

  it("refuses to remove a rule's last condition or its last shape field", () => {
    const f = run(newDocument(), addRule());
    expect(run(f, removeRuleField(0, "maxWidth"))).toBe(f);
    expect(run(f, removeRuleField(0, "columns"))).toBe(f);
  });

  it("refuses rows or columns on a pinned grid", () => {
    const f = run(newDocument(), addOperation(rect), addRule());
    expect(run(f, addRuleField(0, "columns"))).toBe(f);
    expect(run(f, addRuleField(0, "rows"))).toBe(f);
  });

  it("refuses a bleed that leaves no box somewhere in the cascade", () => {
    const f = run(newDocument(), addRule(), setRuleField(0, "columns", "3"), addRuleField(0, "bleed"));
    expect(run(f, setRuleField(0, "bleed", "3"))).toBe(f);
    expect(run(f, setRuleField(0, "bleed", "1")).responsive![0]!.bleed).toBe(1);
  });
});

describe("removeRule and moveRule", () => {
  it("drops responsive entirely when the last rule goes", () => {
    const before = newDocument();
    const f = run(before, addRule(), removeRule(0));
    expect("responsive" in f).toBe(false);
    expect(f).toEqual(before);
  });

  it("moves a rule, which changes the cascade order", () => {
    const f = run(newDocument(), addRule(), addRule(), moveRule(1, 0));
    expect(f.responsive!.map((r) => r.maxWidth)).toEqual([300, 600]);
    expect(run(f, moveRule(0, 5))).toBe(f);
  });
});

describe("edits elsewhere keep the rules legal — E5", () => {
  it("refuses a coordinate-bound Operation while a rule resizes the grid", () => {
    const f = run(newDocument(), addRule());
    expect(run(f, addOperation(rect))).toBe(f);
  });

  it("allows it again once no rule names rows or columns", () => {
    const f = run(newDocument(), addRule(), addRuleField(0, "cellSize"), removeRuleField(0, "columns"));
    expect(run(f, addOperation(rect)).config.operations).toHaveLength(1);
  });

  it("refuses a re-derivation under which a rule's bleed leaves no box", () => {
    // 10 columns of 100 at 1000 wide. The rule sets only bleed 8, so below 600px
    // the box is 10 - 8 = 2 columns. Cell size 200 re-derives 5 columns, and
    // 5 - 8 leaves no box.
    const f = run(
      newDocument(),
      addRule(),
      addRuleField(0, "bleed"),
      setRuleField(0, "bleed", "8"),
      removeRuleField(0, "columns"),
    );
    expect(f.responsive).toEqual([{ maxWidth: 600, bleed: 8 }]);
    expect(run(f, setCellSize("200"))).toBe(f);
    // The same edit on a file without rules is simply taken.
    expect(run(newDocument(), setCellSize("200")).config.columns).toBe(6);
  });
});
