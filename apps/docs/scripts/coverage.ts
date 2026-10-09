/**
 * Fails the docs build when a source file has no module page.
 *
 * A file counts as documented when some page's `**Written from:**` paragraph names it by its
 * full repo-relative path (`packages/tileset/src/mapping.ts`). A bare basename is not enough:
 * `mapping.ts`, `assets.ts` and `index.ts` each exist in both the package and the editor, so a
 * suffix match would let one page silently cover two files.
 *
 * Runs with Node's built-in type stripping (Node ≥ 22.18), so it needs no loader or build step.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const docsRoot = resolve(import.meta.dirname, "..");
const repoRoot = resolve(docsRoot, "../..");
const pagesRoot = join(docsRoot, "src/content/docs");
const sourceRoots = ["packages/tileset/src", "apps/editor/src"];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const sources = sourceRoots
  .flatMap((root) => walk(join(repoRoot, root)))
  .map((p) => relative(repoRoot, p))
  .filter((p) => /\.(ts|svelte)$/.test(p) && !/\.test\.ts$/.test(p) && !p.endsWith(".d.ts"))
  .sort();

// Only module pages count. Concept pages also name the files they synthesise, but a concept page
// that mentions `validate.ts` in passing is not that file's documentation.
const moduleSections = ["engine/", "renderer/", "editor/"];
const pages = walk(pagesRoot).filter(
  (p) => /\.mdx?$/.test(p) && moduleSections.some((d) => relative(pagesRoot, p).startsWith(d)),
);

const named = new Map<string, string[]>();
for (const page of pages) {
  const text = readFileSync(page, "utf8");
  const at = text.indexOf("**Written from:**");
  if (at < 0) continue;
  // Files named after "call sites" were read for context, not documented, so they do not count.
  const paragraph = text.slice(at).split(/\n\s*\n/)[0].split("call sites")[0];
  for (const source of sources) {
    if (paragraph.includes(source)) {
      named.set(source, [...(named.get(source) ?? []), relative(pagesRoot, page)]);
    }
  }
}

const missing = sources.filter((s) => !named.has(s));
if (missing.length > 0) {
  console.error(`docs coverage: ${missing.length} of ${sources.length} source files have no page.`);
  console.error("Name each in some page's **Written from:** line, by its full repo-relative path:");
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}
console.log(`docs coverage: all ${sources.length} source files have a page.`);
