import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

/**
 * A test config separate from `vite.config.ts`, and deliberately **without the
 * Svelte plugin**.
 *
 * Vitest 2 bundles Vite 5 while the app builds on Vite 8, and
 * `@sveltejs/vite-plugin-svelte@7` throws at startup under the older one. The
 * tests here are plain TypeScript — `derive.ts`, `fields.ts`, `document.ts` —
 * and need no Svelte transform, so dropping the plugin costs nothing today.
 *
 * **What it does cost:** `.svelte` components cannot be unit-tested until the
 * two agree on a Vite major. `NumericInput.svelte`'s commit-on-parse behaviour
 * (**E5**) is therefore checked by hand rather than by a test. The logic it
 * calls — `fields.ts` and the transitions — is covered.
 */
const enginePkg = JSON.parse(
  readFileSync(new URL("../../packages/tileset/package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  define: {
    // E2, same single source of truth as `vite.config.ts`: the version is read
    // from the package the editor previews with, never written down twice.
    __ENGINE_VERSION__: JSON.stringify(enginePkg.version),
  },
});
