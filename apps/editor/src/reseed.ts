/**
 * Salts, rerolls, and the load flags — `09-editor.md` §8.
 *
 * §8.1 collects four affordances, and the fourth is categorically unlike the
 * other three:
 *
 * | Control              | Writes               | Scope                                 | Persisted |
 * | -------------------- | -------------------- | ------------------------------------- | --------- |
 * | **Seed**             | `config.defaultSeed` | everything                            | ✅        |
 * | **Operation reroll** | `Operation.salt`     | that Operation's Source and Selection | ✅        |
 * | **Asset reroll**     | `config.assetSalt`   | which variant each cell shows         | ✅        |
 * | **Load preview**     | nothing — a prop     | Operations with `reseedOnLoad: true`  | ❌        |
 *
 * The first three are edits. The fourth writes no field at all, which is why it
 * lives in editor state and reaches `<Tileset>` as a prop.
 */

import { sources, type Operation, type TilesetConfig } from "@tileset/core";

/**
 * `2³²`. `06` **C9** narrows a salt to an integer in `[0, 2³²)`.
 *
 * The literal appears here once. `DECISIONS.md` D10 records it as a constant owing an
 * entry even though `09` §8.3 answers it outright — "the editor increments by one
 * and wraps at 2³²".
 */
export const SALT_MODULUS = 2 ** 32;

/**
 * The reroll's arithmetic — §8.3, and it wraps rather than saturating.
 *
 * `06` §5.2 gives the failure the narrowing prevents, in this exact control:
 * *the editor's reroll button increments a salt; the author clicks it; the
 * config visibly changes; the picture does not.* A salt that saturated at
 * `2³² - 1` would produce it on the second click; one that exceeded the range
 * would produce it wherever a consumer truncated.
 *
 * `06` §5.1: an absent salt means `0`.
 */
export function nextSalt(salt: number | undefined): number {
  return ((salt ?? 0) + 1) % SALT_MODULUS;
}

/**
 * Whether an Operation's Source varies with the seed — `05` **X5**.
 *
 * **Read from the registry's declaration, never from a list of Source names**
 * (§8.4). A Source registered later declares its own answer and this keeps
 * working; a hardcoded list would be the thing that failed to notice, which is
 * the same argument ADR-001 makes for Blends.
 */
export function isStochastic(sourceType: string): boolean {
  return sources.get(sourceType).stochastic;
}

/**
 * Whether the **`reseedOnLoad` checkbox** is offered for this Operation.
 *
 * §8.4: offered only where the Source is stochastic, because `04` §8.4 and `05`
 * **X5** make the flag inert on `constant`, `gradient`, and `vignette` — and
 * `05` §6.1 records that a reroll control doing nothing "reads as a broken engine
 * rather than a mislabelled Source".
 *
 * This is also `06` §10.4's second diagnostic being *prevented* rather than
 * repaired: the editor cannot reach that state, so E1 holds.
 */
export function offersReseedOnLoad(op: Operation): boolean {
  return isStochastic(op.source.type);
}

/**
 * **The correction the editor must not make** — §8.4.
 *
 * A flagged Operation with a non-stochastic Source is *not* fully inert: the flag
 * also moves the Operation's `random` Selection (`04` §8.2). So the control is
 * hidden on the Source's declaration, and a flag already set is **left alone and
 * reported**, never silently cleared.
 *
 * Unreachable from editing and reachable by import, which is `06` §10.4's second
 * diagnostic exactly. The advisory is **E16**: it never blocks, never modifies
 * the file, and is never an error.
 */
export function inertFlags(config: TilesetConfig): Operation[] {
  return config.operations.filter((op) => op.reseedOnLoad === true && !isStochastic(op.source.type));
}

/**
 * Whether a fresh `loadSalt` could change the picture at all — §8.5.
 *
 * `04` §8.3: a config with the flag false throughout is byte-identical on every
 * load **regardless of** `loadSalt`. So the load-preview control is disabled
 * here, because "an enabled button that provably changes nothing is `05` §6.1's
 * complaint arriving one level out".
 *
 * Note this asks the *flags*, not the Sources. An Operation flagged over a
 * non-stochastic Source still moves its `random` Selection (§8.4), so it counts.
 */
export function loadVaries(config: TilesetConfig): boolean {
  return (
    config.reseedAssetsOnLoad === true || config.operations.some((op) => op.reseedOnLoad === true)
  );
}

/**
 * A `loadSalt` — `07` §9.3, including its warning.
 *
 * **`Math.random() * 2**32 | 0` is wrong**: `|` coerces to `int32` and yields a
 * negative number for half of all draws, "which `06` **C9** would reject as out
 * of range if it ever reached a field — and it never does, so nothing catches
 * it." The bug is invisible precisely because this value is never stored.
 */
export function drawLoadSalt(): number {
  return Math.floor(Math.random() * SALT_MODULUS);
}
