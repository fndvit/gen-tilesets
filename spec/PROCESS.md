# Spec Process — conversation context

> **Audience:** Claude, at the start of every spec-building conversation in this project.
> **Home:** Project Instructions. This document does **not** ship to the repo.
> **Rule:** this document holds _status and method_. Every actual decision lives in a
> numbered spec. Where this document mentions a decision, it cites the section rather than
> restating it. If this document and a spec disagree, the spec wins and this document is wrong.

---

## 1. What we are building

A **procedural tileset generator**: a visual editor that outputs a configuration file, and a
Svelte renderer component that consumes it to draw randomized, grid-based backgrounds.

The system splits cleanly in two:

- an **engine** — a pure function, `generate(config, seed) -> Grid<TileState>`, that knows
  nothing about pixels, viewports, or graphical resources;
- a **renderer** — which owns layout, scaling, clipping, and asset resolution.

There is **one engine**. It lives in this repository, publishes as a package, and consumers
pin a version. No public plugin API, no third-party authors, no second implementation in
another language — `05` §3. This is why output stability is a versioning problem rather than
a conformance problem: a config outlives the build that wrote it, so any change to generated
output is a major bump (`05` **X9**).

Backgrounds vary on refresh by varying the seed, never by breaking determinism.

## 2. What we are doing right now

Writing the specification package **before** any implementation. When the package is
complete it ports into a `/spec` folder in the repo, and development proceeds from there
with Claude Code.

**One conversation per document.** The conversation is scaffolding and is discarded; the
document is the durable artifact. Completed specs are added to project knowledge and become
the source of truth for every later conversation.

## 3. Document plan and status

Numbers are load order, not authoring order. See §4 for authoring order.

| Doc                         | Scope                                                           | Status                                                                                     |
| --------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `00-overview.md`            | Scope, non-goals, V1 boundary, document index                   | **Complete** ✅ — amended by the `09` pass: §4.4, §4.5, §9, §10.1, §10.2, §12, Q5          |
| `01-glossary.md`            | Terminology, single source of naming truth                      | **Complete** ✅ — all ten sources harvested; §3.1 empty, no `[UNHARVESTED]` markers remain |
| `02-generation-contract.md` | Coordinate space, seed model, determinism, `TileState`          | **Complete** ✅ — amended by `09` (§7.5, §12) and by `01` Q7 (§9, §10.1)                   |
| `03-domain-model.md`        | `Tile`, `TileAsset`, attribute schema, invariants               | **Complete** ✅ — amended, `01` Q7: §4.2, §4.3, **D3** rewritten in place                  |
| `04-operations.md`          | Selection / Source / Blend / Target semantics, evaluation order | **Complete** ✅ — amended, see ADR-001; plus `09` §14.2 and `01` Q7 (§6.3)                 |
| `05-extension-model.md`     | Registry contracts, how a new Source is added                   | **Complete** ✅                                                                            |
| `06-config-schema.md`       | JSON shape, `schemaVersion`, validation rules                   | **Complete** ✅                                                                            |
| `07-render-contract.md`     | What any renderer must guarantee                                | **Complete** ✅ — amended twice, see §2, §3.1 and the `08` reconciliation                  |
| `08-renderer-svelte.md`     | V1 component API                                                | **Complete** ✅                                                                            |
| `09-editor.md`              | Editor architecture                                             | **Complete** ✅ — three amendments owed, see §5.5                                          |
| `/adr/*`                    | One file per reversed or contested decision                     | ADR-001: Blend declaration inversion · ADR-002: Load salt as an engine argument            |
| `roadmap.md`                | The complement of `00`: every deferral, its cost, and its gate  | **Complete** ✅ — re-harvested after `09`; §1.1 records the passes                         |

### Last completed

`00-overview.md`, the last pass. The package is complete: ten of ten documents are _Draft,
agreed_, §4.4 is a citation rather than a placeholder, §4.5's census carries four editor rows
(6 manufactured guarantees, 16 editor invariants, 9 advisory diagnostics, 1 overlay kind), and
§13 Q5 resolves.

All three things flagged to check rather than assume had moved. §12's `07` §3.1 row was already
discharged — `07` §3.1 cites `00` §6 approvingly and carries no objection; the residue is a
missing **Amended** line. §9's paraphrase of `01` §11.2 is now a quotation, following `roadmap`
§3.1; it was the third site of that gloss. §10.1 did not empty, and `gradient` is not its only
survivor: `07`, `09`, and `01` each carry a one-line residue, recorded with the date and the
document opened.

**§10.2's count is fourteen, not thirteen.** The fourteenth was found by this pass and is the
milder form: `01` §13 said **D3** _is owed_ its rewrite, and `03` carries it, rewritten in place,
amended by the conversation that wrote the sentence. §10.2 now gives the site of every instance
so the number is checkable, and routes what to do about it to `roadmap` §10 Q6 rather than
restating the rule a third time.

§9 gained two process rows — verify a cross-document claim by opening the document, confirm a
document arrived before running a pass against it. That is Q6's third option taken provisionally,
and §10.2 says why it stays provisional: two passes have failed the habit version, and one pass
is not evidence that the step version holds.

## 4. Authoring order

```
(complete — every document is written; the package moves to /spec)
```

**`00`, `01` and `roadmap` are harvests, not authorship.** They collect terms, scope, and
deferrals that the other documents coin. Writing them first would mean inventing vocabulary for
decisions not yet made — which is how `02`'s terminology and the original index diverged.

`09-editor.md` is last because the editor consumes every other contract.

## 5. What is locked

Cited, not restated. Read the sections if any of these are in play.

### 5.1 By `02` — the engine boundary

- Engine signature and purity; `Seed` is a runtime string parameter — §4
- Prohibited engine inputs — §4.2, **G1**
- Coordinate space; clipped cells participate fully — §5, **G2**
- Positional hashing over sequential PRNG, and why — §6, §6.1
- Hash channels, `operationId`, salts, per-operation reroll — §6.3, §6.4, **G3**
- Hash function constraints, `Math.imul`, test vectors as deliverable — §6.6
- The effective seed; `loadSalt` is an argument, never a field — §6.7
- Grid / Layout split — §7
- `referenceWidth` is stored, not derived — §7.2
- `TileState` shape; `tileId: null` initialization — §8, §8.1, **G4**
- Asset resolution belongs to the renderer — §8.2, **G5**
- Evaluation model — §9
- Weight edits are not locally stable; known and accepted — §10.1

### 5.2 By `06` — the file

- `TilesetFile { schemaVersion, engineVersion, config, layout }`; the split is the engine
  boundary made structural — §3, §3.1, **C1**
- `TilesetConfig` and `Layout` fixed as type names — §3
- `rows` and `columns` flat; no config member is called `grid` — §3.2
- `defaultSeed` is the file's only caller instruction; the reseed flags are engine inputs — §3.3
- `loadSalt` has no slot, deliberately — §3.4
- `schemaVersion` required; absent or unknown is a load failure — §4.1, **C2**
- What bumps it, and the line between what `06` fixes and what the registry resolves — §4.3
- `engineVersion` required and advisory — §4.4, **C3**
- Optional iff a default is declared; `null` is never a way to write "absent" — §5.1
- Salts are `uint32`; identifiers are `[A-Za-z0-9_-]+` and the colon is excluded — §5.2, §5.3,
  **C9**, **C10**
- `meta` is nested and is the sole exception to strictness — §6.1, **C4**
- Spread where the schema knows the keys, nest where it does not — §7.1
- `blend` is a bare string — §7.2
- Mapping is one slot discriminated by `target`; no kind tag — §7.3, **C8**
- `ParamSchema` is data, not code, and is not a wire format — §7.4
- Unknown keys are errors; validation never coerces — §9, **C4**, **C6**
- `validate()` is separate; `generate()` trusts; behaviour on an invalid config is undefined —
  §10, **C5**
- Errors only, no warnings; JSON Pointer path plus stable code — §10.1–§10.3, **C6**, **C7**
- Three diagnostics that are legal configs and belong to `09` — §10.4

**Most likely to be re-proposed:** `06` §9.1's strictness. The cost is that every added key is a
`schemaVersion` bump. It is recorded as `06` open question 4 pointing at itself, and it earns an
ADR if it is ever reversed.

**Settled terminology:** `Cell`, `TileState`, `Tile`, `TileAsset`, `Grid`, `Layout`,
`Operation`, `TilesetFile`, `TilesetConfig`. Not `CellState`, not `TileType`, not `Variant`.
Terminology drift is the most likely way this package quietly breaks; flag it the moment it
appears.

### 5.3 By `07` — the renderer

- One renderer; the editor's preview is it, with overlays — §3, **R1**
- Asset provider signature; the key is the `(tileId, assetId)` pair — §4.1
- Resolution is pure per session, may be lazy, never blocks geometry — §4.2, **R2**
- Failure never substitutes; no null return — §4.3, **R3**
- `meta` is the provider's input, passed verbatim, additive-only — §4.4, §4.5, **R4**
- Placement formula; `s = Wpx / referenceWidth`; every ratio is `Wpx`-independent — §5.2, §5.3
- The cell box consults no asset and reads no `TileState` — §5.5, **R5**
- Shared edges, never independently rounded — §5.6, **R6**
- Scale 1 is the cell square, and why this does not contradict 02 §7 — §6.1, **R7**
- The transform six-tuple; positive `rotation` is clockwise — §6.2
- Centre-crop, before any transform — §6.4, **R8**
- The render box is the only clipping boundary — §7.2, **R9**
- Row-major paint order is output — §7.4, **R10**
- `cellAt` is total and unbounded; boxes are half-open — §8.2, §8.3, **R11**
- `loadSalt` once per render session; viewport resize never regenerates — §9.1, §9.3, **R12**
- The caller passes `config`, never `file`, and does not validate — §9.4
- Application is keyed by attribute name; an attribute with no applier fails — §10, **R13**
- Renderer output stability, and the two vector tables — §11.2, §11.3, **R14**, **R15**

**Most likely to be re-proposed: R10**'s row-major paint order, and R8's crop-before-transform. Both are output-visible; either reversal is an ADR and a major bump.

### 5.4 By `08` — the component

- `<Tileset>` is the caller, permanently; nothing accepts a `Grid<TileState>` — §3, **S1**
- The editor is a **host**, not a caller; the preview is the component, complete stack, with
  overlays over it. No isolation previews, no sliced stacks — §3.1, §3.3, **S2**
- The component validates nothing; the host never holds an invalid file — §3.4, **S3**
- No optional props means one fixed picture — §4.1, **S4**
- `Drawable` is `{ src: string }`, an `<img>`; tiles are sealed pictures — §4.2, **S5**
- Resolution failure and load failure share one channel, `onAssetError` — §4.4, **S6**
- The component draws no random number; `loadSalt` is a prop — §5, §5.1, **S7**
- The render box declares a ratio, not a height; no padding, no border — §6.1, §6.2, **S8**, **S9**
- `cellBox` / `cellAt` are exported pure functions, not methods — §7, **S10**
- No width prop, no `config`/`layout` split, no exported grid — §4, §4.5

**Most likely to be re-proposed:** **S1**. `08` §3.1 records it as the less reversible choice and
says so explicitly; a bare-grid surface is carried as an `[EXTENSION POINT]`. **S2**'s no-sliced-
stacks half is the other candidate, and it is now `01` §10.1's business to flag it on sight.

## 6. House style

Every document matches the shape of `02`.

**Header block**

```
> **Status:** Draft, agreed
> **Depends on:** ...
> **Constrains:** ...
```

**Required sections**

1. **Purpose** — what boundary or model this document defines, in a few lines.
2. **Not in this document** — an explicit list of what belongs elsewhere, each with a
   pointer to the owning document. This is load-bearing; it is how scope creep is caught.
3. Body.
4. **Invariants summary** — a table of every numbered invariant in the document.
5. **Extension points** — a table marked `[EXTENSION POINT]` or `[POSTPONED]`.
6. **Open questions** — a numbered table with a Status column reading _Resolved_,
   _Deferred → `doc.md`_, _Postponed_, or _Open_.
   **Invariant prefixes**, so IDs never collide across documents:

| Doc             | Prefix |     | Doc         | Prefix |
| --------------- | ------ | --- | ----------- | ------ |
| `02` generation | **G**  |     | `06` config | **C**  |
| `03` domain     | **D**  |     | `07` render | **R**  |
| `04` operations | **O**  |     | `08` svelte | **S**  |
| `05` extension  | **X**  |     | `09` editor | **E**  |

**Prose conventions**

- Rationale is inline and brief. Where a decision has a tempting alternative, say why the
  alternative loses — `02` §6.1 is the model.
- Worked examples with concrete numbers over abstract description.
- Known-bad behaviour that is being _accepted_ gets recorded explicitly so it is not later
  filed as a bug — `02` §10.1 is the model.
- Tables for anything enumerable.
- **Section numbers are append-only** — `01` §11.4. New sections take the next unused number;
  nothing is renumbered, and a removed section keeps its number as a tombstone. The rule is
  specified in `01` because that document ships to the repo and this one does not.

## 7. How decisions get made in these conversations

- **Surface contradictions before resolving them.** The original brief contains conflicts;
  the value of these conversations is finding them, not smoothing over them.
- **Decide at the constraint level where possible.** `02` §6.6 specifies the hash by required
  behaviour and portability rather than by naming an algorithm. Prefer that. It leaves the
  implementation free and the guarantee firm.
- **Do not invent to fill a gap.** If something genuinely cannot be settled yet, it goes in
  the open-questions table with a status — silently choosing is worse than recording the
  choice as open.
- **Do not spec outside the document's scope.** If a question belongs to a later document,
  note it in "Not in this document" and move on. Adjacent documents are not yet written; the
  temptation to settle their content in passing is strong and should be resisted.
- **Push back.** Agreeing with a weak decision costs more here than in most contexts, because
  everything downstream inherits it.

### When a decision earns an ADR

`/adr` is for decisions that were **reversed**, or that were **contested and are likely to be
re-proposed**. Ordinary rationale stays inline in the spec. An ADR is not a diary entry — if
nobody is going to reopen the question, it does not need a file.

If a locked decision from a completed spec is reopened and changed, that is always an ADR,
and every document that depended on it must be revisited.

## 8. End-of-conversation checklist

When a document is finished or materially changed:

1. Produce the final document as a single artifact, ready to drop into `/spec`.
2. **Verify, by opening it,** anything that must change in an **already-completed** spec as a
   result, and name what you opened. A claim about another document is stale by default: ten
   such claims in this package have described work that had already landed, and two of them
   were made by conversations that had just finished criticising the pattern. If nothing must
   change, say so explicitly.
3. List any new terms coined, for the eventual `01-glossary.md` harvest.
4. List anything marked `[EXTENSION POINT]` or `[POSTPONED]`, for the `roadmap.md` harvest.
5. Note whether an ADR is warranted (§7).
6. Provide the replacement lines for §3 and §4 of _this_ document — status row, new "Last
   completed" paragraph, and any change to authoring order — so it can be pasted into
   Project Instructions.
7. re-harvest 01
   Then: add the finished document to project knowledge, update Project Instructions, and start
   a fresh conversation for the next one. **At the start of that conversation, confirm the previous
   document actually arrived** — open it and check its status line against `_harvest.md`. The `01`
   pass of 2026-08-05 was completed and never reached project knowledge, and nothing in the package
   would have detected it.
8. If the document was the last one, port `/spec` and stop. There is no next conversation.
