# Batch development workflow

Work happens in batches: triage → Pol's decisions → parallel implementation → review → Pol's
review. Each batch is a folder, `docs/batches/batch-NN/`:

| File | Written by | What |
|---|---|---|
| `batch.md` | triage; Pol fills `Answer:` lines | The plan. **The single source of truth.** Implementation sessions never edit it |
| `status-<S>.md` | session S only | Progress per task, `BLOCKED:` notes |

The review is not a file: each reviewer posts it on its session's PR (see Review pass).

**The base branch is `dev`.** Worktrees branch from `dev`, PRs target `dev`
(`gh pr create --base dev`), and rebases are onto `dev` (`git rebase origin/dev`). `main` is the
repo's default branch, so a command that relies on a default gets it wrong; `main` is only
touched at release.

A batch takes its tasks from `BACKLOG.md`. Every backlog item has a permanent ID (`B-001`…);
before triage, give any item that lacks one the next ID. Task IDs (`T-01`…) are local to one batch;
B-IDs are the ones that last, and every task cites the item it comes from. One item may split into
several tasks (B-009 → the everyNth fix and a Row/Column selection).

Never act on a decision Pol has not answered in `batch.md`. Read `CLAUDE.md` (the rules) and
`ARCHITECTURE.md` (the module map) before starting. Both are in git.

## Code areas

Used for bundling and for deciding what can run in parallel. Paths are relative to the repo root.

| Area | Paths |
|---|---|
| `engine` | `packages/tileset/src/{generate,hash,ctx,attributes,assets,mapping,selection,angle}.ts`, `packages/tileset/src/registry/` |
| `schema` | `packages/tileset/src/{types,validate,migrate,load,shape,responsive}.ts` |
| `renderer` | `packages/tileset/src/render/` |
| `editor-state` | `apps/editor/src/`: `session.svelte.ts`, `document.ts`, `history.ts`, `draft.svelte.ts`, `drafting.svelte.ts`, `opening.svelte.ts`, `entry.svelte.ts`, `ids.ts`, `fields.ts`, `derive.ts`, `reseed.ts`, `seed.ts`, `orphans.ts`, `advisories.ts`, `notices*.ts` |
| `editor-io` | `apps/editor/src/{export,import,download,assets,image-export}.ts`, `apps/editor/src/lib/ImportPanel.svelte` |
| `operations-ui` | `apps/editor/src/lib/operations/`, `apps/editor/src/controls/`, `apps/editor/src/paint.ts`, `apps/editor/src/lib/{SelectionOverlay,PaintLayer}.svelte` |
| `editor-shell` | `apps/editor/src/App.svelte`, `apps/editor/src/lib/{sections,preview,tiles}/`, `apps/editor/src/lib/{Section,NumericInput}.svelte` |
| `ui-kit` | `apps/editor/src/lib/ui/`, `apps/editor/src/styles/`, `apps/editor/DESIGN_SYSTEM.md` |
| `docs-demo` | `apps/docs/`, `apps/demo/`, `packages/tileset/README.md` |

A test file belongs to the area of the file it tests.

## Contracts

Shared shapes many parts depend on. Changing one is never trivial.

| Contract | Defined in | Changing it means |
|---|---|---|
| **Tileset file**: `TilesetFile`, `TilesetConfig`, `Layout`, `Operation`, `Tile`, `TileAsset`, `ResponsiveRule`, `schemaVersion: 4` | `packages/tileset/src/types.ts`, checked by `validate.ts`, lifted by `migrate.ts` | Schema bump + migration step. **Big** |
| **Generator**: `generate(config, seed, loadSalt) → Grid<TileState>`, deterministic | `generate.ts`, `hash.ts`; `TileState`/`Grid` in `types.ts` | Any output change for unchanged inputs is breaking: version bump + changelog line. **Big** |
| **Registry**: Selection / Source / Blend registrations, `ParamSpec` | `packages/tileset/src/registry/` | A new type is unknown to older engines (load failure). The editor builds controls from `ParamSpec` (`controls/affordance.ts`). **Big** |
| **Public API**: `TilesetOptions`, `TilesetRenderer`, `TileDecorationRenderer`, `renderImage`, `AssetProvider` | `render/options.ts`, `render/index.ts`, `src/index.ts`, `render/provider.ts` | Published, and consumers pin exact versions. Additive option with today's default: contained. Removal or rename: **big** |
| **Editor write path**: `session.apply(transition)`, `Transition = TilesetFile → TilesetFile`, snapshot undo | `session.svelte.ts`, `document.ts`, `history.ts` | `apply()` is the only mutator; the file is the only document model. Adding a transition is contained; changing the mechanism is **big** |
| **Export zip**: `tileset.json` + asset folder, assets matched by `meta.src` | `apps/editor/src/export.ts`, `import.ts` | What users have on disk. **Big** |
| **Preview view state**: width, zoom, grid, `loadSalt`, live draft | `lib/preview/view.svelte.ts`, `drafting.svelte.ts` | Read by shell, overlays and export. Adding a field: contained |
| **Design tokens and patterns** | `apps/editor/src/styles/tokens.css`, `apps/editor/DESIGN_SYSTEM.md` | Adding: trivial. Renaming or retuning an existing one: contained at least |

## Hotspots

| File | Rule |
|---|---|
| `apps/editor/src/App.svelte` | One session per batch edits it. Every other task that needs it gets `Depends on` and runs in that session or after its merge |
| `styles/tokens.css`, `DESIGN_SYSTEM.md`, `lib/ui/icons.ts` | Append only. Two sessions may append; the review pass reports merge conflicts, Pol resolves them when merging |
| `apps/editor/src/document.ts` | Add new transitions; don't move or reorder existing ones |
| `types.ts`, `validate.ts`, `migrate.ts` | Big tasks only |
| `BACKLOG.md` | **Never edited by a task.** Parallel branches would conflict. Items move to `## Done` after merge (see Release) |
| `CHANGELOG.md`, `version` in `packages/tileset/package.json` | **Never edited by a task.** Release step only (see Change entries). The editor reads the version from that one place (E2) |
| `src/index.ts`, `render/index.ts` | Add exports only |
| `apps/docs/src/content/docs/**` | **CI gate:** every `.ts`/`.svelte` under `packages/tileset/src` or `apps/editor/src` (tests excepted) needs a module page that names it in `**Written from:**`. The task that adds a source file adds its page in the same commit; the task that changes a file updates its page |

## Tiers

Classify every task into exactly one tier. **When unsure between two tiers, choose the higher one**
and say why in one line.

### Trivial
All must hold:
- One obvious way to do it; Pol would not describe the result differently.
- One area, and it is `ui-kit`, `editor-shell`, `operations-ui` or `docs-demo`.
- No contract touched, no new source file (so no new docs page), no new dependency, no change to
  generated or drawn output.

Trivial tasks get no plan. Bundle them by area (max ~8 per bundle). One branch and PR per bundle,
one commit per task.

### Contained
- Changes how an existing editor feature works, or adds a modest new one.
- At most two areas.
- Contracts: at most an addition from the "contained" column above (a transition, a view-state
  field, a renderer option whose default draws exactly what it draws today).
- May add a source file, with tests and its docs page.
- Open questions are small and local: placement, naming, copy, default values.

Contained tasks get a short plan (format below) and their own branch.

### Big
Any of these makes a task big:
- Touches `types.ts`, `validate.ts` or `migrate.ts`: a new field, attribute, target, Selection or
  Source type, i.e. a schema bump.
- Changes `generate()` output for an unchanged `(config, seed, loadSalt)`, or the drawn output for
  unchanged options.
- Touches `uniform.ts`, a crop policy or the substrate default (read `SUBPIXEL-GEOMETRY.md` first).
- Changes the export zip, or removes or renames a public export.
- Reworks a whole workflow (breakpoints, adding tiles, onboarding).
- Three or more areas, or a design decision with long-term consequences.

Big tasks are **not planned in the batch**. Write only what needs deciding and which tasks depend
on it. They run in a separate interactive session with Pol, in blocks: each block is analysed,
confirmed, implemented, reviewed and tested before the next starts.

### Examples (from `BACKLOG.md`)

| Backlog | Task | Tier | Areas | Why |
|---|---|---|---|---|
| B-003 | Grid button → On/off switch | trivial | editor-shell | `PreviewTopBar.svelte` only; `Toggle` exists |
| B-013 | Scroll past the editor (bug) | trivial ⚖️ | editor-shell | ⚖️ Trivial if it is a one-line containment fix (like the visually-hidden span that escaped `ScrollArea`). If the cause is unknown at triage, it's contained, because finding it is the work |
| B-002 | Sticky section headers | trivial ⚖️ | ui-kit | ⚖️ Trivial as CSS on `Section`/`Collapsible`. Contained if headers should stack under each other, because that is a behaviour choice |
| B-021 | Reroll an operation without opening it | contained ⚖️ | operations-ui, editor-state | ⚖️ The salt bump exists (`reseed.ts`), which looks trivial. But where the button sits on the collapsed card is Pol's call, so it's contained |
| B-001 | Re-order sidebar sections; move Derived | contained | editor-shell | Pol chooses the ordering principle |
| B-018, B-019 | (i) explainers for Operations and Randomness | contained | editor-shell, ui-kit | `Explainer` exists; the copy needs Pol's approval |
| B-005 | Stable colour/index per operation | contained | operations-ui, ui-kit | Derived from `op.id`, never saved |
| B-004 | Decorative tile motif in sidebar space | contained | editor-shell, ui-kit | A `<TileDecoration>` sized to the free space |
| B-011 | Drag to draw a Rect selection | contained | operations-ui, editor-shell | Builds on `SelectionOverlay` and `paint.ts` |
| B-012 | Hide/unhide operations | contained ⚖️ | operations-ui, editor-state | ⚖️ Contained only if hiding is session-only (D-03 A). Saving it in the file is a schema bump → big |
| B-008 | Offset/Scale X+Y as one attribute | big ⚖️ | schema, engine, operations-ui | ⚖️ One card writing two operations would be contained. As one attribute it's a new target and a schema bump. The choice comes first, so it's big |
| B-007 | Share a pattern between operations | big | schema, engine, operations-ui | A shared reference changes `Operation` |
| B-009 | `everyNth` semantics + Row/Column selection | big | engine, schema | Changes output of existing files; adds a registry type |
| B-010 | Rotation affects a later tileId operation | big | engine | Rotation is per-cell state, so this may be by design. A decision before any patch |
| B-006 | Breakpoints vs Grid & Size rethink | big | editor-shell, schema, renderer | A workflow redesign |
| B-016, B-017 | Example tilesets; onboarding | big | editor-shell, editor-io, ui-kit | Changes how adding tiles works; new overall UX |

⚖️ = borderline; the reason is the one-line justification triage must write.

## Batch file format (`docs/batches/batch-NN/batch.md`)

```markdown
# Batch NN

## Summary
| ID   | Backlog | Task                          | Tier      | Areas                        | Session | Depends on |
|------|---------|-------------------------------|-----------|------------------------------|---------|------------|
| T-01 | B-003   | Grid button → On/off switch   | trivial   | editor-shell                 | A       | –          |
| T-07 | B-012   | Hide/unhide operations        | contained | operations-ui, editor-state  | B       | T-01       |
| T-12 | B-007   | Share a pattern between ops   | big       | schema (contract), engine    | –       | –          |

## Decisions needed
(every decision from every task, collected so Pol answers in one pass)

## Trivial bundles
## Contained tasks
## Big tasks
## Execution order
```

T-07 depends on T-01 here only because both edit `App.svelte`.

### Decision format

```markdown
### D-03 (T-07) Should hidden operations stay hidden after saving?
Context: Hiding lets you compare the tileset with and without an operation, without deleting it.
- **A)** Only while the editor is open. Export and reload show every operation. Nothing in the
  file changes.
- **B)** Saved in the file: a hidden operation stays hidden in the editor and on every website
  that uses the tileset. Needs a new file version (**makes T-07 big**).
- **C)** Like A, but exporting with hidden operations asks whether to drop them.

Recommendation: **A**, because it changes nothing in saved files, and the preview already draws a
derived file (the live draft), so this follows a path the editor already has.

Answer:
```

Rules for decisions:
- 2–4 options, each with its main trade-off in one line.
- **Lead with what the user or a website would see**, not the mechanism. Plain words.
- Always give a recommendation and the reason.
- If an option would change the task's tier, say so in that option.
- Leave `Answer:` empty. Pol fills it with a letter or writes their own answer.
- Don't ask about things that have one reasonable answer: decide them and state the choice in the
  plan. In particular, **don't ask about sizes**: decide them by WCAG 2.2 AA and record them in
  `DESIGN_SYSTEM.md`. **Don't ask how to make one-off artwork**: take it from Figma.

### Trivial bundle format

```markdown
### Bundle B1 (editor-shell), session A
- T-01 Grid button → On/off switch: replace the Grid button in `PreviewTopBar.svelte` with a `Toggle` bound to `preview.showGrid`.
- T-04 Scroll past the editor: give the escaping element a positioned ancestor inside `ScrollArea`.
```

### Contained task plan format

```markdown
### T-07 Hide/unhide operations (session B)
Goal: The user can hide an operation to see the tileset without it, then show it again.
Approach: Add a set of hidden operation ids to the preview view state (`view.svelte.ts`), not
the file. An eye `IconButton` on `OperationCard` toggles it. A new pure `withoutHidden(file,
hidden)` in `visibility.ts` (tested, with a docs page) returns the file minus those operations;
`App.svelte` draws that, the way it draws the live draft. Advisories, `shapedAt` and export keep
reading the saved file.
Areas: operations-ui, editor-state
Decisions: D-03
Acceptance criteria:
- A hidden operation has no effect on the preview or on the field preview.
- Its card is visibly marked as hidden, and the toggle works by keyboard.
- Export and undo are unaffected; reloading shows every operation.
Risks: anything that reads the drawn file instead of the saved one (warnings, export) would
silently drop hidden operations; the reviewer should check every reader of the drawn file.
```

### Execution order

Assign every trivial bundle and contained task to a session (A, B, C…). Tasks in a session run in
sequence; sessions run in parallel. Two sessions must not touch the same area, or the same hotspot,
at the same time. Use `Depends on` for anything that must merge first. Big tasks that others depend
on come first, before the batch runs.

## Implementation rules

- **Setup: you start in a worktree created by `scripts/start-batch.sh`**, at
  `../generative-tileset-creator-batch-NN-<s>` on branch `batch-NN-<s>` (e.g. `batch-03-b`),
  branched from `origin/dev`, with `pnpm install` done. Don't create branches or worktrees
  yourself, and don't use a tool's automatic worktree (`isolation: "worktree"`, `EnterWorktree`):
  it branches from the current HEAD, which may not be `dev`. Check the worktree before working:
  `git merge-base --is-ancestor origin/dev HEAD` must succeed, and
  `git log --oneline origin/dev..HEAD` must list only this session's commits.
- Work only on the tasks assigned to your session. Follow the plan and Pol's answers exactly.
  An unanswered decision means the task is not ready: skip it.
- **Stop rule:** if the plan turns out wrong or impossible, don't improvise. In
  `docs/batches/batch-NN/status-<S>.md`, under the task, write
  `BLOCKED: <what you found and the options you see>`, then move on. Blockers never go into
  `batch.md`: each session runs on its own branch, so an edit there is seen by no other session
  and conflicts on merge.
- **Never edit `batch.md`** or another session's files.
- `status-<S>.md` is committed on your own branch. Each session writes a different file, so the
  status files never conflict on merge. The reviewer reads its branch's file
  (`git show batch-NN-<s>:docs/batches/batch-NN/status-<S>.md`) before posting its review.
- One commit per task: `T-07: Add hide/unhide for operations`. Use an imperative sentence after the
  ID, as in the rest of the history, and end with the Co-Authored-By trailer.
- Stay within the task's areas. If you must touch another, say so in the change entry.
- Project rules that apply to every task:
  - Terminology is fixed (`TileState`, `Tile`, `TileAsset`).
  - Never strip the `` `07` §6.4 `` / **R8** citations.
  - Logic goes in a `.ts` file a test can import, never only in a `.svelte` file.
  - Write the reason for a non-obvious choice at the point of use.
- Before each commit: `pnpm test` and `pnpm typecheck` from the root, both green. If you added or
  renamed a source file, also run `pnpm --filter @vit-foundation/tileset-docs build`, which
  checks docs coverage. If you touched `packages/tileset`, also run
  `pnpm --filter @vit-foundation/gen-tilesets build`. There is no linter or formatter; match the
  surrounding code.
- **When done, open the PR against `dev`, always with an explicit base.** A bare
  `gh pr create` targets `main`:

  ```sh
  git log --oneline origin/dev..HEAD   # only this session's T-xx commits
  git push -u origin batch-NN-<s>
  gh pr create --base dev --head batch-NN-<s> --title "Batch NN, session <S>: <tasks>"
  ```

  If a PR was opened against `main` by mistake, retarget it with `gh pr edit <n> --base dev`.
  **Never merge.** Pol merges.
- **Then exit.** Your terminal window runs `scripts/review-batch.sh NN --session <S>` next, which
  starts this branch's reviewer.

## Change entries (one file per task)

Never edit `CHANGELOG.md` or any shared log: parallel branches would conflict. Each task adds:

`docs/changes/batch-NN/T-07-hide-operations.md`

```markdown
# T-07 Hide/unhide operations
Backlog: B-012 · Tier: contained · Areas: operations-ui, editor-state · Decisions: D-03 (A)
Output: unchanged
Package: no

## What changed
(2–4 lines, for someone reading the history later)

## Notes
(deviations from the plan, follow-ups, docs or DESIGN_SYSTEM.md changes; "None" if empty)
```

- `Output:` is `unchanged` or `changed`. Under 0.x, a changed generated or drawn output means a
  version bump and a changelog line, and only a big task may change it.
- `Backlog:` names the item(s) the task comes from (`B-012`, or `B-003, B-013` for a bundle).
- `Package:` is `yes` if `packages/tileset` changed. Those entries are folded into a new
  `CHANGELOG.md` section **at release** by `scripts/changelog.mjs` (see Release). Editor-only
  entries stay in `docs/changes/`; that is their record.
- Trivial bundles may use one file per bundle, `docs/changes/batch-NN/bundle-B1.md`: title
  `# Bundle B1 (<area>)`, the same header lines covering the whole bundle, and under
  `## What changed` one line per task (`- T-01 Grid button → On/off switch: …`).
- `pnpm changelog check` must pass before the commit that adds the entry. It fails on a missing
  title, `Backlog:` item, `Output:` or `Package:` value, or `## What changed` section.
- **Guideline docs** (`apps/editor/DESIGN_SYSTEM.md`, the `apps/docs` pages,
  `packages/tileset/README.md`, `CLAUDE.md`, `ARCHITECTURE.md`) change only when the task actually
  changes what they describe. Mention it under Notes.

## Review pass

**How it runs.** `scripts/review-batch.sh` starts one reviewer per session, a fresh Claude session
(never the implementer) in that session's worktree. `start-batch.sh` chains it after each
implementer, so a review starts as soon as its implementer has opened the PR and exited; run
`scripts/review-batch.sh NN --session <S>` by hand if one stopped (it prints why). Reviewers run
in parallel, each on its own editor and demo-preview ports, given in its prompt.

**No script and no session merges anything into `dev`.** The integration merge below is a local
branch that is never pushed, and reviewers are denied `gh pr merge`, `git merge`, `git pull`,
`git rebase` and any push but to their own branch (`scripts/review-settings.json`). Pol does every
merge.

- A session is reviewed only when its worktree is clean, its branch is pushed, it has exactly one
  open PR with base `dev`, and its implementer has exited.
- **Screenshot baseline:** the script captures `dev` once, from the main checkout, into
  `.shots/batch-NN-dev`. The main checkout stays on `dev` for this; nothing is edited there.
- **Integration check:** once every session has its PR, the script merges every branch onto
  `origin/dev` in session order in `../<repo>-batch-NN-review`, runs test, typecheck, changelog
  check and both builds on the result, and posts a summary on every batch PR: the merge order, and
  per PR "merge as is" or "needs dev merged in after #x; conflicts in: …". It reports conflicts and
  never resolves them; that is Pol's, at merge.
- **Fixes** go on the session branch: committed and pushed from its worktree, so they land in the PR.
- **The review** is posted on the PR: `gh pr review <n> --comment --body-file <file>`.

The reviewer first reads its branch's `status-<S>.md` and copies each `BLOCKED:` note into the
review. Then it checks the branch against `batch.md`:

- Each task does what its plan and Pol's answers say, nothing more; the acceptance criteria are met.
- `pnpm test`, `pnpm typecheck` and both builds (`gen-tilesets`, `tileset-docs`) are green on the
  branch. The integration summary, once it exists, covers the merged result; quote any line about
  this PR.
- A change entry exists per task, with an honest `Output:` line, and `pnpm changelog check` passes;
  no shared log or version edited.
- Every new or changed logic file has tests. Every new source file has a docs page.
- **Editor UI** (no component tests exist): run the editor (`pnpm --filter
  @vit-foundation/tileset-editor dev`, port 5174) and drive each change with a Playwright probe
  kept in the scratchpad, not the repo. Check keyboard access, WCAG 2.2 AA contrast and target
  size, and hover/press feedback, against `DESIGN_SYSTEM.md`.
- **Renderer**: build the demo, serve it on your preview port, capture it (`pnpm --filter
  @vit-foundation/tileset-demo shots:capture <dir> http://localhost:<port>/`) and `shots:diff` it
  against the `dev` baseline the script captured, expecting 0 px difference. Also run
  `apps/demo/scripts/ssr.mjs`.
- **Engine/schema** (big tasks only): confirm the `Output:` claim by generating the same file
  before and after.
- Every PR's base is `dev` (`gh pr view <n> --json baseRefName`). Retarget any that isn't.
- No stray debug code, no renamed terminology, no stripped citations.

Fix mechanical issues directly. For anything else, don't change the code; write it in the review.
In the review, list ⚠️ items first, then the `BLOCKED:` notes, then the ✅ tasks:

```markdown
## Review: batch-NN-b
- T-09: ⚠️ deviated: plan said X, implementation does Y because Z. Needs Pol's check.
- T-08: BLOCKED (from status-B.md): …
- T-07: ✅ as planned.
Fixed: <mechanical fixes pushed to this branch, one line each, or "none">
```

## Release (outside the batch)

After Pol merges a batch into `dev`, move each item it finished to `## Done` in `BACKLOG.md`
(`- **B-012** Hide/unhide operations: batch-NN T-07, PR #NN`), taken from the change entries'
`Backlog:` lines. An item that was only partly done stays open, with a note saying what is left.

Then, when Pol decides to release:

1. `pnpm changelog draft X.Y.Z --title "<subtitle>"` prints the section built from every
   `Package: yes` entry not yet in `CHANGELOG.md`; add `--write` to insert it above the newest
   version. It refuses if there is nothing to fold or the version already has a section.
2. Edit the draft into the changelog's existing voice (`### Added:` / `### Changed:` /
   `### Fixed:`, what each thing costs, whether output changed). **Keep the
   `<!-- change: docs/changes/… -->` lines**: they are how the script knows an entry was released,
   and removing one makes the next draft fold that entry again.
3. Bump `packages/tileset/package.json`, merge `dev` into `main`, then tag (see `CLAUDE.md`,
   Versioning).

## Running a batch

For Pol. From the main checkout, on `dev`.

1. **Start.** Commit `batch.md` with every `Answer:` filled to `dev` and push. Run
   `scripts/start-batch.sh NN --dry-run`, then `scripts/start-batch.sh NN`. It checks that `dev`
   matches `origin/dev` and every decision is answered, then opens one Terminal window per
   session, each running Claude in its own worktree. Running it again reopens the sessions
   without recreating anything.
2. **Review pass.** Starts by itself: each session's window runs its reviewer when the
   implementer exits (see Review pass). If one stopped because something was not ready, fix that
   and run `scripts/review-batch.sh NN --session <S>`, or `--dry-run` first to see the checks. The
   main checkout must stay on `dev`, level with `origin/dev`, until the reviews are done.
3. **Merge.** Read each PR's review and the integration comment, and settle the ⚠️ items and
   `BLOCKED:` notes. Then merge **one PR at a time, in the integration comment's order**, with
   "Create a merge commit". Where it says "merge as is" and its checks are green, that reproduces
   the tree it tested, so nothing needs a rebase or retest between merges. A PR marked "needs dev
   merged in": merge the ones before it, then in its worktree run `git merge origin/dev` (never a
   rebase: that needs a force push, which is denied), resolve the conflicts (in an append-only
   hotspot, keep both sides), run the tests, push, and merge.
4. **End.** `scripts/end-batch.sh NN` removes the worktrees and local branches whose PRs are
   merged into `dev`, and lists any it kept. Once all are merged it also removes the integration
   worktree, its `batch-NN-review` branch and the screenshot baseline. Then the Release steps above.
