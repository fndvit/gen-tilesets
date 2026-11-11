/**
 * What a Source's or a Selection's param does, for the hint on its label —
 * `DESIGN_SYSTEM.md` *Operation stepper*, the Pattern well (item 12).
 *
 * Kept by type and then by param, because a param name says nothing on its
 * own: `octaves` could belong to any Source, and `n` belongs to both Every Nth
 * and Row/Column. A param with no entry gets the range hint alone
 * (`ParamControl`), so a type registered later still works with no change here
 * (**E9**); these maps only add words.
 *
 * The Source text is the N1 mock's (Pol, N0: "each label gets a hint that says
 * what it does"). The longer explanation, with the measured shares, is the "How
 * noise works" popover (`noise-explainer.ts`), because a hint opens only on
 * hover.
 */
export const SOURCE_PARAM_HINTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  valueNoise: {
    cellsPerFeature:
      "About how many cells across one patch is. Small values speckle, large values make broad areas. It does not change how much each entry paints.",
    octaves:
      "How many layers of finer patches are added on top. More detail makes the middle entries more common and the first and last rarer.",
  },
};

/**
 * The Selection hints. Only Every Nth has one: it counts cells row after row,
 * so the same N draws diagonals or stripes depending on the column count, and
 * nothing in the picture says why (B-009, Block 1: Pol chose "accept and
 * explain" over counting against a fixed width). The words sit on `n` because
 * that is the param whose picture depends on the width; `offset` only shifts
 * it. Row/Column needs no hint: its N is in the name.
 */
export const SELECTION_PARAM_HINTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  everyNth: {
    n: "Counts cells left to right, row after row, and selects every Nth. The count carries on into the next row, so the picture depends on the column count: with N = 3, 10 columns make diagonals and 9 make vertical stripes.",
  },
};

/** The hints for one Source's params, by param name; empty when it has none. */
export function sourceParamHints(sourceType: string | null): Readonly<Record<string, string>> {
  return (sourceType === null ? undefined : SOURCE_PARAM_HINTS[sourceType]) ?? {};
}

/** The hints for one Selection's params, by param name; empty when it has none. */
export function selectionParamHints(selectionType: string | null): Readonly<Record<string, string>> {
  return (selectionType === null ? undefined : SELECTION_PARAM_HINTS[selectionType]) ?? {};
}
