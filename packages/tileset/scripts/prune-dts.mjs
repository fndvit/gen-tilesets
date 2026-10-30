/**
 * Removes `import "./tileset.css";` from the built `*.svelte.d.ts` files.
 *
 *   node scripts/prune-dts.mjs   (run by `pnpm build`)
 *
 * `svelte-package` copies a component's side-effect imports into its type file.
 * The `.js` needs the CSS import (`tileset.css` says why); the type file does
 * not, and TypeScript 6 checks side-effect imports by default
 * (`noUncheckedSideEffectImports`), finds no declarations for a `.css` file, and
 * fails a consumer's typecheck in our file. Seen with `svelte-check` in a
 * throwaway Vite + Svelte app on TypeScript 6.0.3 with `skipLibCheck: false`,
 * 0.9.0.
 *
 * Rejected: shipping a `tileset.css.d.ts`. Whether TypeScript resolves
 * `./tileset.css` to it depends on the consumer's `allowArbitraryExtensions`,
 * which is theirs to set, so it would fix some consumers and not others.
 *
 * Loud when there is nothing to remove: that means `svelte-package` stopped
 * copying the import, and this script can go.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = new URL("../dist/render/", import.meta.url).pathname;
const line = /^import "\.\/tileset\.css";\n/m;
let pruned = 0;
for (const name of readdirSync(dir)) {
  if (!name.endsWith(".svelte.d.ts")) continue;
  const path = join(dir, name);
  const text = readFileSync(path, "utf8");
  if (!line.test(text)) continue;
  writeFileSync(path, text.replace(line, ""));
  pruned++;
}
if (pruned === 0) {
  throw new Error("prune-dts: no `import \"./tileset.css\"` in any dist/render/*.svelte.d.ts. If svelte-package no longer copies it, delete this script.");
}
console.log(`prune-dts: removed the CSS import from ${pruned} type file(s).`);
