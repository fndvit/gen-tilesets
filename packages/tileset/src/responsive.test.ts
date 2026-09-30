/**
 * Responsive rules — `./responsive.ts`.
 *
 * The cascade is asserted as a table of widths against the one worked example
 * the module header and the README both use, so the prose and the behaviour
 * cannot drift apart without this file noticing.
 */

import { describe, expect, it } from "vitest";
import { activeKey, activeRules, bandWidths, matches, ruleOverride } from "./responsive.js";
import type { ResponsiveRule } from "./types.js";

const EXAMPLE: ResponsiveRule[] = [
  { maxWidth: 900, columns: 15 },
  { maxWidth: 500, columns: 9, rows: 14 },
];

describe("matches", () => {
  it("is inclusive at both bounds, as CSS is", () => {
    expect(matches({ maxWidth: 500 }, 500)).toBe(true);
    expect(matches({ maxWidth: 500 }, 500.5)).toBe(false);
    expect(matches({ minWidth: 500 }, 500)).toBe(true);
    expect(matches({ minWidth: 500 }, 499.5)).toBe(false);
    expect(matches({ minWidth: 400, maxWidth: 600 }, 400)).toBe(true);
    expect(matches({ minWidth: 400, maxWidth: 600 }, 600)).toBe(true);
    expect(matches({ minWidth: 400, maxWidth: 600 }, 601)).toBe(false);
  });

  it("holds everywhere for a rule without a condition", () => {
    // `validate()` refuses one in a file; the function itself is total.
    expect(matches({}, 0)).toBe(true);
  });
});

describe("the cascade — the worked example", () => {
  const at = (width: number) => ruleOverride(activeRules(EXAMPLE, width));

  it("applies both rules at 400px, the later winning columns", () => {
    expect(at(400)).toEqual({ columns: 9, rows: 14 });
  });

  it("applies the first alone at 700px, inheriting rows from the base", () => {
    expect(at(700)).toEqual({ columns: 15 });
  });

  it("applies nothing above 900px", () => {
    expect(at(901)).toEqual({});
  });

  it("follows array order, not width order, when rules overlap", () => {
    // The same two rules, the wide one last: at 400px it now wins `columns`,
    // exactly as a later CSS declaration would.
    const reversed = [EXAMPLE[1]!, EXAMPLE[0]!];
    expect(ruleOverride(activeRules(reversed, 400))).toEqual({ columns: 15, rows: 14 });
  });

  it("copies only shape fields — never conditions, never a host rule's extras", () => {
    const host = [{ maxWidth: 600, cellSize: 44, sizing: "fixed" }];
    expect(ruleOverride(host)).toEqual({ cellSize: 44 });
  });
});

describe("activeKey", () => {
  it("is constant within a band and changes only at a bound", () => {
    expect(activeKey(EXAMPLE, 1200)).toBe("");
    expect(activeKey(EXAMPLE, 901)).toBe("");
    expect(activeKey(EXAMPLE, 900)).toBe("0");
    expect(activeKey(EXAMPLE, 700)).toBe("0");
    expect(activeKey(EXAMPLE, 500)).toBe("0,1");
    expect(activeKey(EXAMPLE, 1)).toBe("0,1");
  });

  it("names the same rules activeRules returns", () => {
    for (const w of bandWidths(EXAMPLE)) {
      const key = activeKey(EXAMPLE, w);
      const fromRules = activeRules(EXAMPLE, w).map((r) => EXAMPLE.indexOf(r)).join(",");
      expect(key).toBe(fromRules);
    }
  });
});

describe("bandWidths", () => {
  it("visits every distinct active set a sweep of widths would", () => {
    const rules: ResponsiveRule[] = [
      { maxWidth: 900, columns: 15 },
      { minWidth: 500, maxWidth: 700, rows: 3 },
      { minWidth: 500, cellSize: 20 },
      { maxWidth: 0, rows: 1 },
    ];
    const swept = new Set<string>();
    for (let w = 0; w <= 1200; w += 0.25) swept.add(activeKey(rules, w));
    const banded = new Set(bandWidths(rules).map((w) => activeKey(rules, w)));
    expect(banded).toEqual(swept);
  });

  it("includes the base above every bound and below every bound", () => {
    const widths = bandWidths(EXAMPLE);
    expect(widths[0]).toBe(0);
    expect(activeKey(EXAMPLE, widths[widths.length - 1]!)).toBe("");
  });

  it("is just the base for no rules", () => {
    expect(bandWidths([]).map((w) => activeKey([], w))).toEqual(["", ""]);
  });
});
