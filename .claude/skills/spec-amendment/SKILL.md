---
name: spec-amendment
description: Amend a document in the /spec specification package. Use this skill whenever implementation work finds a spec that is wrong, contradictory, under-determined, or stale — and whenever the user asks to change, correct, update, or add to any document in /spec, /adr, roadmap.md, or the glossary. Also use it when a change to one document obliges a change to another. Always use this skill rather than editing a spec file directly; a spec edit made without it will be the wrong shape.
---

# Amending a spec document

The specification package is the durable memory of this project. Its recorded failure mode is
**stale restatement**: claims about what another document says that were false when written.
Every rule below exists to prevent one specific instance of that.

## Never amend without confirmation

You may edit spec files, but only after the user has agreed to the specific change. Never amend
a spec in passing, as a step inside a larger task, or to unblock yourself. A spec disagreement
found mid-implementation stops the implementation; it is never resolved in code and never
resolved silently.

## The procedure

### 1. Establish that the amendment is actually owed

**Open the document.** Do not rely on a claim in another document, in `_harvest.md`, in a
conversation summary, in `PLAN.md`, or in your own earlier reasoning. Ten claims in this package
described work that had already landed; two were written by passes that had just criticised the
pattern.

State in your reply which files you opened. If the amendment turns out not to be owed, say so
explicitly — "verified by opening `07`; §3.1 already carries this" is a complete and useful
result.

### 2. Classify the change

| Kind | What to do |
|---|---|
| The spec is **wrong** | Amend the owning document. |
| The spec is **silent** and something must be decided | Do **not** decide it. Add a row to the document's open-questions table with status *Open*. Silently choosing is worse than recording the choice as open. |
| The spec is **silent** and it belongs elsewhere | Add a row to the owning document's "Not in this document" table. Do not spec outside a document's scope. |
| Agreed but unbuilt | `[EXTENSION POINT]`, and a row in `roadmap.md` §4 with a cost tier and a gate. |
| Not yet agreed, deferred past V1 | `[POSTPONED]`, and a row in `roadmap.md` §5. |
| A **locked decision is being reversed** | An ADR is required. See §5 below. |

Extension point and postponement mean exactly what `01` §11.2 says. Quote it; do not paraphrase
it — a paraphrase of that definition has already caused one misfiled row.

### 3. Propose, confirm, then apply

You apply the edit yourself. Do not produce copy-pasteable blocks for the user to paste — that
was the pre-Claude-Code workflow and it is no longer needed.

**Propose first.** For each edit site, in one short block: the document and section, what the
current text says, and what it will say instead. Keep it tight enough to read in one pass — the
user is confirming a decision, not proof-reading a diff.

Then ask for confirmation, and wait. A single yes covers every site in the proposal; do not ask
per site.

Once confirmed, apply the edits with `str_replace`, anchored on the exact current text. Then
report which files you wrote and which sections moved.

**Do not apply anything before confirmation**, and do not apply more than was confirmed. If
applying reveals a site you did not propose — the text is not where you expected, or a second
occurrence exists — stop and come back with a revised proposal rather than deciding in place.

### 4. Update the header block

Every amended document gains a line in its header block, after `Constrains:`:

```
> **Amended:** §6.3, §7.1, **O4** rewritten in place — see `03-domain-model.md` §5.2
```

Cite what caused the amendment. An invariant that is rewritten keeps its identifier — **never
renumber an invariant**; only the text moves.

### 5. Section numbers are append-only

`01` §11.4. A new section takes the next unused number. Nothing is renumbered. A removed or
withdrawn section keeps its number as a **tombstone**, because a stale citation to a tombstone is
legible and a stale citation to a reused number is not. A heading may be rewritten freely;
nothing cites titles.

### 6. Decide whether an ADR is warranted

`/adr` is for decisions that were **reversed**, or that were **contested and are likely to be
re-proposed**. Ordinary rationale stays inline in the spec. An ADR is not a diary entry.

If a locked decision from a completed spec is reopened and changed, that is **always** an ADR,
and every document that depended on it must be revisited — open each one.

Existing: ADR-001 (Blend declaration inversion), ADR-002 (Load salt as an engine argument).

### 7. Cost the change

Every change has a version cost, in the tiers `roadmap` §3.2 fixes: `none`, `editor-only`,
`package-internal`, `minor engine bump`, `minor renderer bump`, `schemaVersion` bump,
`major engine bump`, `major renderer bump`. State it.

`editor-only` is **not** the same as `none`. Both move no version number; that is the whole of
their similarity. Reading either as *free* is the error the tier exists to prevent.

A change to generated or drawn output is major (**X0**, **X9**, **R14**) — whether or not any
interface moved, and whether or not `generate()`'s output moved. *Identical grid output* is not
the test; *identical drawn output* is.

### 8. Close the loop

After the amendment is agreed, report:

1. **New terms coined** — for the `01-glossary.md` harvest. Say "none" if none.
2. **New `[EXTENSION POINT]` / `[POSTPONED]`** — for the `roadmap.md` harvest. Say "none" if none.
3. **Amendments owed to other documents** — each one *verified by opening the document named*,
   not inferred. Say "none, verified against X and Y" if none.
4. **Whether an ADR is warranted.**
5. **Whether any invariant count changed** — `01` §13 carries the census.

## House style

Match the shape of `02-generation-contract.md`. Required sections: Purpose · Not in this document
· Body · Invariants summary · Extension points · Open questions.

- Rationale inline and brief. Where a decision has a tempting alternative, say why the alternative
  loses — `02` §6.1 is the model.
- Worked examples with concrete numbers over abstract description.
- Known-bad behaviour that is being *accepted* is recorded explicitly so it is not later filed as
  a bug — `02` §10.1 is the model.
- Tables for anything enumerable.
- Decide at the constraint level where possible. `02` §6.6 specifies the hash by required
  behaviour and portability rather than by naming an algorithm. That leaves the implementation
  free and the guarantee firm.

## Push back

Agreeing with a weak amendment costs more here than in most contexts, because everything
downstream inherits it. If a proposed change smooths over a contradiction rather than resolving
it, say so.
