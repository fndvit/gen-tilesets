#!/usr/bin/env node
/**
 * Change entries → CHANGELOG.md.
 *
 * Every task writes one file under `docs/changes/` (see `docs/Batch-workflow.md`, "Change
 * entries"), so parallel branches never edit a shared log. At release, the `Package: yes`
 * entries are folded into a new `CHANGELOG.md` section. This script checks the entries and
 * drafts that section; a person then edits the draft into the changelog's prose voice.
 *
 * Usage:
 *   node scripts/changelog.mjs check
 *   node scripts/changelog.mjs draft <X.Y.Z> [--title "<subtitle>"] [--write]
 *   (both take --root <dir>, for trying it on a copy of the repo)
 *
 * `check` exits 1 if any entry is malformed. `draft` prints the section, or with --write inserts
 * it above the newest version in CHANGELOG.md; it exits 1 if there is nothing to fold.
 *
 * What has been folded is recorded in CHANGELOG.md itself: each drafted entry carries
 * `<!-- change: docs/changes/… -->`, and an entry whose path is cited there is never drafted
 * again. Rejected: git tags as the cut-off (0.10.0 and 0.11.0 were never tagged, and a tag says
 * nothing about an entry merged after the release branch was cut), and a `Released:` line written
 * back into each entry (it edits files that belong to finished tasks, and two releases' worth of
 * edits would conflict the same way a shared log does).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const CHANGES_DIR = "docs/changes";

// ---- One entry ------------------------------------------------------------

/**
 * Parses one change entry. Never throws: problems go in `errors`, so `check` can report every
 * file's problems in one run instead of stopping at the first.
 */
export function parseEntry(text, path) {
  const errors = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  const titleLine = lines.find((l) => l.startsWith("# "));
  const title = titleLine ? titleLine.slice(2).trim() : "";
  if (!title) errors.push("no `# ` title line");

  // The header is everything before the first `## ` section.
  const firstSection = lines.findIndex((l) => l.startsWith("## "));
  // The title is left out, so a task named "Output: …" cannot satisfy the `Output:` field.
  const header = lines
    .slice(0, firstSection === -1 ? lines.length : firstSection)
    .filter((l) => !l.startsWith("# "))
    .join("\n");
  const field = (name) => {
    const m = header.match(new RegExp(`(?:^|\\s|·)${name}:\\s*([^·\\n]*)`, "m"));
    return m ? m[1].trim() : null;
  };

  const backlog = field("Backlog");
  if (backlog === null) errors.push("no `Backlog:` line");
  // A task always comes from a backlog item; only work done before batches existed has none.
  else if (!/B-\d{3}/.test(backlog) && !/^[–-]$/.test(backlog)) {
    errors.push(`\`Backlog: ${backlog}\` names no B-NNN item (use \`Backlog: –\` only for pre-batch work)`);
  }

  const output = field("Output");
  if (output !== "unchanged" && output !== "changed") {
    errors.push(`\`Output:\` must be \`unchanged\` or \`changed\`, got ${output === null ? "nothing" : `\`${output}\``}`);
  }

  const pkg = field("Package");
  if (pkg !== "yes" && pkg !== "no") {
    errors.push(`\`Package:\` must be \`yes\` or \`no\`, got ${pkg === null ? "nothing" : `\`${pkg}\``}`);
  }

  const sections = new Map();
  let current = null;
  for (const l of lines.slice(firstSection === -1 ? lines.length : firstSection)) {
    if (l.startsWith("## ")) {
      current = l.slice(3).trim();
      sections.set(current, []);
    } else if (current) sections.get(current).push(l);
  }
  const body = (name) => (sections.has(name) ? sections.get(name).join("\n").trim() : null);

  const whatChanged = body("What changed");
  if (!whatChanged) errors.push("no `## What changed` section, or it is empty");
  const notes = body("Notes");

  return {
    path,
    title,
    // "T-07 Hide/unhide operations" → "Hide/unhide operations". Bundles and pre-batch entries
    // keep their whole title: it is the only name they have.
    heading: title.replace(/^T-\d+\s+/, ""),
    backlog,
    output,
    package: pkg,
    whatChanged,
    notes: notes && !/^none\.?$/i.test(notes) ? notes : null,
    errors,
  };
}

// ---- All entries ----------------------------------------------------------

function walk(dir, out = []) {
  let names;
  try { names = readdirSync(dir); } catch { return out; }
  for (const n of names) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/**
 * Batch order, then task order. `pre-batch/` comes first because it is older than every batch;
 * `numeric` so that T-10 follows T-09 and batch-10 follows batch-09.
 */
export function compareEntries(a, b) {
  const rank = (p) => (p.split("/")[2] === "pre-batch" ? 0 : 1);
  return rank(a.path) - rank(b.path) || a.path.localeCompare(b.path, "en", { numeric: true });
}

export function readEntries(root) {
  return walk(join(root, CHANGES_DIR))
    .filter((p) => p.endsWith(".md") && !p.endsWith(`${sep}README.md`))
    .map((p) => {
      // Posix separators, because the path is written into CHANGELOG.md as the fold marker.
      const rel = relative(root, p).split(sep).join("/");
      return parseEntry(readFileSync(p, "utf8"), rel);
    })
    .sort(compareEntries);
}

// ---- The changelog --------------------------------------------------------

export const marker = (path) => `<!-- change: ${path} -->`;

/** `Package: yes` entries whose path CHANGELOG.md does not cite yet. */
export function unfolded(entries, changelog) {
  return entries.filter((e) => e.package === "yes" && !changelog.includes(marker(e.path)));
}

const SEMVER = /^\d+\.\d+\.\d+$/;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The section for `version`, ending with the `---` that separates it from the next one. */
export function draftSection(version, title, entries) {
  const out = [`## ${version} — ${title || "TODO: subtitle"}`, ""];

  // Under 0.x an output change is what makes a release more than additive, so it leads.
  const changed = entries.filter((e) => e.output === "changed");
  if (changed.length) {
    const who = changed.map((e) => `${e.title.match(/^T-\d+/)?.[0] ?? e.heading} (${e.path.split("/")[2]})`);
    out.push(`Generated or drawn output changes: ${who.join(", ")}.`, "");
  }

  for (const e of entries) {
    out.push(`### ${e.heading}`, marker(e.path), "", e.whatChanged, "");
    if (e.notes) out.push(e.notes, "");
  }
  out.push("---", "");
  return out.join("\n");
}

/**
 * Inserts `section` above the newest version, i.e. at the first `## ` line: the intro and its
 * `---` stay on top, and every existing section is left byte-identical.
 */
export function insertSection(changelog, version, section) {
  if (new RegExp(`^## ${escape(version)}(?: |$)`, "m").test(changelog)) {
    throw new Error(`CHANGELOG.md already has a section for ${version}`);
  }
  const at = changelog.search(/^## /m);
  if (at === -1) throw new Error("CHANGELOG.md has no `## ` version section to insert above");
  return changelog.slice(0, at) + section + "\n" + changelog.slice(at);
}

// ---- CLI ------------------------------------------------------------------

function fail(message) {
  console.error(`changelog: ${message}`);
  process.exit(1);
}

function reportErrors(entries) {
  const bad = entries.filter((e) => e.errors.length);
  for (const e of bad) {
    console.error(`${e.path}:`);
    for (const err of e.errors) console.error(`  - ${err}`);
  }
  return bad.length;
}

function main(argv) {
  const args = [...argv];
  const take = (flag) => {
    const i = args.indexOf(flag);
    if (i === -1) return null;
    const v = args[i + 1];
    if (v === undefined || v.startsWith("--")) fail(`${flag} needs a value`);
    args.splice(i, 2);
    return v;
  };
  const has = (flag) => {
    const i = args.indexOf(flag);
    if (i !== -1) args.splice(i, 1);
    return i !== -1;
  };

  const root = take("--root") ?? fileURLToPath(new URL("..", import.meta.url));
  const title = take("--title");
  const write = has("--write");
  const [command, version, ...rest] = args;
  const usage = 'usage: changelog.mjs check | draft <X.Y.Z> [--title "…"] [--write] [--root <dir>]';
  if (rest.length) fail(`unexpected argument ${rest[0]}\n${usage}`);

  const entries = readEntries(root);

  if (command === "check") {
    if (version) fail(usage);
    const bad = reportErrors(entries);
    if (bad) fail(`${bad} of ${entries.length} change entries are malformed`);
    console.log(`changelog: ${entries.length} change ${entries.length === 1 ? "entry" : "entries"}, all well-formed`);
    return;
  }

  if (command === "draft") {
    if (!version || !SEMVER.test(version)) fail(`draft needs a version X.Y.Z\n${usage}`);
    const bad = reportErrors(entries);
    if (bad) fail(`${bad} change entries are malformed; fix them before drafting`);

    const path = join(root, "CHANGELOG.md");
    const changelog = readFileSync(path, "utf8");
    const todo = unfolded(entries, changelog);
    if (!todo.length) fail("no unfolded `Package: yes` entries: nothing to release");

    const section = draftSection(version, title, todo);
    let next;
    try { next = insertSection(changelog, version, section); } catch (e) { fail(e.message); }
    if (write) {
      writeFileSync(path, next);
      console.log(`changelog: ${todo.length} ${todo.length === 1 ? "entry" : "entries"} drafted into CHANGELOG.md as ${version}. ` +
        "Edit it into the changelog's voice; keep the <!-- change: --> markers.");
    } else {
      process.stdout.write(section);
    }
    return;
  }

  fail(usage);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
