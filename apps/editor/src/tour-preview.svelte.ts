/**
 * How much of the file the preview draws while the tour builds Mosaic
 * (`tour.ts`, "Building Mosaic"). `Tour.svelte` writes it on each step and
 * clears it when the tour ends; `App.svelte` reads it into `shown`.
 *
 * A rune of its own rather than a prop through `App`, because the tour is
 * mounted beside the preview, not inside it, as `opening.svelte.ts` is for the
 * same reason. Only the picture reads it: the file, undo, advisories and the
 * export never see a staged file, so the tour can't change what is saved.
 *
 * A module holding a rune, with no logic worth a unit test; the logic is
 * `stagedFile` in `tour.ts`, which is tested.
 */

/** How many operations the preview draws, or `null` for all of them (no tour building). */
let kept = $state<number | null>(null);

export const tourPreview = {
  get kept(): number | null {
    return kept;
  },
  set kept(value: number | null) {
    kept = value;
  },
};
