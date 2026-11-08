// Run with `node --test scripts/` (the root `pnpm test` does).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compareEntries,
  draftSection,
  insertSection,
  marker,
  parseEntry,
  unfolded,
} from "./changelog.mjs";

const entry = ({ title = "T-07 Hide/unhide operations", output = "unchanged", pkg = "no", notes = "None" } = {}) => `# ${title}
Backlog: B-012 · Tier: contained · Areas: operations-ui, editor-state · Decisions: D-03 (A)
Output: ${output}
Package: ${pkg}

## What changed
Operations can be hidden from the preview.
Hiding is session-only.

## Notes
${notes}
`;

const P = "docs/changes/batch-01/T-07-hide.md";

test("parses a well-formed entry", () => {
  const e = parseEntry(entry(), P);
  assert.deepEqual(e.errors, []);
  assert.equal(e.title, "T-07 Hide/unhide operations");
  assert.equal(e.heading, "Hide/unhide operations");
  assert.equal(e.backlog, "B-012");
  assert.equal(e.output, "unchanged");
  assert.equal(e.package, "no");
  assert.equal(e.whatChanged, "Operations can be hidden from the preview.\nHiding is session-only.");
  assert.equal(e.notes, null, "`None` is no note");
});

test("keeps real notes", () => {
  assert.equal(parseEntry(entry({ notes: "Updated DESIGN_SYSTEM.md." }), P).notes, "Updated DESIGN_SYSTEM.md.");
});

test("reports every problem at once", () => {
  const e = parseEntry("Backlog: soon\nOutput: maybe\n\n## Notes\nNone\n", P);
  assert.equal(e.errors.length, 5);
  assert.match(e.errors.join("\n"), /title/);
  assert.match(e.errors.join("\n"), /B-NNN/);
  assert.match(e.errors.join("\n"), /`Output:`.*`maybe`/);
  assert.match(e.errors.join("\n"), /`Package:`.*nothing/);
  assert.match(e.errors.join("\n"), /What changed/);
});

test("an empty What changed is an error", () => {
  const e = parseEntry(entry().replace(/## What changed\n.*\n.*\n/, "## What changed\n\n"), P);
  assert.deepEqual(e.errors, ["no `## What changed` section, or it is empty"]);
});

test("the title cannot stand in for a field", () => {
  const e = parseEntry(entry({ title: "T-02 Output: changed" }).replace("Output: unchanged\n", ""), P);
  assert.match(e.errors.join("\n"), /`Output:`.*nothing/);
});

test("pre-batch work may have no backlog item", () => {
  const e = parseEntry(entry().replace("Backlog: B-012", "Backlog: –"), "docs/changes/pre-batch/x.md");
  assert.deepEqual(e.errors, []);
});

test("a trivial bundle file parses, citing several items", () => {
  const text = `# Bundle B1 (editor-shell)
Backlog: B-003, B-013 · Tier: trivial · Areas: editor-shell
Output: unchanged
Package: no

## What changed
- T-01 Grid button → On/off switch: a Toggle in PreviewTopBar.
- T-04 Scroll past the editor: contained the escaping element.

## Notes
None
`;
  const e = parseEntry(text, "docs/changes/batch-01/bundle-B1.md");
  assert.deepEqual(e.errors, []);
  assert.equal(e.heading, "Bundle B1 (editor-shell)");
});

test("orders pre-batch first, then batches and tasks numerically", () => {
  const paths = [
    "docs/changes/batch-10/T-01-a.md",
    "docs/changes/batch-02/T-10-a.md",
    "docs/changes/pre-batch/editor-redesign.md",
    "docs/changes/batch-02/T-09-a.md",
  ];
  assert.deepEqual(paths.map((path) => ({ path })).sort(compareEntries).map((e) => e.path), [
    "docs/changes/pre-batch/editor-redesign.md",
    "docs/changes/batch-02/T-09-a.md",
    "docs/changes/batch-02/T-10-a.md",
    "docs/changes/batch-10/T-01-a.md",
  ]);
});

test("only unfolded package entries are drafted", () => {
  const a = parseEntry(entry({ pkg: "yes" }), "docs/changes/batch-01/T-01-a.md");
  const b = parseEntry(entry({ pkg: "yes" }), "docs/changes/batch-01/T-02-b.md");
  const c = parseEntry(entry({ pkg: "no" }), "docs/changes/batch-01/T-03-c.md");
  const changelog = `# Changelog\n\n---\n\n## 0.12.0 — x\n\n### A\n${marker(a.path)}\n`;
  assert.deepEqual(unfolded([a, b, c], changelog).map((e) => e.path), [b.path]);
});

test("drafts a section that leads with output changes and carries markers", () => {
  const a = parseEntry(entry({ title: "T-12 everyNth counts across rows", output: "changed", pkg: "yes", notes: "Follow-up: B-030." }), "docs/changes/batch-03/T-12-everynth.md");
  const b = parseEntry(entry({ pkg: "yes" }), "docs/changes/batch-03/T-14-hide.md");
  const s = draftSection("0.12.0", "rows and columns", [a, b]);
  assert.equal(s, `## 0.12.0 — rows and columns

Generated or drawn output changes: T-12 (batch-03).

### everyNth counts across rows
<!-- change: docs/changes/batch-03/T-12-everynth.md -->

Operations can be hidden from the preview.
Hiding is session-only.

Follow-up: B-030.

### Hide/unhide operations
<!-- change: docs/changes/batch-03/T-14-hide.md -->

Operations can be hidden from the preview.
Hiding is session-only.

---
`);
  assert.match(draftSection("0.12.0", null, [b]), /^## 0\.12\.0 — TODO: subtitle\n\n### /);
});

const CHANGELOG = `# Changelog

Intro.

---

## 0.11.0 — renderImage

Body.

---

## 0.10.0 — npm
`;

test("inserts above the newest version and leaves the rest byte-identical", () => {
  const next = insertSection(CHANGELOG, "0.12.0", "## 0.12.0 — new\n\nX\n\n---\n");
  assert.equal(next, CHANGELOG.replace("## 0.11.0", "## 0.12.0 — new\n\nX\n\n---\n\n## 0.11.0"));
  assert.ok(next.endsWith(CHANGELOG.slice(CHANGELOG.indexOf("## 0.11.0"))));
});

test("refuses a version that already has a section", () => {
  assert.throws(() => insertSection(CHANGELOG, "0.11.0", "x"), /already has a section for 0\.11\.0/);
  // 0.1.0 is not 0.11.0, and V1-style headings are not versions.
  assert.doesNotThrow(() => insertSection(CHANGELOG, "0.1.0", "x"));
});
