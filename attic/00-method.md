# Audit method

Read this in full before starting any audit session. It is the same for all four.

## What the audit is

`/spec` holds a complete, agreed ten-document specification package. Nothing is implemented. The
audit reads the package in three scoped passes and consolidates the results into a build plan.

The package is too large to read in one session. Reading it all and then compacting would produce  
findings built on a summary of the documents rather than the documents — the exact failure the
project's conventions exist to prevent, and invisible in the output. Hence the split.

| Session           | Reads                                        | Writes                          |
| ----------------- | -------------------------------------------- | ------------------------------- |
| A — engine        | `00`, `02`, `03`, `04`, `05`, `/adr/*`       | `audit/a-engine.md`             |
| B — file & render | `00`, `06`, `07`, `08`                       | `audit/b-render.md`             |
| C — editor        | `00`, `09`, `roadmap.md`                     | `audit/c-editor.md`             |
| D — consolidate   | the three files above, plus targeted lookups | `PLAN.md`, `test/untestable.md` |

`00-overview.md` is re-read in A, B and C on purpose. It is the map, and a session auditing `07`
without knowing where the V1 boundary falls will misclassify.

`01-glossary.md` is **not** read cover to cover by anyone. It is a lookup table. Open it when a
name is in question — `01` §10.1 for rejected forms, §10.2 for reserved words, §10.3 for
deliberate collisions, §13 for the invariant census — and read only that.

## Rules for every session

- **Write no implementation code.** No engine, no types, no scaffolding, no `package.json`.
- **Read only the documents your session lists.** If you need something from a document outside
  your scope, do not guess and do not read it. Record it under _Needed but not read_ and move on.
- **Verify by opening.** Never assert what a document says without having read it in this session.
  Name what you opened.
- **Do not restate the spec.** Cite it: `` `04` §7.2 ``, or an invariant ID — **G2**, **R10**.
  Bare `§7.2` is withdrawn (`01` §1.2).
- **Do not invent to fill a gap.** Gaps are the finding. Resolve none of them, propose no
  defaults, indicate no preference.
- **Write findings to the file, not to the reply.** The reply is for anything that needs my
  attention now.
- **Verify headers before auditing.** Before reading any document's body, read its header block and
  check its `Status` and `Amended` lines against what other documents in scope cite from it. A
  document whose header contradicts what its neighbours cite may be a stale copy rather than a
  package inconsistency — this has happened once, to `00`. Report any such document immediately, in
  the reply, before continuing. Section 1 of your findings file carries a table of the check: one
  row per document, with what cites it and whether they agree. Assert nothing without the table.

## Findings file format

Every session writes the same seven sections, in this order.

### 1. Header

Session letter, documents read with their full paths, date.

### 2. Comprehension

A few lines: what these documents establish, and what boundary they sit on. If you cannot state
this without hedging, re-read rather than guessing — the rest of the file is worthless otherwise.

### 3. Under-determination

The main deliverable. One numbered entry per item, prefixed with the session letter — `A-1`,
`A-2`. Each entry:

- **Cite** — document and section.
- **Kind** — one of:
  - `open` — the spec is silent and something must be chosen to proceed.
  - `contradiction` — two documents in scope say incompatible things. Quote both verbatim.
  - `under-specified` — a constraint is stated but does not determine a unique behaviour. The
    spec may well intend this; `02` §6.6 specifies the hash as a family on purpose. Say whether
    it reads as deliberate.
- **What is not settled** — precisely.
- **What must be chosen** — the shape of the decision, not the decision.

Keep the three kinds apart. They have different costs and different owners.

### 4. Invariant census

Count the invariants you actually found, by prefix. `01` §13 claims 86 across eight documents:
**G**1–5, **D**1–11, **O**1–8, **X**0–10, **C**1–10, **R**1–15, **S**1–10, **E**1–16. Check only
the prefixes your session owns. A disagreement with that table is a finding about the package —
report the discrepancy, do not smooth it over.

Then classify each: **assertion** (a test can be written for it) or **posture** (it constrains how
decisions get made, not what the code does). Postures get a one-line reason.

### 5. Candidate units of work

Units this session's documents imply. Each unit:

- name
- spec sections it implements, cited
- **invariant IDs it discharges** — this is the acceptance criterion; a unit with none needs a
  stated reason
- what must land before it, as far as you can see from your scope
- whether it is pure and browser-free

**Do not order them globally.** Ordering is a whole-package question and belongs to session D.

### 6. Cross-layer suspicions

Anything that looks like it conflicts with, or depends on, a document outside your scope.
Explicitly unverified. Format:

> `07` §5.2 may conflict with `04` §7.2 on default Blend resolution. **Not verified — `04` not
> read this session.**

Session D resolves these by opening both. A suspicion is useful; a guess dressed as a finding is
not.

### 7. Needed but not read

What you wanted from outside your scope, and which document you wanted it from. This is how the
split's cost stays visible.
