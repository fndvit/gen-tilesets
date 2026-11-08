# Batch development workflow

Work happens in batches. A batch goes through: triage → human decisions →
parallel implementation → review → human review. The batch file
(`docs/batches/batch-NN.md`) is the single source of truth for a batch.
Never act on a decision the human has not answered in that file.

## Code areas

<!-- Adapt to the project. Used for bundling and for deciding what can run in parallel. -->
| Area        | Paths                         |
|-------------|-------------------------------|
| generator   | `src/generator/`              |
| rules       | `src/rules/`                  |
| export      | `src/export/`                 |
| canvas      | `src/ui/canvas/`              |
| panels      | `src/ui/panels/`              |
| state       | `src/state/`                  |
| styles      | `src/styles/`, `*.css`        |

**Contracts** (shared shapes many parts depend on): tileset data format,
generator API, app state shape. Changing a contract is never trivial.

## Tiers

Classify every task into exactly one tier. **When unsure between two
tiers, choose the higher one** and say why in one line.

### Trivial
All of these must be true:
- One obvious way to do it; no behavior the user would describe differently.
- Touches one area, a few lines to a few small edits.
- No contract changes, no new dependencies, no data migrations.

Examples: label or font size, copy text, spacing/colors, a tooltip, an
obvious off-by-one or typo bug.

Trivial tasks get no plan. Bundle them by area (max ~8 per bundle).
One branch and PR per bundle, one commit per task.

### Contained
- Changes how an existing feature works, or adds a modest new one.
- Touches at most two areas.
- No contract changes, or a backward-compatible addition to one.
- Any open questions are small and local (e.g. default values, naming,
  placement of a control).

Contained tasks get a short plan (format below) and run on their own branch.

### Big
Any of these makes a task big:
- Changes a contract (data format, generator API, state shape).
- Changes core generation behavior or the overall UX of a workflow.
- Touches three or more areas, or needs a migration of saved tilesets.
- Requires a design decision with long-term consequences.

Big tasks are **not planned in the batch**. Describe only what needs
deciding and which other tasks depend on it. They are handled in a
separate interactive session with the human.

## Batch file format

```markdown
# Batch NN

## Summary
| ID    | Task                        | Tier      | Areas          | Session | Depends on |
|-------|-----------------------------|-----------|----------------|---------|------------|
| T-01  | Larger tile index labels    | trivial   | canvas         | A       | –          |
| T-07  | Undo for rule edits         | contained | rules, state   | B       | –          |
| T-12  | New tileset export format   | big       | export, (contract) | –   | –          |

## Decisions needed
(all decisions from every task, collected here so the human can answer in one pass)

## Trivial bundles
## Contained tasks
## Big tasks
## Execution order
```

### Decision format

Every choice that belongs to the human is written like this, in the
"Decisions needed" section, and referenced from the task by its ID:

```markdown
### D-03 (T-07) How far back should undo go?
Context: Rule edits currently overwrite state directly. Undo needs a history.
- **A)** Unlimited history for the session. Simple; memory grows with
  large rule sets.
- **B)** Last 50 steps. Bounded memory; covers normal use.
- **C)** Last 50 steps, plus history saved with the project. Survives
  reloads; changes the save format (would make T-07 big).

Recommendation: **B**, because it covers normal use without touching the
save format.

Answer:
```

Rules for decisions:
- 2–4 options, each with its main trade-off in one line.
- Always give a recommendation and the reason.
- If an option would change the task's tier, say so in that option.
- Leave `Answer:` empty. The human fills it with a letter, or writes
  their own answer.
- Don't ask about things that have one reasonable answer. Just decide
  them and state the choice in the plan.

### Trivial bundle format

```markdown
### Bundle A1 (canvas), session A
- T-01 Larger tile index labels: raise label font from 10px to 13px in `TileGrid`.
- T-04 Fix grid misalignment at 200% zoom: round offsets in `computeGridOffset`.
```

### Contained task plan format

```markdown
### T-07 Undo for rule edits (session B)
Goal: The user can undo and redo changes to adjacency rules.
Approach: (3–6 sentences: what changes, where, and how)
Areas: rules, state
Decisions: D-03
Acceptance criteria:
- Ctrl+Z / Ctrl+Shift+Z undo and redo rule edits.
- Undo history is cleared when a different tileset is loaded.
Risks: (anything that could go wrong or that the reviewer should check)
```

### Execution order

Assign every trivial bundle and contained task to a session (A, B, C…).
Tasks in the same session run in sequence; sessions run in parallel.
Two sessions must not touch the same area at the same time. Use
"Depends on" for anything that must merge first. Big tasks the others
depend on come first, before the batch runs.

## Implementation rules

- Work only on the tasks assigned to your session, on branch
  `batch-NN-<session>` in your own worktree.
- Follow the plan and the human's answers exactly. Unanswered decisions
  mean the task is not ready: skip it.
- **Stop rule:** if the plan turns out to be wrong or impossible, don't
  improvise. Under the task in the batch file, add
  `BLOCKED: <what you found and the options you see>`, then move on to
  the next task.
- One commit per task, message starting with the task ID
  (`T-07: add undo history for rule edits`).
- Stay within the task's areas. If you must touch another area, note it
  in the change entry.

## Change entries (one file per task)

Never edit a shared changelog or development log directly: parallel
branches would conflict. Each task adds its own file:

`docs/changes/batch-NN/T-07-undo-rule-edits.md`

```markdown
# T-07 Undo for rule edits
Tier: contained · Areas: rules, state · Decisions: D-03 (B)

## What changed
(2–4 lines, for someone reading the history later)

## Notes
(deviations from the plan, follow-ups, anything the reviewer should know;
"None" if empty)
```

Trivial bundles may use one file per bundle listing each task in a line.
The combined log is assembled from these files by `scripts/build-changelog`.

**Guideline docs** (`docs/guidelines/`) change only when a task actually
changes a guideline. Mention it in the change entry under Notes.

## Review pass

The reviewing session checks each branch against the batch file:
- Each task does what its plan and answers say, nothing more.
- Acceptance criteria are met; tests pass.
- A change entry exists for each task; no shared logs were edited.
- Code follows the guidelines; no stray debug code.

Fix mechanical issues directly. For anything else, don't change the code;
write it in the summary. Add to the batch file per branch:

```markdown
## Review: batch-NN-B
- T-07: ✅ as planned.
- T-09: ⚠️ deviated: plan said X, implementation does Y because Z. Needs human check.
```

Order the summary with ⚠️ items first.
