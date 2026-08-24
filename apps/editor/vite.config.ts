import { readFileSync } from "node:fs";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

/**
 * **Invariant E2** — *the editor's preview component and its `engineVersion`
 * writer come from a single pinned version of the engine and renderer package.*
 *
 * `09` §3.1: `engineVersion` is truthful only if they are the same package. "An
 * editor previewing with engine 1.5 while stamping 1.4 shows the author a
 * picture no consumer of that file will get." This is the *one implementation* principle (`CLAUDE.md`) applied to the
 * editor's own build, and the cheapest instance of it in the package: one
 * dependency entry rather than two.
 *
 * Read from the workspace package that `@fndvit/gen-tilesets` resolves to, so the
 * number the editor stamps and the code it previews with cannot diverge. Writing
 * it by hand anywhere would create the second source of truth E2 exists to
 * prevent.
 */
const enginePkg = JSON.parse(
  readFileSync(new URL("../../packages/tileset/package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  plugins: [svelte()],
  define: {
    __ENGINE_VERSION__: JSON.stringify(enginePkg.version),
  },
  // The demo holds 5173, so the two can run side by side.
  server: { port: 5174 },
});
