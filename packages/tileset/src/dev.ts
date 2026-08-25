/**
 * Development-build detection.
 *
 * `05` §6.3 splits behaviour on it: development builds assert `0 <= t < 1` after
 * every Source evaluation and throw on violation; production builds do neither.
 * The same split governs `07` §4.3's asset-failure reporting, and since v0.2.0
 * `<Tileset>`'s validation of its `file` prop (`08` **S3**).
 *
 * **`08` open question 3 is genuinely open** — "How does the component know
 * whether it is a development or a production build? A bundler flag ties the
 * package to one toolchain; a prop makes it a host lie waiting to happen; always
 * throwing loses `07` §4.3's deliberate production posture. Resolve during
 * implementation."
 *
 * This is a provisional answer, not that resolution. It reads the two signals
 * every mainstream toolchain sets and defaults to *off*, so a host that sets
 * neither gets production behaviour rather than throwing in front of a visitor.
 *
 * ## Why it is shaped like this and not more defensively
 *
 * **The bundler read must be foldable, and that is a measured requirement.** Vite
 * substitutes `import.meta.env` with a literal object at build time, after which
 * everything below collapses to `false` — which is what lets it drop the `DEV`
 * branches *and* the modules they reach. `<Tileset>` imports `assertValidFile`,
 * which pulls in the whole of `validate.ts`; with this expression `apps/demo`
 * builds to 58.56 kB, and with the earlier `try`/`catch` IIFE — which no bundler
 * folds — it built to 68.77 kB, 3.2 kB of it gzipped, entirely unreachable. The
 * old form's comment claimed both branches were "statically analysable". They
 * were not, and the number is the reason this one is written the way it is.
 *
 * So: **both reads of `import.meta.env` are inline, with no `?.` on
 * `import.meta` and no `try` around them.** Each constraint was measured:
 * - Hoisting the read into a `const` and testing that (`const env =
 *   import.meta.env; env && env.DEV`) costs the whole 10 kB back. The
 *   substitution puts an object *literal* there, and esbuild does not
 *   constant-propagate a literal through a binding — it folds the expression it
 *   can see. So the reads stay inline, repetition and all.
 * - A `try` block is opaque to dead-code elimination.
 * - An optional chain on `import.meta` itself is text the substitution does not
 *   match.
 *
 * None of the three is needed for safety: `&&` short-circuits, so where
 * `import.meta.env` is absent the expression is `undefined` rather than a
 * `TypeError`, and `import.meta` always exists here — this package is
 * `"type": "module"` and ships ESM only.
 *
 * The `NODE_ENV` fallback keeps its `try` — it is only reached when the bundler
 * signal is absent, so it costs nothing to fold, and `globalThis.process` is the
 * one access here that can genuinely be hostile.
 *
 * If you edit this expression, **re-measure**. The gate is in the plan and in
 * `CHANGELOG.md`: build `apps/demo` and grep the output for a `validate.ts`
 * string such as `SCHEMA_VERSION_MISSING`. If it is present, the fold broke.
 */

/**
 * The bundler's answer, or `undefined` where there is no bundler.
 *
 * `unknown` rather than `boolean` because a host may define `DEV` as something
 * else entirely; the test below treats anything that is not a boolean as *not
 * answered* and falls through.
 */
const fromBundler: unknown =
  (import.meta as { env?: { DEV?: unknown } }).env &&
  (import.meta as { env?: { DEV?: unknown } }).env?.DEV;

export const DEV: boolean =
  typeof fromBundler === "boolean"
    ? fromBundler
    : (() => {
        try {
          // Node, and bundlers that define `process.env.NODE_ENV`.
          const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
            .process?.env;
          if (env?.NODE_ENV !== undefined) return env.NODE_ENV !== "production";
        } catch {
          /* process unavailable */
        }
        return false;
      })();
