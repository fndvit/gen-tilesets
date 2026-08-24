import { configDefaults, defineConfig } from "vitest/config";

/**
 * `svelte-package` stages a compiled copy of the whole package in
 * `.svelte-kit/__package__/` on its way to `dist`, and it leaves that copy
 * behind. Vitest's default `include` matches the `.test.js` files in it, so
 * after any build every test ran **twice** — once from `src`, once from a build
 * artifact that goes stale the moment a source file changes.
 *
 * They passed, which is what made it worth writing down: the failure mode is not
 * a red run but a green one covering code nobody edited.
 *
 * Excluded here rather than only pruned in `build:prune`, because the test run
 * must be correct whatever happens to be on disk — an interrupted build leaves
 * the same directory behind.
 */
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/.svelte-kit/**"],
  },
});
