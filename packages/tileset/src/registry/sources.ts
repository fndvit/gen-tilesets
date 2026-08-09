/**
 * The V1 Source presets — `04-operations.md` §5.2.
 *
 * A Source answers: *for this cell, what number?*
 *
 *     Source: (x, y, ctx) -> number in [0, 1)
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
 * therefore in `[0, 1)`, satisfying **X6**.
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
 * A linear sweep across the grid, normalized over its full extent.
 *
 * Transcribed from `04` §5.2. `angle: 0` sweeps left to right; `angle: 90` sweeps
 * top to bottom, because `y` increases downward (`02` §5). Any angle is legal;
 * presets are an editor convenience, not a spec concern.
 *
 * **Reversal needs no parameter** — set the mapping's range with `min > max`.
 *
 * **On spanning and clipped cells.** Normalization is across `rows x columns` —
 * the *whole* grid, including cells the renderer will clip. This is **G2** and it
 * is not negotiable: a gradient normalized over the visible region only would
 * drift its midpoint off the viewport centre by exactly the bleed (`04` §5.1).
 *
 * **Totality** — cell centres lie strictly inside the corner extremes, so the
 * result is in `(0, 1)`. The `pmax === pmin` guard covers only a degenerate grid.
 *
 * **Open, and not settled here:** `05` open question 3 asks whether `cos`/`sin`
 * are reproducible across runtimes. ECMAScript leaves transcendental precision
 * implementation-defined, so `cos(37deg)` may differ in its last bits between
 * runtimes or engine versions. Consequences are confined to values landing
 * exactly on a `steps` boundary or a palette threshold — rare, real, and silent.
 */
sources.register({
  name: "gradient",
  params: { angle: { type: "number" } },
  stochastic: false,
  impl: (p, x, y, ctx) => {
    const radians = ((p.angle as number) * Math.PI) / 180;
    const dx = Math.cos(radians);
    const dy = Math.sin(radians);
    const project = (px: number, py: number): number => px * dx + py * dy;

    const corners = [
      project(0, 0),
      project(ctx.columns, 0),
      project(0, ctx.rows),
      project(ctx.columns, ctx.rows),
    ];
    const pmin = Math.min(...corners);
    const pmax = Math.max(...corners);

    const p0 = project(x + 0.5, y + 0.5);
    return pmax === pmin ? 0 : (p0 - pmin) / (pmax - pmin);
  },
});

/**
 * Evaluates a Source, asserting **X6** in development builds only.
 *
 * `05` §6.3 considered clamping a stray `1.0` at this exact point — one
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
  if (DEV && !(t >= 0 && t < 1)) {
    throw new Error(
      `Source "${registration.name}" returned ${t} at (${x}, ${y}); ` +
        `05 X6 requires a finite number in [0, 1). 1.0 is not a legal return value.`,
    );
  }
  return t;
}
