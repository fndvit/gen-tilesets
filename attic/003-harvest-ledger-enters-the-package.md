# ADR-003 — The harvest ledger enters the package

> **Status:** Accepted  
> **Date:** 2026-08-08  
> **Affects:** `00-overview.md` §6, §10.2; `01-glossary.md` §11.6, Q9; `09-editor.md` Q11; `PROCESS.md` §8, step 7  
> **Raised by:** `PLAN.md` §0.5

---

## Context

Three documents cite `_harvest.md` as the authority for a correction or a structural gap — `00`
§10.2 for the `07` and `08` retirement markers, `09` Q11 for the three amendments to `02` and `04`,
`01` Q9 for the missing `09` block. `PROCESS.md` §8's checklist, step 7, additionally instructs the
next conversation to verify a document's arrival against it.

`find` over the repository returned nothing. Five copies lived outside it, in `../specs-versions/`.

So four sites in the package pointed at a file the package did not contain. A reader following any
of them arrived nowhere, and nothing in the package detected it — which is the shape `01` Q9 names
in its own words: _"The absence is invisible by construction."_ `PLAN.md` §0.5 records this as the
third instance of that shape, and the first where the missing file is the one the package uses to
count its own stale claims.

The alternative to entry is amending the three citations to point elsewhere. It loses on two of the
three:

- **`00` §10.2.** The struck `07` and `08` markers exist in no other file. The correction's
  _result_ is openable in `01` §3, but its _evidence_ is not, so §10.2 would have to become the
  primary record of the marker incident. That is `00` owning rows no other document carries, which
  is authorship, which `00` §1.1 forbids — and it is the precise argument that killed the
  fourteen-row register, recorded in this ledger's `00` block under _For `01` §10.1 — rejected_.
- **`01` Q9.** Q9's exhibit _is_ the ledger: an append-only file with a missing block, which looks
  exactly like one that is current. Amending Q9 to cite `PROCESS.md` keeps the argument and
  discards the thing the argument is about.
- **`09` Q11** is the exception. Its claim is about `02` and `04`, both of which are in the
  repository and carry the **Amended** header lines that settle it. Q11 could be repointed at them
  cheaply, and under `00` §10.2's own rule — _verified by opening it and never by trusting the
  table that records the claim_ — arguably should be. That is a separate question from this one and
  is not decided here.

Doing neither is what has happened three times.

## Decision

`../specs-versions/0608-0942/_harvest.md` enters the package as **`spec/_harvest.md`**, copied
byte-for-byte. 488 lines, four blocks: `07`, `08`, `09`, `00`.

**Canonicity was established by content, not by recency.** Recency is not admissible evidence here,
because the file's own preamble claim to be append-only is false of the file — four of five
transitions rewrite it. The evidence used:

1. **Strict content superset.** Non-blank lines present in an older copy and absent from
   `0608-0942`, under two independent normalizations: 33, 6, 4, **0** by positional line diff, and
   5, 6, 4, **0** with table-cell padding collapsed and the copies compared as line sets. The two
   disagree only about re-padded table rows in the `07` term table. The terminal **0** is identical
   under both.
2. **The last transition is a pure append** — `383a384,488`, adding the `00` block and nothing else.
3. **The appended block declares terminality** — _"no marker: no harvest follows this block"_.
   `00` is the last document written and the last of the three harvests, so by the file's own rules
   no later copy can exist.
4. **Independent corroboration against the repository.** The block's correction table already
   carries the **D3** correction that `00` §10.1 records as owed, agreeing with `audit/c-editor.md`
   §1.3, which reached it from `01` §13.

A row is added to `00` §6's document index, with the Status column reading _Retired ledger; see
ADR-003_. Without it, a reader following `00` §10.2 arrives at a file the package's only map does
not mention — the absence-is-invisible shape reproduced by the step meant to end it.

## The non-compliance, recorded rather than repaired

The file's preamble reads _"Append-only… Never rewritten, never summarized."_ **This is false of
the file itself.** Two transitions delete preamble text and leave no tombstone:

| Transition              | Deleted                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `0408-1352 → 0408-2230` | _"This file is the only input the `01`, `00`, and `roadmap` harvests need."_                  |
| `0408-2230 → 0508-2126` | The four-line `00`/`roadmap` supplement paragraph, and both `[UNHARVESTED]` headings rewritten |

The file therefore arrives already in violation of the weaker form of the discipline `00` §8.5
states. It is entered anyway, unaltered, and the violation is recorded here rather than in the file
for two reasons that pull in the same direction.

**Repairing it would author its history.** Reconstituting the deleted sentences as struck-in-place
tombstones means writing, in 2026-08-08, a record of what a file said in 2026-08-04 — presented as
if the strike had happened then. `00` §8.5 exists so that a removal is visible; it does not license
manufacturing the visible removal after the fact.

**Leaving it unrecorded would make a violation indistinguishable from compliance.** Which is `00`
§8.5's own reason for existing, one level up. A later pass finding a self-contradicting preamble
inside `/spec` and tidying it would be reversing this decision without knowing one had been taken.

**No block body is lost in any transition**, which is why the file is worth entering at all. Every
line that disappears is header prose rewritten in place or a heading whose retirement marker was
updated — the documented mechanism under _How a block is retired_.

## What binds the file from entry forward

**`01` §11.4 does not.** It governs section numbering — _"A section number, once published, is
permanent"_ — and a harvest block is not a section. §11.4's closing prose extends the same
discipline to type names (`05` **X8**), error codes (`06` §10.3) and `meta` keys (`07` **R4**);
none of those is a harvest block either.

**What binds is one row of `01` §11.6**, the _Nothing is deleted_ principle, which names
_"`_harvest.md` blocks"_ explicitly alongside section numbers, type names, error codes, roadmap
rows and `meta` keys. Together with the file's own _How a block is retired_, that governs the file
at **block** granularity: blocks are appended, never deleted, and retired in place by marking their
heading.

**Neither reaches the preamble** — which is exactly where all four historical rewrites landed.
This gap is recorded, not closed. A recorded scope gap and an unnoticed one are the difference this
ADR exists to make; deciding whether the preamble should be governed, and by what, is a question
for the pass that takes `PROCESS.md` §8 step 7 (below), not for this one.

## Consequences

**Four sites become openable.** `00` §10.2, `09` Q11, `01` Q9, and `PROCESS.md` §8's step 7 now
cite a file in the repository. None of their text requires amendment on account of the move — `09`
Q11 and `01` Q9 were verified by opening both, and their claims become true rather than changing.

**`PLAN.md` §7's `_harvest.md` row becomes executable.** It proposes correcting the _Authoring
resize_ row, which still reads _"The author **drags** the design page width"_ — the premise `09`
§9.2 withdrew — inside a block marked _harvested into 01, 2026-08-05_. `01` §6.1's row is its
descendant, and the abbreviation defect in the glossary is inherited from it.

**That row now collides with the rule above**, and the collision is flagged to §7 rather than
resolved here: blocks are never rewritten, and this ledger already leaves one known-wrong note
standing for that reason — the `09` block's closing note about the **Amended** header lines, which
the preamble corrects in place of rewriting. Whether the _Authoring resize_ correction is appended
in the same manner or applied in place is §7's decision.

**`PROCESS.md` §8, step 7 resolves but does not become sufficient.** It says to check a document's
arrival _against `_harvest.md`_, and `01` Q9's finding is that this check cannot detect the failure
it exists to catch: a ledger with a missing block looks exactly like a current one. The ledger's own
preamble already takes the stronger position — _"A harvest therefore checks this file against the
document list before trusting it"_ — and `PROCESS.md` does not. Named here, not taken.

**No output moves.** No generated output, no drawn output, no schema, no interface. Version cost:
**`none`** in the tiers `roadmap` §3.2 fixes. Not _free_ — the package gains a governed file, and
`00` §6 gains a row — but no version number moves.

**Invariant count unchanged**, 86 against `01` §13. Nothing is coined; the `00` block records
_Terms coined: **None**_, and `01`'s status line already reads all ten sources harvested.

## Alternatives considered

**Amend the three citations.** Destinations exist for each — `00` §10.2 → `01` §3 and `01`'s status
line; `09` Q11 → `02` and `04`'s **Amended** headers; `01` Q9 → `PROCESS.md` §8's checklist.
Rejected on the asymmetry in §Context: one amends cleanly and two do not, and the two that do not
would cost `00` its prohibition on authorship and cost Q9 its exhibit. It also leaves `PROCESS.md`
§8 step 7 pointing at nothing, a site the framing did not count.

**Enter the file, reconstituted.** Restore the deleted preamble sentences from `../specs-versions/`
as struck-in-place tombstones, so the file is compliant on arrival. Rejected: it is authorship of
history, and it makes the file's compliance a thing this pass manufactured rather than a thing the
record shows.

**Do neither, again.** Rejected. `audit/c-editor.md` §1.1 records `roadmap.md` missing from `spec/`
while three harvest passes ran against it. This would be the same outcome a third time, in the file
the package uses to count its own stale claims.

## Documents revisited

| Document          | Outcome                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `00-overview.md`  | §6 gains a row for `_harvest.md`. §10.2's citation resolves; its own amendment is `PLAN.md` §0.5's second entry, taken separately |
| `01-glossary.md`  | No change. §11.6's _Nothing is deleted_ row already names `_harvest.md` blocks; Q9's citation resolves — verified by opening it   |
| `09-editor.md`    | No change. Q11's citation resolves — verified by opening it. Whether Q11 should cite `02` and `04` directly is left open          |
| `PROCESS.md`      | No change. §8 step 7's citation resolves; its insufficiency is named above and not taken                                          |
| `roadmap.md`      | No change. §1.1's mention of this file is a provenance narrative, not a citation of authority — verified by opening it            |
| `_harvest.md`     | Enters unaltered. Governed at block granularity by `01` §11.6 and its own _How a block is retired_; preamble uncovered            |
