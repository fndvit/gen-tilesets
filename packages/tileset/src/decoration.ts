/**
 * Decorations — one authored style, many placements.
 *
 * ## The problem this exists for
 *
 * A page has a couple of tailor-made tilesets *plus* a scattering of small tile
 * decorations around it: a 2x2 block in a corner, a stepped 3x4 cluster beside a
 * heading, an L of three cells under a photo. A dozen of those are visibly one
 * visual language — one palette, one set of tile shapes, one tile size — and
 * differ only in **how many cells they occupy**.
 *
 * Without this module each one needs its own `TilesetFile`, because `rows` and
 * `columns` are `TilesetConfig` fields and `cellSize`/`referenceWidth` are
 * `Layout` fields. A dozen decorations is then a dozen files carrying a dozen
 * copies of the same `tiles` array and the same assets, which drift apart the
 * first time one is edited.
 *
 * ## Why one config can serve every size
 *
 * Because the data model is *already* size-independent everywhere except two
 * Selections. `registry/selections.ts` flags `rect` and `cellList`
 * `coordinateBound: true` — they hold literal cell coordinates and are
 * "orphaned" by a resize — while `all`, `checkerboard`, `everyNth` and `random`
 * are rule-based and survive one. Everything else in a config (`tiles`, every
 * `TileAsset`, `defaultSeed`, `assetSalt`, `reseedAssetsOnLoad`, every mapping,
 * blend and target) needs no rewrite at a different `rows`/`columns`.
 *
 * So "the Operations are exactly the same, only the size changes" was true of
 * the model all along. It was merely not *expressible*, because the size sits
 * inside the thing being shared. {@link decorationFile} is that expression and
 * nothing more: it overrides four numbers.
 *
 * **Variation between two decorations of the same size is the `seed`**, which is
 * already a `<Tileset>` prop and already a parameter of `generate()`. A
 * different seed re-rolls every Operation *and* the asset walk, through
 * `effectiveSeeds`. Nothing here rewrites a salt, and nothing here needs to:
 * this module deliberately has no opinion about randomness.
 *
 * ## What a decoration style must be
 *
 * An ordinary `TilesetFile`, authored in the ordinary editor, subject to one
 * constraint and one convention:
 *
 * - **Constraint:** no `coordinateBound` Selection. {@link decorationStyleErrors}
 *   is that check, and it is a *separate function* for exactly the reason
 *   `validate()` is separate from `generate()` (`06` **C5**) — see its header.
 * - **Convention:** a `{tileId: null}` entry in some palette, so emptiness is
 *   generated rather than painted. `04` §6.3 makes that the "clear this cell"
 *   mechanism, and it is what gives each spot its own silhouette from its own
 *   seed. Not enforced: a style without one is a solid block, which is a
 *   legitimate decoration.
 *
 * One caveat worth knowing, which is documentation rather than a defect.
 * `gradient` takes its domain from `ctx.extent`, which defaults to the whole
 * grid — so a gradient under `selection: {type: "all"}` **renormalizes per
 * decoration**: a ramp authored across 40 columns becomes a 3-step ramp in a
 * 3-column spot. `valueNoise` does not, because it samples grid-absolute
 * coordinates, so its feature size in cells is invariant and a decoration keeps
 * the grain of the page-scale tileset it was authored beside.
 */

import { selections } from "./registry/selections.js";
import type { TilesetFile } from "./types.js";

/**
 * One placement of a decoration style. Three numbers, and deliberately not a
 * `Layout`: `referenceWidth` and `yOffset` are *derived* here rather than
 * offered, because for a decoration there is exactly one right answer to each
 * and letting a caller supply them is letting them supply a wrong one.
 */
export interface Decoration {
  rows: number;
  columns: number;
  /**
   * Design px per tile, which is CSS px at a box of `columns * cellSize` — see
   * {@link decorationFile}'s zero-bleed note for why those two coincide here
   * and not in a general tileset.
   */
  cellSize: number;
}

/**
 * `(style, decoration) -> TilesetFile`. A pure transform, overriding four
 * numbers and passing every other field through **by reference**.
 *
 * Sharing `tiles` and `operations` rather than cloning them is the point of the
 * module: twelve decorations hold one `tiles` array between them, so there is
 * nothing to drift. It is safe because nothing downstream mutates a config —
 * `generate()` is pure and the editor's only write path replaces whole files.
 *
 * **It validates nothing**, mirroring `06` **C5**: `generate()` trusts its input
 * and validation is a separate function off the critical path. The separate
 * function here is {@link decorationStyleErrors}.
 *
 * ## The four overrides, and why each is not a parameter
 *
 * `rows` and `columns` are the decoration's, obviously. The other two are
 * derived, and both derivations are load-bearing:
 *
 * **`referenceWidth = columns * cellSize` — zero bleed, on purpose.** In a
 * page-scale tileset `referenceWidth` is stored rather than derived precisely
 * *because* it differs from `columns * cellSize`, and `02` §7.2 calls that
 * difference the intentional bleed: the design overhangs its box and the
 * overhang is clipped. A decoration has no design for a bleed to belong to — it
 * is a small block of whole cells with an edge the page can see — so the bleed
 * is zero, and three exactnesses follow from that rather than from care:
 * `originX` is exactly 0 (`render/geometry.ts`), `scaleFactor` is exactly 1 at a
 * box of `columns * cellSize` px, and `uniformGeometry`'s `presentScale` is
 * exactly 1 at integer DPR. The whole subject of `SUBPIXEL-GEOMETRY.md` is
 * *absent* in a decoration at integer DPR rather than merely small, and
 * `decoration.test.ts` asserts that rather than asserting the belief.
 * `apps/demo/src/Square2x2.svelte` chose zero bleed for the same reason from the
 * opposite direction: it wanted the residual to be the only thing that could
 * move an edge.
 *
 * **`yOffset = 0`.** `yOffset` shifts the grid up and clips row 0's top, which
 * is a thing a full-bleed hero wants and a 3x3 block in a margin never does: it
 * would shave the top of a decoration whose top edge is visible against the
 * page. Carrying the style's value through would import a page-scale design
 * decision into a context where it can only be wrong.
 *
 * `horizontalAlignment` carries through untouched. It is authoring metadata read
 * by neither engine nor renderer (`02` §7.3), and at zero bleed there is no
 * parity for it to describe.
 */
export function decorationFile(style: TilesetFile, d: Decoration): TilesetFile {
  return {
    ...style,
    config: { ...style.config, rows: d.rows, columns: d.columns },
    layout: {
      ...style.layout,
      cellSize: d.cellSize,
      referenceWidth: d.columns * d.cellSize,
      yOffset: 0,
    },
  };
}

/**
 * The one check a decoration style can fail: an Operation whose Selection is
 * `coordinateBound`. Returns one message per offending Operation, in stack
 * order; an empty array means the style is usable at any size.
 *
 * **Separate from {@link decorationFile}, for `06` **C5**'s reason.** The
 * transform trusts its input exactly as `generate()` does, and this is what
 * makes that trust earned. `<TileDecoration>` calls it under `DEV` and throws,
 * which is the same development-loud / production-trusting arrangement
 * `<Tileset>` has with `assertValidFile`.
 *
 * **It reads the registry flag, never a list of names.** `selections.ts` gives
 * the reason on the declaration itself: the registry is open, so a table of
 * names here would silently misclassify anything registered later — and
 * misclassify it in the safe-looking direction. `apps/editor/src/orphans.ts`'s
 * `atRisk()` reads the same flag the same way for the same reason; this is that
 * predicate applied to a different question, not a second copy of its
 * semantics.
 *
 * **Why `string[]` and not `ValidationError[]`.** `ErrorCode` in `validate.ts`
 * is a closed union, and widening it would advertise a code `validate()` can
 * never emit — a coordinate-bound Selection is perfectly valid in a tileset and
 * is only wrong in *this* use. The failure belongs to the decoration contract,
 * not to the schema, so it is stated in prose and kept out of the schema's
 * vocabulary.
 *
 * An unrecognised Selection type is skipped rather than reported: `06` §10.3
 * raises `UNKNOWN_TYPE_NAME` and that is the whole of **X7**'s enforcement.
 * Reporting it here too would give one defect two voices, and calling
 * `selections.get` on it would throw where this function's entire job is to
 * return findings.
 */
export function decorationStyleErrors(style: TilesetFile): string[] {
  const out: string[] = [];
  for (const op of style.config.operations) {
    const type = op.selection.type;
    if (!selections.has(type)) continue;
    if (!selections.get(type).coordinateBound) continue;
    out.push(
      `Operation "${op.id}" uses the coordinate-bound Selection "${type}", ` +
        `which holds literal cell coordinates and so cannot be reused at another size. ` +
        `A decoration style may only use procedural Selections ` +
        `(${selections
          .all()
          .filter((s) => !s.coordinateBound)
          .map((s) => s.name)
          .join(", ")}).`,
    );
  }
  return out;
}
