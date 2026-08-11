/**
 * The memorable seed — `09-editor.md` §8.2.
 *
 * `02` §6.6: the author never sees a hash. They type a string — `"sunset-3"`,
 * `"draft-b"` — and that is the whole interface. §8.2 adds that the editor offers
 * a **generated memorable seed in word-word-number form**, because "the value of
 * a seed is that it can be written down and returned to, and random hex defeats
 * that".
 *
 * `config.defaultSeed` is required and length >= 1 (`06` §5), so it is never
 * empty and this always returns something usable.
 */

/**
 * The word lists are **UI constants with no authority anywhere.** Nothing cites
 * them, no output depends on which words are in them, and adding or removing one
 * moves no picture — a seed is a string and every string hashes (`02` §6.6).
 * Recorded in `DECISIONS.md` because they are constants in editor code that no
 * spec section supplies.
 *
 * Chosen to be short, unambiguous when spoken aloud, and free of characters that
 * would need escaping anywhere. There is no constraint on the seed's charset:
 * `06` §5 asks only for length >= 1.
 */
const ADJECTIVES = [
  "amber", "brisk", "calm", "dusk", "ember", "fern", "glass", "hazel",
  "ivory", "jade", "kelp", "linen", "mossy", "north", "opal", "pale",
  "quiet", "rust", "slate", "tidal", "umber", "vivid", "warm", "zephyr",
];

const NOUNS = [
  "arbor", "basin", "cove", "delta", "eddy", "fjord", "glade", "harbor",
  "inlet", "juniper", "knoll", "lagoon", "meadow", "nook", "orchard", "prairie",
  "quarry", "ridge", "shoal", "thicket", "upland", "vale", "willow", "yard",
];

/** Exclusive of `n`. `Math.random()` returns `[0, 1)`, so this never reaches it. */
function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

/**
 * `word-word-number`, e.g. `"slate-lagoon-7"`.
 *
 * **This draws a random number, and that is correct here.** `02` §4.2 forbids
 * `Math.random()` inside the *engine*; this is the editor choosing an authoring
 * value, which then travels into the file as an ordinary string and is hashed
 * deterministically like any other. `07` §9.3's warning about `| 0` does not
 * apply — that governs drawing a `uint32` `loadSalt`, which is §8.5's control and
 * a different affordance entirely (§8.1).
 */
export function memorableSeed(): string {
  // Two digits keeps it short enough to say out loud and write down, which is
  // the entire justification for the format (§8.2). A UI constant.
  const n = Math.floor(Math.random() * 100);
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${n}`;
}
