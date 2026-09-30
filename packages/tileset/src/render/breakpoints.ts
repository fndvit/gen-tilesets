/**
 * Breakpoints — what `<Tileset>` does with responsive rules, as plain functions
 * and two small memos, so that a test can import them (`.svelte` cannot be
 * unit-tested here; CLAUDE.md).
 *
 * What a breakpoint crossing costs is the whole design, so it is stated here:
 *
 * | The resolved shape changes...               | Work                                     |
 * | ------------------------------------------- | ---------------------------------------- |
 * | nothing (the width moved inside a band)     | none — `activeKey` is unchanged          |
 * | `cellSize`, `bleed`, `yOffset`, sizing, align | geometry and paint; `config` is the same object |
 * | `rows` or `columns`                         | one `generate()` per shape never seen before ({@link GridCache}) |
 */

import { generate } from "../generate.js";
import { activeRules, bandWidths, ruleOverride } from "../responsive.js";
import { reshape } from "../shape.js";
import type { Grid, TileState, TilesetConfig, TilesetFile } from "../types.js";
import { naturalHeight, naturalRatio, type AlignX, type AlignY, type Sizing } from "./geometry.js";
import { renderOverride, type HostRule } from "./options.js";

interface RenderBase {
  sizing: Sizing;
  alignX: AlignX;
  alignY: AlignY;
}

/**
 * One grid per `(rows, columns)` for one base config, seed and loadSalt.
 *
 * **Why `(rows, columns)` is a sufficient key.** A config `reshape` derives from a
 * base differs from it in `rows` and `columns` and in nothing else — every other
 * field is the base's by reference. So under one `(base, seed, loadSalt)` two
 * derived configs with the same size are the same engine input, and `generate()`
 * being pure (**G1**) makes their grids equal. A change of base, seed or loadSalt
 * clears everything, because each is an input that could change every cell.
 *
 * What it buys: dragging a window back and forth across a breakpoint that changes
 * `columns` generates twice in total, not once per crossing. It holds at most one
 * grid per band.
 */
export class GridCache {
  #base: TilesetConfig | null = null;
  #seed = "";
  #loadSalt = 0;
  readonly #grids = new Map<string, Grid<TileState>>();
  /** How many times `generate()` has run. Read by tests, and by nothing else. */
  generations = 0;

  get(base: TilesetConfig, config: TilesetConfig, seed: string, loadSalt: number): Grid<TileState> {
    if (base !== this.#base || seed !== this.#seed || loadSalt !== this.#loadSalt) {
      this.#grids.clear();
      this.#base = base;
      this.#seed = seed;
      this.#loadSalt = loadSalt;
    }
    const key = `${config.rows}x${config.columns}`;
    let grid = this.#grids.get(key);
    if (grid === undefined) {
      grid = generate(config, seed, loadSalt);
      this.generations++;
      this.#grids.set(key, grid);
    }
    return grid;
  }
}

/**
 * The CSS that reserves a responsive tileset's height **before anything is
 * measured** — the server HTML, and the first client frame.
 *
 * Without it, the box would reserve the base shape's ratio and jump to the rule's
 * at the first measurement: a layout shift on every phone load of a page whose
 * hero has more rows on a phone, which is the headline use of rules. The server
 * cannot pick a rule in JavaScript because it does not know the width, but CSS can,
 * with a container query on the wrapper `<Tileset>` renders when rules exist.
 *
 * **One query per band, not per rule.** The value a band reserves is a property of
 * the whole cascade — `rows` from one rule, `sizing` from another — so it is
 * computed here by the same `activeRules`/`ruleOverride` the component uses after
 * measurement, and each band gets a query matching exactly its widths. Bounds are
 * inclusive, so each bound is a band of its own, `(width: 500px)`, between the
 * open intervals either side. The base shape comes first and unconditionally, for
 * a browser without container queries.
 *
 * `:not([data-measured])` retires every rule at the first measurement: after that
 * the box takes its height from its content, which is what keeps the canvas from
 * a half-pixel hairline (`Tileset.svelte`'s template comments). A ratio left
 * standing would override that height, because the box has `overflow: hidden`.
 *
 * Every value interpolated is a number from a validated rule and `id` is
 * `$props.id()`'s, so nothing a page author types reaches the stylesheet.
 */
export function reservationCss(
  id: string,
  file: TilesetFile,
  rules: readonly HostRule[],
  base: RenderBase,
): string {
  const sel = `[data-tileset-wrapper="${id}"]>[data-tileset-box]:not([data-measured])`;
  const value = (active: readonly HostRule[]): string => {
    const f = reshape(file, ruleOverride(active));
    const { sizing } = renderOverride(base, active);
    const g = { layout: f.layout, rows: f.config.rows, columns: f.config.columns, Wpx: 0, sizing };
    return sizing === "fixed"
      ? `height:${naturalHeight(g)}px`
      : `aspect-ratio:${naturalRatio(f.layout, f.config.rows)}`;
  };

  const set = new Set<number>();
  for (const r of rules) {
    if (r.minWidth !== undefined) set.add(r.minWidth);
    if (r.maxWidth !== undefined) set.add(r.maxWidth);
  }
  const bounds = [...set].sort((a, b) => a - b);

  let css = `${sel}{${value([])}}`;
  const band = (query: string, width: number): void => {
    css += `@container (${query}){${sel}{${value(activeRules(rules, width))}}}`;
  };
  for (let i = 0; i < bounds.length; i++) {
    const b = bounds[i]!;
    const prev = i === 0 ? null : bounds[i - 1]!;
    if (prev === null) {
      if (b > 0) band(`width < ${b}px`, b / 2);
    } else {
      band(`${prev}px < width < ${b}px`, (prev + b) / 2);
    }
    band(`width: ${b}px`, b);
  }
  const last = bounds[bounds.length - 1];
  if (last !== undefined) band(`width > ${last}px`, last + 1);
  return css;
}

/**
 * Detects a breakpoint that keeps flipping without the page asking it to.
 *
 * The one real feedback loop: a rule that adds rows makes the page tall enough to
 * need a scrollbar, the scrollbar takes ~15px of width, that moves the box back
 * across the breakpoint, the rows go, the scrollbar goes, and round again — at
 * frame rate. The picture is still a pure function of the width at every frame;
 * it is the width that is oscillating. So this does not hold the picture
 * (hysteresis would make it depend on history) — it names the cause in a
 * development build, and the README gives the fix: `scrollbar-gutter: stable`.
 *
 * Fires once per instance: `limit` alternations between two keys within `windowMs`.
 */
export class FlipFlop {
  readonly #changes: Array<{ key: string; at: number }> = [];
  #fired = false;

  constructor(
    readonly limit = 4,
    readonly windowMs = 1000,
  ) {}

  /** Record that the active key is now `key`. True the first time it looks like a loop. */
  record(key: string, now: number): boolean {
    const last = this.#changes[this.#changes.length - 1];
    if (last !== undefined && last.key === key) return false;
    this.#changes.push({ key, at: now });
    while (this.#changes.length > 0 && now - this.#changes[0]!.at > this.windowMs) this.#changes.shift();
    if (this.#fired || this.#changes.length < this.limit) return false;
    const recent = this.#changes.slice(-this.limit);
    const keys = new Set(recent.map((c) => c.key));
    if (keys.size !== 2) return false;
    this.#fired = true;
    return true;
  }
}

/**
 * The indices of rules that change only `cellSize` and hold only where the
 * tileset is fluid — rules that change nothing visible.
 *
 * Under `"fluid"` a cell is `Wpx * cellSize / referenceWidth`, and `reshape` keeps
 * the bleed in cells, so `referenceWidth` scales with `cellSize` and the two
 * cancel. The density knob under fluid is `columns`; `cellSize` is CSS px only
 * under `"fixed"`. That is the easiest mistake to make with rules, and it fails
 * silently, which is the case for a development warning.
 */
export function inertCellSizeRules(rules: readonly HostRule[], base: RenderBase): number[] {
  const out: number[] = [];
  const widths = bandWidths(rules);
  rules.forEach((rule, i) => {
    const onlyCellSize =
      rule.cellSize !== undefined &&
      rule.rows === undefined &&
      rule.columns === undefined &&
      rule.bleed === undefined &&
      rule.yOffset === undefined;
    if (!onlyCellSize) return;
    const everywhereFluid = widths
      .map((w) => activeRules(rules, w))
      .filter((active) => active.includes(rule))
      .every((active) => renderOverride(base, active).sizing === "fluid");
    if (everywhereFluid) out.push(i);
  });
  return out;
}
