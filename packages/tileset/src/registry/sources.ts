/**
 * The V1 Source presets — `04-operations.md` §5.2.
 *
 * A Source answers: *for this cell, what number?*
 *
 *     Source: (x, y, ctx) -> number in [0, 1]
 *
 * Pure, stateless, total. All Sources share one signature, with no RNG handle
 * threaded through the call (`02` §6).
 *
 * ## `vignette` is deliberately absent
 *
 * `04` §5.2 lists five presets and specifies four. `vignette` gets one sentence —
 * *"Normalized elliptical distance from the grid centre: 0 at the centre,
 * approaching 1 at the farthest corner"* — and no formula, and `05` §6.2's
 * enumeration of which built-ins prove their own totality covers `valueNoise` and
 * `gradient` and omits it.
 *
 * Implementing it would mean coining a formula in code, which is exactly what
 * `04` §5.3 rejects: *"two renderers written from a specification saying 'Perlin'
 * produce different images from the same config. That is not a weakened **G1**;
 * it is no **G1** at all, and no test vector table can be written for it."* The
 * same argument applies across time as well as across implementations.
 *
 * It is registered once `04` §5.2 carries a formula. Until then a config naming
 * it fails at `05` **X7** rather than rendering something invented.
 */

import { sincos } from "../angle.js";
import type { EvalCtx } from "../ctx.js";
import { DEV } from "../dev.js";
import { hash } from "../hash.js";
import { Registry, type ParamSchema } from "./registry.js";

const { imul } = Math;

export type SourceImpl = (
  params: Record<string, unknown>,
  x: number,
  y: number,
  ctx: EvalCtx,
) => number;

export interface SourceRegistration {
  name: string;
  params: ParamSchema;
  /**
   * **Invariant X5** — a Source declares whether it is stochastic.
   *
   * True when the output depends on the hash. `04` §8.4 requires it:
   * `reseedOnLoad` is inert on a Source that consumes no hash, and the editor
   * offers the flag only where it means something.
   *
   * A declaration rather than something derived, because deriving it means
   * inspecting whether the implementation calls `hash()` — a static-analysis
   * question with a wrong answer available in both directions (`05` §6.1).
   */
  stochastic: boolean;
  impl: SourceImpl;
}

export const sources = new Registry<SourceRegistration>("source");

/**
 * Emits `0`, always.
 *
 * A fixed value is expressed by setting the mapping's `min` equal to its `max`
 * (`04` §6.2). The alternative — a `value` parameter on the Source — puts two
 * controls in the UI that mean the same thing, and leaves undefined what happens
 * when they disagree.
 */
sources.register({
  name: "constant",
  params: {},
  stochastic: false,
  impl: () => 0,
});

/** `hash(effectiveSeed, operationId, x, y, salt)` directly. Each cell independent. */
sources.register({
  name: "random",
  params: {},
  stochastic: true,
  impl: (_p, x, y, ctx) => hash(ctx.effectiveSeed, ctx.operationId, x, y, ctx.salt),
});

/**
 * Spatially correlated noise: nearby cells receive nearby values. This is what
 * produces regions, bands, and waves rather than static.
 *
 * Transcribed from `04` §5.2's pseudocode without variation. **Nothing here is a
 * free choice** — `04` §5.3 pins it in full precisely because "noise" is a family
 * and not a function, and `05` §3.1 makes an unpinned Source a silent output
 * change waiting to happen: *"A background authored in March renders on a live
 * site in September. If `valueNoise`'s interpolation was tidied up in between,
 * that site's picture changed — silently, with no error, and with nobody having
 * touched the config."*
 *
 * Lacunarity is fixed at 2 and persistence at 0.5 rather than exposed: at this
 * grid resolution they have almost no legible effect, and every exposed parameter
 * is one more thing a conformant implementation must reproduce exactly.
 *
 * **Totality** — every corner value is in `[0, 1)`; bilinear weights sum to 1;
 * the amplitude-weighted mean is divided by the same weights. The result is
 * therefore in `[0, 1)` — inside **X6**'s `[0, 1]` with the upper end to spare,
 * since `hash` is itself half-open. Only `gradient` reaches `1`.
 *
 * **The per-octave salt derivation** exists so that octave 1 at lattice `(3, 4)`
 * is not the same number as octave 0 at lattice `(3, 4)`. Mixing through `imul`
 * rather than adding the octave index keeps an author's `salt++` from colliding
 * with an octave offset — and it is the pattern **X3** requires of any future
 * Source needing several draws per cell, rather than constructing a channel
 * string.
 */
sources.register({
  name: "valueNoise",
  params: {
    cellsPerFeature: { type: "number", exclusiveMin: 0 },
    octaves: { type: "integer", min: 1, max: 3 },
  },
  stochastic: true,
  impl: (p, x, y, ctx) => {
    const cellsPerFeature = p.cellsPerFeature as number;
    const octaves = p.octaves as number;

    let sum = 0;
    let norm = 0;

    for (let o = 0; o < octaves; o++) {
      const frequency = 2 ** o; // lacunarity fixed at 2
      const amplitude = 0.5 ** o; // persistence fixed at 0.5
      const oSalt = ctx.salt ^ imul(o + 1, 0x9e3779b1);

      const u = ((x + 0.5) * frequency) / cellsPerFeature;
      const v = ((y + 0.5) * frequency) / cellsPerFeature;
      const lx = Math.floor(u);
      const ly = Math.floor(v);
      const fx = u - lx;
      const fy = v - ly;

      const corner = (i: number, j: number): number =>
        hash(ctx.effectiveSeed, ctx.operationId, lx + i, ly + j, oSalt);

      const sx = smoothstep(fx);
      const sy = smoothstep(fy);

      const top = lerp(corner(0, 0), corner(1, 0), sx);
      const bottom = lerp(corner(0, 1), corner(1, 1), sx);
      const octaveValue = lerp(top, bottom, sy);

      sum += octaveValue * amplitude;
      norm += amplitude;
    }

    return sum / norm;
  },
});

/** `s(a) = a*a*(3 - 2*a)` — `04` §5.2, pinned exactly. */
function smoothstep(a: number): number {
  return a * a * (3 - 2 * a);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * A linear sweep across the Operation's extent, normalized over it end to end.
 *
 * Transcribed from `04` §5.2 in shape. `angle: 0` sweeps left to right;
 * `angle: 90` sweeps top to bottom, because `y` increases downward (`02` §5). Any
 * angle is legal; presets are an editor convenience, not a spec concern.
 *
 * **Reversal needs no parameter** — set the mapping's range with `min > max`.
 *
 * ## It reaches both ends of the range. It used to reach neither.
 *
 * The domain is the projection of the extent's **corner cells**, and the sample
 * is the cell's own index. Both are cell indexes, so the first cell projects onto
 * `pmin` and the last onto `pmax`, and `t` attains exactly `0` and exactly `1`.
 * A continuous `range: [0, 1]` therefore yields exactly 0 and exactly 1.
 *
 * **What it did before, and why that was wrong.** It measured the grid's *outer
 * edges* — projecting `(0, 0) .. (columns, rows)` — while sampling cell
 * *centres*, `(x + 0.5, y + 0.5)`. Ten rows have ten cells but only nine gaps
 * between their indexes, so dividing by ten left exactly half a cell unreachable
 * at each end: `t = (y + 0.5) / rows`, running `0.05 .. 0.95` over ten rows. A
 * `scale` gradient over `[0, 1]` gave a first row of visible tiles at 0.05 and a
 * last row at 0.95, where adjacent tiles miss touching by five percent of a cell.
 * The inset went as `0.5 / N`, so it was worst on exactly the small grids where
 * it is most visible.
 *
 * **Why cell indexes rather than cell centres.** The half-cell offset is a
 * constant vector added to every point, and `project` is linear, so it adds the
 * same `k = 0.5 * (dx + dy)` to the sample and to both ends of the domain, where
 * it cancels: `((p0 + k) - (pmin + k)) / ((pmax + k) - (pmin + k))`. Carrying it
 * is therefore not more correct, only more arithmetic — and measurably less
 * exact, since it adds `k` only to subtract it again.
 *
 * **Why it holds at every angle, not just the axis-aligned ones.** The sampled
 * cells form a lattice inside the box `[xs0, xs1] x [ys0, ys1]`, and a linear
 * functional attains its extremes over a box at the box's corners. Those four
 * corners *are* lattice points — real cells that really get sampled — so the
 * min and max of the sampled set are exactly `pmin` and `pmax`. Diagonals
 * included.
 *
 * **`sincos` is load-bearing, not tidiness.** `cos(90deg)` is `6.12e-17`, so
 * computing the direction with `Math.cos` leaks a column term into a vertical
 * sweep and the endpoints come out `2.47e-17` and `0.9999999999999994` instead of
 * `0` and `1` — the defect above, two decimal orders smaller but still not the
 * endpoint. It also gives a single-row extent a spurious non-zero span, so it
 * sweeps a band that has nothing to sweep across.
 *
 * ## On the extent, spanning, and clipped cells
 *
 * Normalization is across `ctx.extent` — the Operation's Selection extent, or the
 * whole grid where the Selection declares none. **G2 is intact**, and this is
 * where the distinction matters: G2's argument is that a gradient normalized over
 * *the visible region* would drift its midpoint off the viewport centre by
 * exactly the bleed (`04` §5.1), so the extent includes cells the renderer will
 * clip and is never trimmed to what is on screen. A Selection is not a viewport
 * — it is something the author drew — and a `rect` extent is taken unclamped for
 * that reason, so an overhanging rect still sweeps its whole declared width and
 * the visible part of it deliberately does *not* reach the ends of the range.
 *
 * A gradient over `selection: {type: "all"}` is unchanged in domain and moves
 * only by the endpoint fix above.
 *
 * **Totality** — the sampled cells lie within the extent, so the result is in
 * `[0, 1]` closed. **This is why X6 admits `1`**; see `evalSource`. The
 * zero-span guards cover a degenerate grid, an empty `cellList`, and a
 * single-row or single-column extent, all of which map to `0`.
 *
 * **Open, and not settled here:** `05` open question 3 asks whether `cos`/`sin`
 * are reproducible across runtimes. `sincos` closes the quarter turns by table,
 * but ECMAScript leaves transcendental precision implementation-defined, so
 * `cos(37deg)` may still differ in its last bits between runtimes or engine
 * versions. Consequences are confined to values landing exactly on a `steps`
 * boundary or a palette threshold — rare, real, and silent.
 */
sources.register({
  name: "gradient",
  params: { angle: { type: "number" } },
  stochastic: false,
  impl: (p, x, y, ctx) => {
    const { sin: dy, cos: dx } = sincos(p.angle as number);
    const project = (px: number, py: number): number => px * dx + py * dy;

    const { x: ex, y: ey, width: ew, height: eh } = ctx.extent;
    // An empty extent has no first or last cell to project, so `ex + ew - 1`
    // would fall *behind* `ex` and invert the domain. Guarded before it can.
    if (ew <= 0 || eh <= 0) return 0;

    // First and last cell index on each axis -- not the grid's outer edges.
    const x1 = ex + ew - 1;
    const y1 = ey + eh - 1;

    const corners = [
      project(ex, ey),
      project(x1, ey),
      project(ex, y1),
      project(x1, y1),
    ];
    const pmin = Math.min(...corners);
    const pmax = Math.max(...corners);

    const p0 = project(x, y);
    // Still reachable with a non-empty extent: one row swept vertically has a
    // first cell and a last cell, and they are the same cell.
    return pmax === pmin ? 0 : (p0 - pmin) / (pmax - pmin);
  },
});

/**
 * Evaluates a Source, asserting **X6** in development builds only.
 *
 * **Invariant X6 — a Source returns a finite number in `[0, 1]`, closed.**
 *
 * It was `[0, 1)`, half-open. `gradient` was changed to reach both ends of its
 * range, which means the far corner of its extent returns exactly `1`, so the
 * strict bound had to go. That is a real cost and it was paid here rather than
 * worked around, because the two ways round it are worse: nudging the endpoint to
 * just under `1` would leave `scale` at `0.9999999999999999`, which is not `1`
 * for `isIdentityTransform`'s exact comparison and so silently reintroduces
 * seams on a whole row; and normalizing over cell edges to keep `t < 1` is the
 * defect that was being fixed.
 *
 * **What relied on the strictness, and what was done about it** — both in
 * `mapping.ts`, both load-bearing:
 *
 * - the stepped `index = floor(t * steps)` reached `steps` at `t = 1` and
 *   overshot `max` by one whole step. It is clamped.
 * - the palette walk's `cumulative > target` was never true for the last entry
 *   at `t = 1`, so it fell out of the loop and returned `null` — which means
 *   *clear this cell*. A silently blanked cell, not a crash. It now falls back to
 *   the last positive-weight entry.
 *
 * `random` and `valueNoise` still return `[0, 1)`; a closed interval is a
 * superset, so neither moved.
 *
 * **The assertion also guards the extent contract.** A Selection declaring an
 * extent narrower than the cells it matches makes a spanning Source return
 * outside `[0, 1]`, and this is where that shows up — in dev, at the cell, rather
 * than as a clipped value nobody attributes to the registration.
 *
 * `05` §6.3 considered clamping a stray value at this exact point — one
 * comparison per cell per Operation, and every downstream proof holds
 * unconditionally — and **rejected it**: "The engine has one author and the bad
 * Source is that author's. Clamping hides the bug at the point it would
 * otherwise be visible and leaves it to surface as a rendering oddity weeks
 * later."
 *
 * **Accepted, not a defect:** a Source violating **X6** in a production build
 * produces undefined behaviour — a missing tile, or a rotation outside the
 * authored set.
 */
export function evalSource(
  registration: SourceRegistration,
  params: Record<string, unknown>,
  x: number,
  y: number,
  ctx: EvalCtx,
): number {
  const t = registration.impl(params, x, y, ctx);
  if (DEV && !(t >= 0 && t <= 1)) {
    throw new Error(
      `Source "${registration.name}" returned ${t} at (${x}, ${y}); ` +
        `05 X6 requires a finite number in [0, 1].`,
    );
  }
  return t;
}
