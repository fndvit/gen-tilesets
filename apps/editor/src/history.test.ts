/**
 * Undo — `09-editor.md` §4.4, **E6**.
 *
 * **Invariant E6** — *undo restores a previous `TilesetFile` in full. No editor
 * action is outside the undo stack, including the design-width change of §9.3.*
 *
 * The last clause is what §9.4 leans on: undo is the **repair** for an orphaned
 * Selection, because nothing is migrated. So these are not tests of a
 * convenience.
 */

import { describe, expect, it } from "vitest";
import { newDocument, setCellSize, setReferenceWidth, setRows, setYOffset } from "./document.js";
import { applied, appliedLive, historyOf, settled, undone, UNDO_LIMIT } from "./history.js";

describe("a stack of whole values — 09 §4.4", () => {
  it("starts with nothing to undo", () => {
    const h = historyOf(newDocument());
    expect(h.past).toEqual([]);
    expect(undone(h)).toBe(h);
  });

  it("restores the previous value in full, not a field of it", () => {
    // "A restored file is a restored picture with nothing else to reset."
    const start = newDocument();
    const h = applied(applied(historyOf(start), setRows("9")), setYOffset("0.5"));
    expect(h.current.config.rows).toBe(9);
    expect(h.current.layout.yOffset).toBe(0.5);

    const back = undone(h);
    expect(back.current.layout.yOffset).toBe(0);
    expect(back.current.config.rows).toBe(9);

    expect(undone(back).current).toEqual(start);
  });

  it("undoes the design-width change like anything else — E6's whole point", () => {
    // §9.3 is the one destructive edit, and §9.4 makes undo its repair.
    const start = newDocument();
    const h = applied(historyOf(start), setReferenceWidth("2000"));
    expect(h.current.config.columns).toBe(20);
    expect(undone(h).current.config.columns).toBe(10);
  });

  it("restores a coordinate-bound Selection with the file — §9.4's repair", () => {
    // The authored values come back, rather than the editor's guess at them.
    const start = newDocument();
    start.config.operations = [
      {
        id: "painted",
        salt: 0,
        reseedOnLoad: false,
        selection: [{ type: "cellList", cells: [[9, 4]] }],
        source: { type: "constant" },
        target: "opacity",
        mapping: { range: [1, 1] },
        blend: "set",
      },
    ];
    const h = applied(historyOf(start), setCellSize("400"));
    // 400px cells in a 1000px design width: 3 columns, parity-corrected to 4.
    expect(h.current.config.columns).toBeLessThan(9);
    const back = undone(h);
    expect(back.current.config.operations[0]!.selection).toEqual([
      {
        type: "cellList",
        cells: [[9, 4]],
      },
    ]);
  });
});

describe("a refusal pushes nothing", () => {
  it("leaves the history identical when a transition declines", () => {
    // E5: a transition that cannot parse returns its input unchanged. An entry
    // here would undo to the state it is already in.
    const h = historyOf(newDocument());
    expect(applied(h, setRows("0"))).toBe(h);
    expect(applied(h, setRows("abc"))).toBe(h);
    expect(applied(h, setYOffset("1.4"))).toBe(h);
    expect(h.past).toEqual([]);
  });

  it("does not swallow a real change that happens to look similar", () => {
    const h = applied(historyOf(newDocument()), setRows("5"));
    // The document already has rows: 5, but the transition still returns a new
    // object, so this is a genuine entry rather than a refusal.
    expect(h.past).toHaveLength(1);
  });
});

describe("the stack is bounded", () => {
  it("keeps the most recent entries and drops the oldest", () => {
    let h = historyOf(newDocument());
    for (let i = 1; i <= 12; i++) h = applied(h, setRows(String(i)), 5);
    expect(h.past).toHaveLength(5);
    // The five it kept are the five most recent, so undo walks backwards
    // correctly rather than jumping to a stale value.
    expect(h.current.config.rows).toBe(12);
    expect(undone(h).current.config.rows).toBe(11);
  });

  it("defaults to a limit that is a UI constant with no authority", () => {
    expect(UNDO_LIMIT).toBe(100);
  });
});

describe("purity — the stack never mutates what it holds", () => {
  it("leaves earlier entries untouched as new ones arrive", () => {
    const start = newDocument();
    const h = applied(applied(historyOf(start), setRows("9")), setRows("11"));
    expect(h.past[0]).toBe(start);
    expect(start.config.rows).toBe(5);
  });
});

describe("a live gesture is one undo entry", () => {
  const start = () => historyOf(newDocument());

  it("follows every frame and undoes to before the drag", () => {
    const before = start();
    let h = appliedLive(before, "w", setRows("6"));
    h = appliedLive(h, "w", setRows("7"));
    h = appliedLive(h, "w", setRows("8"));
    expect(h.current.config.rows).toBe(8);
    expect(h.past).toHaveLength(1);
    expect(undone(settled(h)).current).toBe(before.current);
  });

  it("starts a new entry after release, even on the same control", () => {
    let h = settled(appliedLive(start(), "w", setRows("6")));
    h = settled(appliedLive(h, "w", setRows("7")));
    expect(h.past).toHaveLength(2);
    expect(undone(h).current.config.rows).toBe(6);
  });

  it("starts a new entry for another control, or after any other operation", () => {
    let h = appliedLive(start(), "a", setRows("6"));
    h = appliedLive(h, "b", setRows("7"));
    expect(h.past).toHaveLength(2);
    h = applied(h, setYOffset("0.5"));
    h = appliedLive(h, "b", setRows("8"));
    expect(h.past).toHaveLength(4);
  });

  it("opens no gesture on a refused first frame", () => {
    const before = start();
    const h = appliedLive(before, "w", (f) => f);
    expect(h).toBe(before);
    expect(h.gesture).toBeUndefined();
  });

  it("settling with no gesture open changes nothing", () => {
    const h = start();
    expect(settled(h)).toBe(h);
  });
});
