/**
 * What each editable numeric field admits — `06-config-schema.md` §5, §8.
 *
 * **One definition, two callers.** A control asks `parse()` whether the text it
 * is holding may be committed; the transition in `document.ts` asks the same
 * function whether the value may land. If the two carried separate copies of the
 * range they would drift, and the drift would show as a control that refuses a
 * value the file would have accepted, or worse, one that accepts a value
 * `validate()` would reject — which **E15** calls a defect in the editor's edit
 * vocabulary rather than an author error.
 *
 * ## Refusal, never coercion
 *
 * `06` §9.2: validation never coerces, and `02` §7.4 makes `yOffset` the most
 * tempting exception explicitly:
 *
 * > **Read "clamped" as the editor's constraint on input, not as something a
 * > loader does.** An earlier revision of this paragraph said the value is
 * > clamped, which invited a loader to accept `1.4` and quietly read it as
 * > `0.999…`.
 *
 * So `1.4` in `yOffset` is **refused**, not rewritten. `02` §7.4 gives the
 * failure that prevents: "a loader that silently rewrites a value produces a
 * picture the file does not describe, and the author's next save writes the
 * rewritten value back over their own." `09` §7.5 repeats the argument for the
 * authoring ranges of Step 6 — clamping typed input would be `06` §9.2's
 * coercion "performed in the one place the author is watching".
 */

/**
 * `null` means *do not commit this*: either the text is not a number yet, or the
 * number it denotes is outside what `06` admits for this field.
 *
 * The two cases are deliberately not distinguished. **E5** treats them
 * identically — the control holds its text and the file keeps its last legal
 * value — and a caller that branched on the difference would be deciding
 * something neither `06` nor `09` asks it to decide.
 */
export type ParseResult = number | null;

/** Rejects `""`, whitespace, `NaN`, `Infinity`, and JS's more generous coercions. */
function toFiniteNumber(text: string): ParseResult {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  // Number("") is 0 and Number(" ") is 0, both handled above. Number("1.") is 1,
  // which is correct to commit -- E5's own example has the *control* still
  // holding "1." while the file holds a legal number.
  return Number.isFinite(n) ? n : null;
}

/** `06` §5: `rows` is an integer >= 1. */
export function parseRows(text: string): ParseResult {
  const n = toFiniteNumber(text);
  if (n === null || !Number.isInteger(n) || n < 1) return null;
  return n;
}

/** `06` §8: `cellSize` is a number > 0, finite. Design px; cells are square. */
export function parseCellSize(text: string): ParseResult {
  const n = toFiniteNumber(text);
  if (n === null || n <= 0) return null;
  return n;
}

/**
 * `06` §8: `referenceWidth` is a number > 0, finite.
 *
 * No upper bound and no relation to `columns * cellSize` — `02` §7.2 is emphatic
 * that the two differ and that the difference is the intentional bleed. `06` §8
 * "validates the four Layout fields independently and has no cross-field rule".
 */
export function parseReferenceWidth(text: string): ParseResult {
  const n = toFiniteNumber(text);
  if (n === null || n <= 0) return null;
  return n;
}

/**
 * `06` §8: `yOffset` is a number in `[0, 1)` — **half-open**.
 *
 * `02` §7.4: "an offset of exactly one cell would be indistinguishable from
 * deleting row 0, which would let two different configs produce identical
 * output." So `1` is refused along with `1.4`, and for a better reason than
 * range-checking.
 */
export function parseYOffset(text: string): ParseResult {
  const n = toFiniteNumber(text);
  if (n === null || n < 0 || n >= 1) return null;
  return n;
}

/**
 * What a control shows when it reverts — the file's current value, formatted.
 *
 * Plain `String(n)` rather than a fixed precision: the file holds what the author
 * typed, and rounding it for display would make the control disagree with the
 * document panel beside it.
 */
export function format(value: number): string {
  return String(value);
}

/**
 * `06` §6, `03` §4.1: a `TileAsset.weight` is a number `>= 0` and finite.
 *
 * **Zero is legal** and means *listed but never chosen* — `04` §6.3's walk uses
 * a strict comparison, so a zero-weight entry can never win. The Tile-level
 * constraint that its weights sum `> 0` is not this function's: it depends on
 * the other assets, so it lives in the transition (`09` §10.2).
 */
export function parseWeight(text: string): ParseResult {
  const n = toFiniteNumber(text);
  if (n === null || n < 0) return null;
  return n;
}
