/**
 * What a Source's param does, for the hint on its label — `DESIGN_SYSTEM.md`
 * *Operation stepper*, the Pattern well (item 12).
 *
 * Kept by Source type and then by param, because a param name says nothing on
 * its own: `octaves` could belong to any Source. A param with no entry gets the
 * range hint alone (`ParamControl`), so a Source registered later still works
 * with no change here (**E9**); this map only adds words.
 *
 * The text is the N1 mock's (Pol, N0: "each label gets a hint that says what it
 * does"). The longer explanation, with the measured shares, is the "How noise
 * works" popover (`noise-explainer.ts`), because a hint opens only on hover.
 */
export const SOURCE_PARAM_HINTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  valueNoise: {
    cellsPerFeature:
      "About how many cells across one patch is. Small values speckle, large values make broad areas. It does not change how much each entry paints.",
    octaves:
      "How many layers of finer patches are added on top. More detail makes the middle entries more common and the first and last rarer.",
  },
};

/** The hints for one Source's params, by param name; empty when it has none. */
export function sourceParamHints(sourceType: string | null): Readonly<Record<string, string>> {
  return (sourceType === null ? undefined : SOURCE_PARAM_HINTS[sourceType]) ?? {};
}
