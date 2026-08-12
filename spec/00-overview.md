# 00 — Overview

> **Status:** Draft, agreed. The package is complete — §10.  
> **Depends on:** `01`–`09`, `roadmap.md`, and `/adr`. This document is a harvest, not an authorship.  
> **Amended:** §3.1, §4.3, §4.4, §4.5, §6, §7, §9, §10, §10.1, §10.2, §12, Q5 — the `09` pass, 2026-08-06  
> **Amended:** §6 — `_harvest.md` indexed on its entry to the package, 2026-08-08. See ADR-003  
> **Amended:** §10.2 — the running total withdrawn in favour of a floor over the sites table, 2026-08-08. See `PLAN.md` §0.5  
> **Constrains:** nothing.

---

## 1. Purpose

This is the front door. A reader with no context — a person opening `/spec` for the first time,
or a later Claude Code session starting work — should be able to read this document and learn
four things: what the system is, what V1 includes, what it deliberately excludes, and which
document to open next.

It holds **no authority of its own**, in the manner of `01` §1. Every statement here traces to a
section of another document and cites it. Where this document and an owning document disagree,
the owning document is correct and this one is stale.

It is the complement of `roadmap.md`, which states the relationship from its own side (`roadmap`
§1): this document says what V1 is, that one says what V1 is not and what each exclusion would
cost to include. They were written to be read together, and neither is complete alone.

### 1.1 Why it is written last

The authoring order places the three harvests — `01`, `roadmap`, `00` — after the documents they
collect from, and this one last of the three, because it cites the other two. `01` §1.1 gives
the reason and it applies here unchanged: writing an overview first means inventing scope for
decisions not yet made, and the scope so invented then has to be defended against the decisions
that actually get made.

**Nothing is coined here.** A boundary that this document appears to draw was drawn somewhere
else, and the citation says where.

---

## 2. Not in this document

| Belongs elsewhere                                              | Owner                                         |
| -------------------------------------------------------------- | --------------------------------------------- |
| Every decision, and the rationale for it                       | the owning document                           |
| Definitions of terms, and which document owns which vocabulary | `01-glossary.md`                              |
| Deferred and postponed work, its cost, and its gate            | `roadmap.md`                                  |
| Decisions that were reversed, or are likely to be re-proposed  | `/adr`                                        |
| Package versioning, release policy, and output stability       | `05-extension-model.md` §10                   |
| Editor scope, authoring UI, and every advisory diagnostic      | `09-editor.md`                                |
| **Schedule, priority, and sequencing**                         | nowhere — deliberately absent, `roadmap` §3.3 |

---

## 3. The system

A **procedural tileset generator**.

An author composes a stack of operations in a visual editor. The editor saves a `TilesetFile`. A
Svelte component consumes that file and draws a randomized, grid-based background. Varying the
**seed** varies the background; nothing else does, and the same seed always produces the same
picture.

### 3.1 Three parts

| Part         | What it is                                                                                             | Specified by |
| ------------ | ------------------------------------------------------------------------------------------------------ | ------------ |
| **Engine**   | A pure function. `generate(config, seed, loadSalt) -> Grid<TileState>`. Knows nothing about pixels.    | `02`–`06`    |
| **Renderer** | Turns a `Grid<TileState>` into a picture. Owns layout, scaling, clipping, and asset resolution.        | `07`, `08`   |
| **Editor**   | The authoring surface that produces the file. A **host** of the renderer, not a second implementation. | `09`         |

There is **one** of each. §5.2 records that as a non-goal rather than an omission.

### 3.2 One boundary, drawn three times

The engine/renderer split is not organizational. It is the design, and three documents state it
in three different registers because a boundary stated only once is a boundary the next caller
walks through.

| Register         | Where             | Content                                                                                                                     |
| ---------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| As a signature   | `02` §4           | `generate(config, seed, loadSalt = 0) -> Grid<TileState>`, pure                                                             |
| As a prohibition | `02` §4.2, **G1** | The engine never receives a pixel measurement, a viewport, a DOM node, or a clock                                           |
| As a shape       | `06` §3.1, **C1** | No member of `config`, at any depth, is a prohibited input — so passing `config` is safe and passing `file` is a type error |

`02` §7 divides the values accordingly: `rows` and `columns` are engine input; `cellSize`,
`referenceWidth`, `yOffset`, and `horizontalAlignment` are not. `02` **G5** completes it —
the engine emits identifiers and never learns what an asset is.

---

## 4. What V1 is

Names and counts, with the owning table cited. **The owning table is authoritative**; this
section is a census, so that a reader can see the size of the surface without opening six
documents, and so that drift is cheap to detect. If a count here disagrees with the table it
cites, this document is wrong.

### 4.1 The engine

`generate(config: TilesetConfig, seed: Seed, loadSalt: uint32 = 0) -> Grid<TileState>` — `02` §4.

Randomness is **positional hashing**, not a sequential PRNG (`02` §6, §6.1), namespaced per
Operation by `operationId` and `salt` (`02` §6.3, §6.4), with a separate `assetSalt` for variant
distribution. The hash is specified by required behaviour and portability rather than by name,
and test vectors are a deliverable (`02` §6.6).

An **Operation** is the unit of authorship and the only way a `TileState` acquires a non-default
value (`04` §1, §3):

> for the cells in `selection`, take a number from `source`, interpret it through `mapping`, and
> combine it into `target` with `blend`.

| Part          | V1 members                                                      | Owner     |
| ------------- | --------------------------------------------------------------- | --------- |
| **Selection** | `all`, `rect`, `checkerboard`, `everyNth`, `random`, `cellList` | `04` §4.2 |
| **Source**    | `constant`, `random`, `valueNoise`, `gradient`, `vignette`      | `04` §5.2 |
| **Mapping**   | numeric (`range`, optional `steps`); tile (the palette)         | `04` §6   |
| **Blend**     | `set`, `add`, `multiply`                                        | `04` §7.1 |
| **Target**    | `tileId`, `scale`, `scaleX`, `scaleY`, `rotation`, `opacity`    | `04` §7.2 |
| **Attribute** | `scale`, `scaleX`, `scaleY`, `rotation`, `opacity`              | `03` §5.4 |

Blends are **partial**: a Blend declares the Target types it accepts, and a Target declares its
type, its default Blend, and its vetoes (`04` **O7**, ADR-001). Two Target types exist, numeric
and tile.

The attribute set is **closed at V1** (`03` **D7**) — not because attributes are hard, but
because an attribute is shared vocabulary between engine and renderer rather than an engine
extension point. `07` §10 supplies the renderer half; an attribute with no applier is a load
failure (**R13**).

Evaluation is per cell, in stack order, with asset resolution as a final step (`02` §9). Every
step is a pure function of `(x, y)`, so cells may be evaluated in any order or in parallel.

### 4.2 The file

```
TilesetFile {
  schemaVersion: 2
  engineVersion: string
  config:        TilesetConfig
  layout:        Layout
}
```

`06` §3. `config` holds `rows`, `columns`, `tiles`, `operations`, `assetSalt`,
`reseedAssetsOnLoad`, and `defaultSeed`. `layout` holds `cellSize`, `referenceWidth`, `yOffset`,
and `horizontalAlignment`. `seed` and `loadSalt` are arguments and have no slot in the file
(`06` §3.3, §3.4).

`schemaVersion` is required, an integer — `1` for V1, `2` since ADR-005; absent, or unknown and unreachable by `06` §4.5's migration, is a load failure
(**C2**). `engineVersion` is required and advisory (**C3**). Validation is strict — unknown keys
are errors and nothing is ever coerced (**C4**, **C6**) — and produces errors only, each with a
JSON Pointer path and a stable code (`06` §10). `validate()` is a separate function;
`generate()` trusts its input, and behaviour on an invalid config is undefined (**C5**).

### 4.3 The renderer

One renderer, one component (`07` §3, `08` **S1**):

```
<Tileset file={TilesetFile} seed?={string} loadSalt?={uint32}
         provider?={AssetProvider} onAssetError?={...} />
```

`<Tileset>` is the caller — it receives a parsed file and invokes `generate()` itself. Nothing in
the package accepts a bare `Grid<TileState>`. With no optional props it renders one fixed picture
(**S4**).

- **Geometry** is a function of `Layout`, `rows`, `columns`, and `Wpx` alone; the cell box
  consults no asset and reads no `TileState` (`07` §5, **R5**). Scale factor is
  `s = Wpx / referenceWidth`, derived from width only.
- **Assets** resolve through an `AssetProvider`, keyed by the `(tileId, assetId)` pair, pure per
  render session (`07` §4.1, §4.2, **R2**). `Drawable` is `{ src: string }`, drawn as an `<img>`
  (`08` **S5**). `meta` is passed to the provider verbatim; the V1 convention reads `src`,
  `width`, `height` (`07` §4.4).
- **Transforms** are scale before rotation about the drawable's centre (`03` **D11**), with
  centre-crop applied before any transform (`07` **R8**). Row-major paint order is part of the
  output, not an implementation choice (**R10**).
- **Coordinate mapping** — `cellBox` and `cellAt` — is public surface, exported as pure
  functions rather than component methods (`07` §8, `08` **S10**). There is one implementation of
  it, and overlays use it rather than recomputing (**R1**).
- Output is **decorative**: `aria-hidden`, `alt=""` (`08` §4.5).
  A viewport resize is a pure scale change and never regenerates (`07` §9.3, **R12**). An
  authoring resize changes `referenceWidth`, `cellSize`, or `horizontalAlignment`, re-derives
  `columns`, and is a destructive config edit the editor confirms (`02` §7.5, `09` §9.3,
  **E12**). It is a numeric field, not a drag — `09` §9.2 withdrew that premise and **E11**
  replaced it.

### 4.4 The editor

`09-editor.md`. It is a **host** of the renderer, not a caller and not a second implementation:
its preview is `<Tileset>` mounted on the editor's own file, drawing the complete operation
stack, with overlays drawn over it. There are no isolation previews and no sliced stacks
(`09` §5, `07` §3.1, `08` §3.1, **S2**). Exactly one kind of overlay exists — low-opacity
rectangles over an Operation's selected cells, drawn from `cellBox` (`09` §6.1, **E7**) — and
their cell sets come from the engine's `selection()` export rather than from an editor
implementation of any Selection test (**E8**). The editor never holds an invalid file, and the
component validates nothing (`08` §3.4, **S3**; `09` §12.1, **E15**).

**Its operating assumption is that it is the only writer of a `TilesetFile`** (`09` §3). That is
not a restriction on anyone. It is a statement about where six of the package's guarantees are
**manufactured**, because they are enforced nowhere else and cannot be checked after the fact:

| Guarantee                                                           | Manufactured at                                      |
| ------------------------------------------------------------------- | ---------------------------------------------------- |
| `columns × cellSize ≥ referenceWidth`, so there are no edge gutters | `09` §9.3, from `02` §7.1's upward parity correction |
| `columns`' parity matches `horizontalAlignment`                     | the same derivation                                  |
| Identifiers are generated, unique in scope, and contain no colon    | `09` §4.3                                            |
| `engineVersion` names the engine that actually wrote the file       | `09` §11.2                                           |
| `meta.width` and `meta.height` exist and are correct                | `09` §10.3, at attach time                           |
| `reseedOnLoad` is set only where it means something                 | `09` §8.4                                            |

**Invariant E1** binds all six: an editor that writes a file violating one has failed to meet the
specification, not merely produced awkward output. **E2** adds the condition that makes the
fourth truthful — the preview component and the `engineVersion` writer come from one pinned
package version, which is §8.2 applied to the editor's own build.

Four of the six are exactly the rows `06` §10.4 lists as legal configs worth telling an author
about, and `09` §3 draws the general form: **an advisory diagnostic is the shadow of a guarantee
the editor manufactures.** `06` can enumerate them without being able to prevent them, because
prevention happens in the editor.

The assumption is reversible and reversing it invalidates no argument — `05` §3's non-goal is
about who registers _types_, and writing a config is a different act. What a third-party writer
would need is the table above promoted into published prose or into checks; `validate()` and
**C7** already ship. `09` §3.1 says so explicitly and adds that **§5.2 need not change**. The row
is `09` §14.

### 4.5 The census

| Surface                       | Count | Owner                          |
| ----------------------------- | ----- | ------------------------------ |
| Engine entry points           | 1     | `02` §4                        |
| Selections                    | 6     | `04` §4.2                      |
| Sources                       | 5     | `04` §5.2                      |
| Mapping kinds                 | 2     | `04` §6                        |
| Blends                        | 3     | `04` §7.1                      |
| Targets                       | 6     | `04` §7.2                      |
| Target types                  | 2     | `04` §7.2                      |
| Attributes                    | 5     | `03` §5.4                      |
| Top-level file members        | 4     | `06` §3                        |
| `Layout` fields               | 4     | `02` §7, `06` §3.3             |
| `schemaVersion`               | 2     | `06` §4.1                      |
| Renderer components           | 1     | `08` §3                        |
| Component props               | 5     | `08` §4                        |
| `Drawable` keys               | 1     | `08` §4.2                      |
| Exported coordinate functions | 2     | `08` §7                        |
| Manufactured guarantees       | 6     | `09` §3                        |
| Editor invariants             | 16    | `09` §13                       |
| Advisory diagnostics          | 9     | `06` §10.4 (4), `09` §12.2 (5) |
| Overlay kinds                 | 1     | `09` §6.1, **E7**              |

---

## 5. Non-goals

### 5.1 A non-goal is not a deferral

`roadmap.md` holds work that is agreed-unbuilt (`[EXTENSION POINT]`) or not-yet-agreed
(`[POSTPONED]`). This section holds something different: the **standing postures** the package is
built on. Each one is an assumption several documents reason from, so reversing it does not add a
feature — it invalidates arguments.

The two overlap and must not be duplicated. Where a posture is reversible, `roadmap` carries the
row with its cost and gate, and this section points at it rather than restating it. Where a
posture is permanent, there is no row and this section says so.

### 5.2 The standing non-goals

| Non-goal                                                                                                                                                                                     | Stated by             | Permanent?                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| **No public plugin API, no third-party extension authors.** A new Source is a source file, a table entry, a commit, a release.                                                               | `05` §3, §3.1         | Reversible — `roadmap` §5.1, and it earns an ADR                                              |
| **No second implementation in another language.** Portability is therefore a claim about _time_, not about languages: a background authored in March is drawn by a newer build in September. | `05` §3.1, `07` §3.1  | Reversible in principle; nothing carries a row, and `02` §6.6's constraints keep it cheap     |
| **No conformance suite for third parties.** `07`'s title is read narrowly — what _this_ renderer guarantees, and therefore what the editor and every consumer may rely on.                   | `07` §3.1             | Follows from the row above                                                                    |
| **No second renderer.** The editor's preview is the renderer with overlays, not a simplified stand-in.                                                                                       | `07` §3, `08` **S2**  | Permanent as a posture; a bare-grid _surface_ under the same implementation is `roadmap` §4.3 |
| **No graceful degradation.** An unknown type is a load failure; nothing falls back to a default and nothing skips an Operation.                                                              | `05` **X7**, §9       | Permanent                                                                                     |
| **No layering within a cell.** A `TileState` holds at most one `tileId`. Stacking is compositing of N grids in the renderer, not two Tiles in one cell.                                      | `03` **D10**, §6.2    | **Permanent, and explicitly not a V1 limitation.** The N-grid feature is `roadmap` §4.3       |
| **The output is decorative.** Meaningful content is never a tile.                                                                                                                            | `08` §4.5             | Reversible — `roadmap` §5.3                                                                   |
| **The engine is viewport-agnostic.** `columns` is frozen at authoring time; the engine never learns a pixel measurement.                                                                     | `02` §4.2, §7, **G1** | Permanent. It is the boundary, not a simplification                                           |
| **No schedule, no priority, no "next" anywhere in the package.**                                                                                                                             | `roadmap` §3.3        | Permanent as a property of a specification                                                    |

---

## 6. Document index

| Doc                         | Owns                                                                                          | Prefix | Status                      |
| --------------------------- | --------------------------------------------------------------------------------------------- | ------ | --------------------------- |
| `00-overview.md`            | Scope, non-goals, the V1 boundary, this index                                                 | —      | this document               |
| `01-glossary.md`            | Terminology, and which document owns which vocabulary                                         | —      | Draft, agreed               |
| `02-generation-contract.md` | The engine boundary: signature, purity, seed model, coordinate space, hashing, `TileState`    | **G**  | Draft, agreed               |
| `03-domain-model.md`        | The nouns: `Tile`, `TileAsset`, the attribute set, domains, defaults, bounding                | **D**  | Draft, agreed               |
| `04-operations.md`          | The verbs: Selection, Source, Mapping, Blend, Target semantics and every V1 preset            | **O**  | Draft, agreed               |
| `05-extension-model.md`     | How the list of types grows, what an entry declares, and package versioning                   | **X**  | Draft, agreed               |
| `06-config-schema.md`       | The file: JSON shape, key names, `schemaVersion`, strictness, validation and error vocabulary | **C**  | Draft, agreed               |
| `07-render-contract.md`     | What this renderer guarantees: geometry, asset resolution, transforms, paint order, stability | **R**  | Draft, agreed               |
| `08-renderer-svelte.md`     | The component: props, events, substrate, SSR, the exported surface                            | **S**  | Draft, agreed               |
| `09-editor.md`              | Editor architecture, authoring affordances, advisory diagnostics                              | **E**  | Draft, agreed               |
| `roadmap.md`                | Every deferral, its cost, and its gate                                                        | —      | Draft, agreed               |
| `_harvest.md`               | The harvest ledger: what each numbered document contributed to `01`, `00` and `roadmap`       | —      | Retired ledger; see ADR-003 |
| `/adr/*`                    | Decisions reversed, or contested and likely to be re-proposed                                 | —      | ADR-001, ADR-002            |

**A correction, recorded rather than made silently.** An earlier index described `07` as _what
any renderer must guarantee_. `07` §3.1 objects to that wording in as many words and asks it to
be read narrowly, because there are no third parties and therefore no conformance obligation.
The row above states it the way `07` states it. **The tidy-up §12 recorded as owed has landed.**
`07` §3.1 now cites `00` §6 as stating it that way and carries no objection at all — verified by
opening `07` on 2026-08-06. What is left is smaller and is §10.1's: `07`'s header block carries
**Amended** lines for `/adr` and `08` only, so nothing in it records that §3.1 changed.

**Documents with no invariant prefix bind nothing.** `01`, `roadmap`, and this document are
harvests; `01` §11.1 reserves a prefix for every document that binds behaviour and none for the
three that collect. `/adr` has none because an ADR records a decision the owning document
carries.

---

## 7. Reading order

The dependency graph, harvested from the header blocks. An arrow means _depends on_.

```
02 ─┬─> 03 ─┬─> 04 ─┬─> 05 ─┬─> 06 ─┬─> 07 ──> 08 ──> 09
    │       │       │       │       │
    └───────┴───────┴───────┴───────┴──> (each depends on all of its left)

01  ──  constrains every document, on naming only; depends on all of them
roadmap ── depends on 01–09 and /adr; constrains nothing
00  ── this document; depends on 01–09 and roadmap; constrains nothing
```

Numbers are load order and are also, for `02`–`08`, the order to read in: each document depends
on every document before it and the chain has no shortcuts. Three practical entries:

| If you are…                            | Read                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| implementing the engine                | `02`, then `03`, `04`, `05`, `06`. `07`–`08` are not needed                                 |
| implementing or consuming the renderer | `02` §4–§9 for the shape of its input, then `06` §3, then `07`, `08`                        |
| adding a Selection, Source, or Blend   | `05` first — it says what an entry must declare — then `04` for the neighbours              |
| implementing the editor                | all eight, in order, then `09`. It restates none of them; `09` §2 says what it does not own |
| looking for something you cannot find  | `01` for the term, `roadmap` for the feature, `/adr` for a reversal                         |

`02` is the constraining document for the package. A change there can invalidate saved
configurations (`02` §1), and every document downstream inherits its decisions.

---

## 8. What the package has in common

Five principles recur across documents that were written weeks apart, each under a different
name. Collected here because each is visible only from outside any one document — the same reason
`roadmap` §1 gives for collecting deferrals.

**This section binds nothing and is descriptive.** Every claim cites the sections that already
make it. It is here so that a reader deciding a question the specs do not cover can decide it the
way the specs would have.

### 8.1 Determinism is the load-bearing property

The engine is pure (`02` §4). Positional hashing is chosen over a sequential PRNG specifically so
that resize is stable and per-operation reroll is possible (`02` §6.1). A change to generated
output for an unchanged `(config, seed, loadSalt)` is a **major** bump (`05` **X9**), and the same
rule holds on the renderer side for drawn output (`07` **R14**). Both sides ship exact test
vectors (`02` §6.6, `07` **R15**).

Two honest exceptions are on the record rather than hidden. Weight edits are not locally stable
and this is known and accepted (`02` §10.1). `gradient`'s use of `cos`/`sin` may not be
bit-reproducible across runtimes, which bears directly on **G1** and is a correctness obligation
before `1.0.0` rather than a deferral (`roadmap` §7.1 A1).

### 8.2 One implementation of anything two things could disagree about

One engine (`05` §3). One renderer, of which the editor's preview is an instance (`07` §3). One
coordinate mapping, shared by the renderer and every overlay (`07` **R1**). One component, one
entry point (`08` **S1**).

`05` §3.1 and `07` §3.1 arrive independently at the same consequence: **portability becomes a
claim about time, not about languages.** The risk is never that two teams disagree; it is that a
build in September disagrees with a file written in March.

The argument is always the same shape. Two implementations that are supposed to agree eventually
disagree, and the disagreement surfaces as a plausible-looking wrong picture with nothing
reporting it — which `07` §3 notes is uniquely bad in the preview, the one place the author is
looking directly at it.

### 8.3 Make the wrong thing unstateable, rather than detecting it

`06` **C1** is the model: the file's two-block split means a prohibited engine input cannot be
written, at any depth, so no caller has to remember the rule. `08` §3.1 rejects split
`config`/`layout` props for the mirror reason — they would make a mismatched pair _expressible_.
`03` §6.1 forbids an Operation from writing `assetId` because forbidding removes the dangling-pin
problem rather than managing it. `04` §7.2 inverts the Blend declaration so that a Blend added
later is available on every numeric Target at once rather than accepted by nothing.

The counter-instance is recorded too, and it is instructive: unenforced layer stacking already
works today through host CSS and looks correct for exactly as long as two files happen to agree
on four numbers, with nothing detecting the drift (`roadmap` §4.3). That is what the principle
exists to prevent.

### 8.4 Failure is loud

An unknown type is a load failure and nothing is substituted (`05` **X7**). An absent or unknown
`schemaVersion` is a load failure, and no shape is inferred from which fields happen to be
present (`06` **C2**). Validation produces errors only — there are no warnings (`06` §10.1).
Asset resolution failure never substitutes and never returns null (`07` **R3**). An attribute with
no applier fails (`07` **R13**). Resolution failure and load failure share one channel so neither
can be handled and the other forgotten (`08` **S6**). `03` §6.4 goes as far as distinguishing two
different ways of rendering nothing, because silent absence is hard to diagnose.

**The one deliberate exception is `meta`.** `06` **C4** exempts it from strictness, which makes it
the single place a typo is silent, mitigated only by a runtime resolution failure. The cost is
recorded rather than argued away, and whether to close it is `roadmap` §7.2 B3.

### 8.5 Nothing is deleted

Section numbers are append-only and a removed section keeps its number as a tombstone (`01`
§11.4). A published type name is never reassigned to different semantics; retiring is removal, not
recycling (`05` **X8**). A roadmap row leaves its table by landing in _Delivered and withdrawn_,
never by disappearing (`roadmap` §6). `07` §2 keeps a withdrawn routing in place as a tombstone.
`_harvest.md` is append-only for the same reason.

The failure mode is identical in every case: a deleted thing is indistinguishable from a thing
that never existed, and the next reader has no way to tell whether they are looking at new
material or at a gap.

---

## 9. Conventions

Every document in the package shares these. All are owned by `01`; this is a pointer table, not a
restatement.

| Convention                                                                                                        | Owner       |
| ----------------------------------------------------------------------------------------------------------------- | ----------- |
| Header block: **Status**, **Depends on**, **Constrains**, and one **Amended** line per amendment                  | house style |
| Required sections: Purpose · Not in this document · body · Invariants summary · Extension points · Open questions | house style |
| Invariant IDs are prefixed per document, so they never collide — §6's table                                       | `01` §11.1  |
| `[EXTENSION POINT]` — _"enabled by a decision already made; deliberately not built"_                              | `01` §11.2  |
| `[POSTPONED]` — _"deliberately deferred beyond V1; no design work done"_                                          | `01` §11.2  |
| Section numbers are append-only; nothing is renumbered, and a removed section keeps its number                    | `01` §11.4  |
| An invariant amended in place keeps its identifier; only the text moves                                           | `01` §13    |
| Bare _type_ and bare _default_ are not written where two senses are in scope                                      | `01` §11.5  |
| **A claim that another document needs amending is verified by opening that document**                             | §10.2       |
| **A document is confirmed to have arrived before the next pass runs against it**                                  | `01` Q9     |

**The two marker rows are quoted rather than paraphrased, deliberately.** This document carried
the gloss _extension point means agreed and unbuilt; postponed means not yet agreed_, which is
close enough to be dangerous: it cost `roadmap` a misfiled row in its `09` pass, because a
discharged gate does not read as _agreed_ under the paraphrase and plainly is _a decision already
made_ under `01` §11.2. `roadmap` §3.1 records that in full and now quotes. This was the third
site of the same gloss.

**The last two rows are process, not prose, and they are here because this is where a reader
looks for the discipline.** Both are the package's own failures generalized — §10.2 for the
first, `01` Q9 for the second — and both are cheap: one document opened, once.

The **Not in this document** section is load-bearing rather than courteous. It is how scope creep
is caught, and `roadmap` §4.4 records the one case where it failed: asset authoring existed only
as a routing from `07` §2 and `08` §2, with no destination row anywhere in the package. A routing
with no destination is how work disappears.

---

## 10. Status of the package

**All ten documents are _Draft, agreed_, and the package is complete.** `09-editor.md` landed,
and `01`, `roadmap`, and this document have each taken their pass against it — `01` §15 Q6 and
`roadmap` §1.1 record theirs, and this document is the third. `01` §3.1 is empty and no
`[UNHARVESTED]` marker remains anywhere.

Nothing has been implemented. The package ports into a `/spec` folder in the repository and
development proceeds from there.

### 10.1 What is still owed

| Owed                                                                             | To whom                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~`09-editor.md`~~                                                               | **Delivered.** _Draft, agreed_, sixteen invariants, nine advisory diagnostics between it and `06`. Kept as a tombstone per §8.5                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ~~A re-harvest of `01`, `roadmap`, and this document after `09`~~                | **Delivered.** All three passes have run. Tombstone per §8.5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ~~Three marker reconciliations~~                                                 | **Discharged.** All three — `04` §10 (`curve`), `03` §8 (typed-attribute gate), `08` §10 (layers) — were already amended when this row was written, and the row was wrong rather than pending. Kept as a tombstone per §8.5. The residue was `04` §6.2's prose, which still read `[POSTPONED]` against its own §10 table                                                                                                                                                                                                                                                         |
| A decision on `gradient`'s transcendental reproducibility                        | `1.0.0`. **G1** is overstated until it is settled — `roadmap` §7.1 A1. **The only row here that outlives the package**, and the first thing implementation forces: either an integer approximation for the angle projection, or the exposure accepted and recorded as known-bad in the manner of `02` §10.1                                                                                                                                                                                                                                                                      |
| Three one-line residues, each verified by opening the document named, 2026-08-06 | `07`, `09`, `01`. **`07` §9.1**'s first row still says the author _drags the design page width_, the premise `09` §9.2 withdrew and **E11** / **E12** replaced; `07` also carries no **Amended** line for either `09`-driven change to it, §3.1's included (§6). **`09` Q11** reads _open until the package's harvests run_, and they have run; its parenthetical claim of three amendments owed to `02` and `04` is the instance `_harvest.md` corrects. **`01` §13** says **D3** _is owed_ its rewrite; `03` carries it, rewritten in place, with a header line citing `01` Q7 |

### 10.2 A correction to the harvest ledger

Recorded because it was found by this harvest and would otherwise have been found by the one it
breaks.

`_harvest.md` marked both its `07` and `08` blocks _"harvested into 01, 2026-08-04"_, while `01`'s
status line reads _5 of 9 documents harvested (`02`, `03`, `04`, `05`, `06`)_ and `01` §3's map
showed both as unharvested. **`01` was right.** Inspection found none of `render box`, `Wpx`, or
`onAssetError` in it: the markers had been applied at authoring time rather than earned by a pass.
Both are now struck in place, and `01` §3's column distinguishes _unharvested_ from _not written_,
which it had been conflating across four rows.

The trap it nearly set is worth keeping visible. A `01` re-harvest trusting those markers would
have skipped both blocks and dropped roughly thirty-five terms, two corrections to
already-harvested entries, and both `10.1` rejected-form tables — silently, because a skipped
block is indistinguishable from an absent one. `_harvest.md`'s preamble claims to be _the only
input the `01` harvest needs_; it is reliable about what it contains and was wrong about what had
been done with it. A retirement marker is a claim about `01`, so it is verified by opening `01`
and never by trusting the ledger.

**The rule generalizes, and this document broke it too.** §10.1's third row claimed three marker
reconciliations were owed; all three had already landed. Same shape as the paragraph above, one
level up, and costing a pass rather than a bug — the reader acts on a table that describes work
already done. Two instances was enough to state it once: **a claim that another document needs
amending is a claim about that document, verified by opening it and never by trusting the table
that records the claim.** It applies to `_harvest.md`'s retirement markers, to §10.1's owed-work
table, and to `roadmap` §10 Q2, which stayed open against an `08` that had already been amended.

**The sites are given below, and the number they sum to is a floor rather than a count.** The
rule above has prevented none of them. A pass that finds an instance adds the site here; no pass
recounts, and nothing in the package is obliged to know the current total. Fourteen is what the
table sums to, and it can only be understated — §8.5 forbids a recorded instance leaving the
table, so a floor goes out of date by growing rather than by becoming false. That is the one
property a running total does not have, and it is the property this section exists to name.

| Where the instances are recorded                                                      | Count |
| ------------------------------------------------------------------------------------- | ----- |
| `_harvest.md`'s `07` and `08` retirement markers — above                              | 2     |
| §10.1's third row: three reconciliations claimed owed, all landed                     | 1     |
| `roadmap` §1.1: four notes in its own §4 and §5, stale before the pass opened         | 4     |
| `roadmap` §1.1: two more produced by the pass that was recording the first four       | 2     |
| `roadmap` §10 Q2, open against an `08` already amended                                | 1     |
| `_harvest.md`'s correction to `09` Q11: three amendments to `02` and `04`, all landed | 1     |
| `roadmap` §4.5: `01` §14's citation of `roadmap` §5.4, true when written              | 1     |
| This pass: §12's second row, and `01` §13's claim that **D3** is owed its rewrite     | 2     |

Four of the fourteen were produced by conversations that were **actively auditing for the
pattern**, which is what makes the sites worth recording rather than the rule worth restating.
The last two are a milder form — correct when written and stale when applied — and they are the
harder ones, because nothing was wrong at the moment of writing.

**A register was considered and cut, and the total is now cut for the same reason.**
`_harvest.md`'s `00` block records the first: a fourteen-row register, one row per instance,
would have made this document the owner of rows no other document carries, which is authorship
and §1.1 forbids it. A running total is that register's residue — a claim this document owns,
maintained by nobody, incremented by every pass including the ones auditing for the pattern. Each
site survives because it is checkable by opening what it names. A sum of sites is not, and a
reader who needs the current number gets it by adding the column.

**What to do about it is not decided here.** `roadmap` §10 Q6 holds the question and its three
options: date each such note, drop them and record the amendment only where it is owed, or keep
them and make verification a step in the process rather than a habit. §9's last two rows are that
third option taken provisionally; Q6 stays open because two passes have now failed the habit
version and one pass is not evidence that the step version holds.

---

## 11. Invariants summary

**None, and deliberately.**

This document collects; it does not constrain. `01` §11.1 reserves an invariant prefix for every
document that binds behaviour and none for the harvests, and that gap should stay — `roadmap` §8
makes the same statement for the same reason.

If something stated here needs to bind, it belongs in the document that owns it, asserted at the
point the decision is made, where the documents downstream inherit it.

---

## 12. Extension points

| Point                                                                   | Status                                                                                                                                                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~A harvest pass after `09` lands~~                                     | **Delivered** — this pass. Kept as a tombstone per §8.5. The document now grows only when a document is added or amended, in the manner of `01` §14                              |
| ~~Amending `07` §3.1's reference to the old index wording (§6)~~        | **Discharged, and it was not owed when this row was written.** `07` §3.1 cites `00` §6 approvingly; the residue is a missing **Amended** line and is §10.1's. Tombstone per §8.5 |
| Generating §6 and §7's graph from the header blocks rather than by hand | `[POSTPONED]` — the same shape as `01` §14's third row and `06` Q12. Two documents already want this tooling                                                                     |
| A one-paragraph summary of each document, beside the index row          | `[POSTPONED]` — every document's §1 Purpose already is one, and a second copy is a second thing to keep in sync                                                                  |

---

## 13. Open questions

| #   | Question                                                                                                                                 | Status                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Is §4's census worth its maintenance cost, given it duplicates six tables?                                                               | **Resolved — yes, as counts.** Names plus a count and a citation is cheap to check against the owning table and expensive to get silently wrong. A prose restatement of each table would not be, and is why §4 states no semantics.                                                                          |
| 2   | Which is right about `07` and `08` — the ledger's retirement markers, or `01`'s status line? (§10.2)                                     | **Resolved — `01`'s status line.** Settled by inspection during this conversation; the markers are struck and the `01` §3 column now separates _unharvested_ from _not written_. The `01` pass after `09` is unblocked and takes both blocks as input.                                                       |
| 3   | Does §8 belong in a specification at all?                                                                                                | **Open.** It is descriptive, cites everything, and invents nothing — but it is the one section here that a reader could mistake for authority. Marked as non-binding in its own preamble. Revisit if it is ever cited as though it decided something.                                                        |
| 4   | Should the permanent non-goals in §5.2 carry invariant IDs in their owning documents, so they are enforceable rather than merely stated? | **Open.** Three already do — **D10**, **G1**, **X7**. _No second renderer_ and _no public API_ do not, and are postures rather than invariants. Whether that distinction is principled or accidental has not been examined.                                                                                  |
| 5   | Completeness.                                                                                                                            | **Resolved.** Ten of ten documents are _Draft, agreed_. §4.4 is a citation, §4.5's census gained four editor rows, §6's index is current, and §10.1 holds one substantive row — `gradient` — which is owed to `1.0.0` rather than to the package. It reopens when a document is added or materially amended. |
