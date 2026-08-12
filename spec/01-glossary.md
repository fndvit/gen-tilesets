# 01 — Glossary

> **Status:** Draft, agreed. All ten sources harvested — `02`–`09`, `00`, and `roadmap.md`.  
> **Depends on:** every document in the package  
> **Constrains:** every document in the package, on naming only.

---

## 1. Purpose

This document does two jobs.

**Naming truth.** It records the settled term for each concept, so adjacent documents cannot
drift into synonyms. Terminology drift is the most likely way this package quietly breaks.

**Navigation.** It maps a term to the document that owns it. Given any word appearing in the
specs, the reader — or a later Claude Code session — should be able to open this file and
learn where the authority for that word lives, whether or not the definition has been written
yet.

It holds **no authority of its own.** Every entry cites its owner. Where an owning document
and this glossary disagree, the owning document is correct and this glossary is stale.

### 1.1 Why it exists before the package is finished

_(Historical. The condition this section describes has ended; kept because it explains the
document's shape.)_

The authoring order places harvests last, because writing them early means inventing
vocabulary for decisions not yet made. That reasoning stands, and this document did not
violate it: **nothing is coined here.** Every definition traces to a section of a completed
document. A term that was owned but not yet defined appeared as a hole, marked
`[UNHARVESTED]`, with its owner named and no definition supplied.

Started early for one reason — to freeze the terms `02` settled, `Tile` and `TileAsset` above
all, before the documents that consume them could drift. It grew by harvest, one pass per
document completed, not by authorship. **There are no `[UNHARVESTED]` markers left.**

### 1.2 What changed in this pass

Recorded because a living index that silently rewrites itself is not auditable.

- **The last four sources harvested** — `07`, `08`, `09`, and `00`, plus `roadmap`'s deferral
  vocabulary. Seven new subsections carry them, all appends under §11.4: §5.4 the editor, §6.1
  render space, §6.2 the coordinate mapping, §7.4 asset resolution, §7.5 applying an attribute,
  §9.2 drawn-output stability, §11.5 the qualification rule, §11.6 deferral and scope
  vocabulary. Nothing was renumbered.
- **`_harvest.md` had no `09` block.** The ledger ends at `08`. `09` was harvested by reading
  `09-editor.md` directly. This is `00` §10.2's rule meeting its own inverse — that section
  warns against trusting a _retirement_ marker, and the failure here is the mirror image: a
  table claiming a block exists when none was ever written. Raised as open question 9.
- **§3.1 is empty**, for the first time since it was created. Fifteen rows close; two of them
  were never holes at all — see §3.1.
- **Open question 7 is resolved by renaming.** The cumulative-weight walk is **the weight
  walk**, and the word _selection_ is left to `04` §4 alone. `05` §6.2's _palette walk_ survives
  unchanged as the palette instance of it. Eight amendments are owed across `02`, `03`, and
  `04`, including **D3** rewritten in place; none touches an identifier, a config key, or an
  API, so no version number of any kind moves.
- **Open question 8 is resolved by adoption.** The qualification rule for _type_ and _default_
  becomes a convention at §11.5. `07`–`09` were named as the test and produced no fifth sense of
  either word.
- **Open question 6 closes and the status line moves to _Draft, agreed_.** Ten of ten.
- **Two definitions in §5 were wrong and are corrected**, per the `08` block's own correction
  table: _Caller_ is `<Tileset>` permanently (**S1**), not an open role, and _Renderer_ is the
  engine's caller rather than the consumer of its output.
- **§5.3's _Advisory diagnostic_ said three; there are four in `06` §10.4 and nine in total.**
  `07` §5.2 added the fourth in passing and `09` §12.2 coins five more. §3.1 carried the same
  stale count in its own row.
- **§6's _Destructive edit_ was attached to the wrong control.** `09` §9.2 withdraws `02` §7.5's
  premise: the draggable width writes nothing, and the destructive edit is a numeric field
  covering three fields rather than one.
- §10.1 gains eleven rejected forms, §10.2 four reserved words, and §10.3 three tolerated
  collisions. §13 now records all eight invariant prefixes as declared.

---

## 2. Not in this document

| Belongs elsewhere                                                                        | Owner                                                            |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Scope, non-goals, the V1 boundary**                                                    | `00-overview.md`                                                 |
| **Rationale for any decision**                                                           | the owning document — this glossary defines, it does not justify |
| Semantics, parameters, and mathematics of Selections, Sources, Mappings, Blends, Targets | `04-operations.md`                                               |
| Attribute domains, defaults, bounding behaviour, transform order                         | `03-domain-model.md`                                             |
| Registry contracts for adding new operation parts, and package versioning                | `05-extension-model.md`                                          |
| JSON key names, types, validation rules, and error codes                                 | `06-config-schema.md`                                            |
| Scaling, clipping, viewport fitting, asset formats, transform mathematics                | `07-render-contract.md`                                          |
| Component props, events, SSR, the substrate, the exported surface                        | `08-renderer-svelte.md`                                          |
| Editor interaction vocabulary, and every advisory diagnostic                             | `09-editor.md`                                                   |
| Deferred and postponed work                                                              | `roadmap.md`                                                     |

§3 below is a map of **which document owns which vocabulary**. It is not the package index;
that is `00-overview.md`, and it indexes scope rather than terms.

---

## 3. Document map

The vocabulary domain each document owns, and whether this glossary has harvested it.

| Doc                         | Vocabulary it owns                                                                                     | Harvested                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `00-overview.md`            | Scope and non-goal vocabulary, the V1 boundary                                                         | ✅ §11.6                      |
| `01-glossary.md`            | — this document —                                                                                      | —                             |
| `02-generation-contract.md` | Engine boundary, seed model, coordinate space, determinism, hashing, Grid/Layout split                 | ✅ §5–§9                      |
| `03-domain-model.md`        | `Tile` and `TileAsset` internals, the attribute set, defaults, domains, bounding, `TileState`          | ✅ §6–§7                      |
| `04-operations.md`          | Selection, Source, Mapping, Blend, Target semantics; every named preset; `reseedOnLoad`                | ✅ §8                         |
| `05-extension-model.md`     | Registry vocabulary, what each kind declares, package versioning, conformance artifacts                | ✅ §8.7, §9.1                 |
| `06-config-schema.md`       | The file, `schemaVersion`, key names, strictness, validation and error vocabulary                      | ✅ §5.2, §5.3                 |
| `07-render-contract.md`     | Scaling, clipping, viewport fitting, asset formats, transform mathematics, the asset provider contract | ✅ §6.1–§6.2, §7.4–§7.5, §9.2 |
| `08-renderer-svelte.md`     | Component API — props, events, the substrate, the exported surface                                     | ✅ §5, §6.1, §7.4             |
| `09-editor.md`              | Editor interaction vocabulary, advisory diagnostics, repair affordances                                | ✅ §5.4                       |
| `/adr/*`                    | — no vocabulary of its own —                                                                           | —                             |
| `roadmap.md`                | Deferral vocabulary                                                                                    | ✅ §11.6                      |

### 3.1 Known holes

**Empty.** Every term this table has carried since it was created now has a definition and an
owner. It is kept rather than deleted, per §11.4, because a heading that disappears is
indistinguishable from one that never existed.

Fifteen rows closed this pass. Where they went:

| Closed row                                                           | Now at                                                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Scale factor, viewport fitting, asset formats                        | §6.1; asset formats at §7.4 — raster and SVG are one thing to the renderer (**S5**)      |
| Asset provider contract                                              | §7.4                                                                                     |
| The contents of a TileAsset's `meta` block                           | §7.4 — three keys, `07` §4.4                                                             |
| Transform mathematics                                                | §7.5                                                                                     |
| How the caller draws `loadSalt`, and what it does with `defaultSeed` | §5, _Render session_; the draw itself is `07` §9.3 and the prop is **S7**                |
| Renderer-side regression snapshots                                   | §9.2 — delivered as two exact vector tables (**R15**)                                    |
| Layer compositing vocabulary                                         | §11.6 — the owner moved to `roadmap` §4.3, since `08` §8 makes it a `schemaVersion` bump |
| Whether `loadSalt` is an exposed prop or sealed                      | §5 — a prop (**S7**); the component draws no random number                               |
| Authoring ranges on `scaleX` / `scaleY`                              | §5.4 — a soft track, `09` §7.5                                                           |
| How a palette is presented so order reads as meaningful              | §5.4 — a segmented bar, `09` §7.6                                                        |
| Repair of an orphaned `rect` versus an orphaned `cellList`           | §5.4 — there is no repair, `09` §9.4                                                     |
| Palette builder, dual slider handles, collapse-on-`constant`         | §5.4                                                                                     |
| How a `ValidationError` is presented, and the repair per code        | §5.4 — the import screen, and no automatic repair                                        |
| The advisory diagnostics                                             | §5.4 — four from `06` §10.4, five coined by `09` §12.2. This row said **three**          |
| Whether a registered type carries a human-readable description       | §8.7 — the optional `editor` block, `09` §7.2                                            |

**Two rows were never holes.** `minWidth` and `generateRegion` were carried here with
`[EXTENSION POINT]` in the Owner column, which is a category error: a hole is a term whose
owner has not written it yet, and an extension point is a term whose owner has decided not to
build it. Both belong in §14 and in `roadmap`, and `minWidth`'s reserved words were already
sitting in §10.2 the whole time. Recorded because the confusion is easy to repeat: the test is
_is someone going to write this_, not _does this exist_.

---

## 4. Reading the entries

- `code font` marks an identifier appearing in configuration or in an API.
- Capitalized Plain Text marks a domain concept with no single identifier.
- **Owner** cites document and section — `03` §5.4 — and the invariant where one applies.
  The bare-`§` shorthand was withdrawn in an earlier revision and stays withdrawn.
- `[UNHARVESTED]` marked a term whose owner existed but had not been written. **None remain**;
  the marker is retained in §11.2 because a future document would reintroduce the condition.
- A few entry headings are **descriptive labels** for a rule the owning document states without
  naming — _Operation evaluation_, _Per-octave salt_, _Identifier naming_, _Spread-or-nest_.
  They are flagged where they appear. A label is navigation; it is not a coined term and confers
  no authority.

---

## 5. System and boundaries

| Term                 | Definition                                                                                                                                                                                                                                                                                                                                         | Owner                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Engine**           | The pure function `generate(config, seed, loadSalt) -> Grid<TileState>`. Knows nothing of pixels, viewports, or graphical resources.                                                                                                                                                                                                               | `02` §1, §4                                                          |
| **Renderer**         | The engine's **caller**, not the consumer of its output: it invokes `generate()` itself rather than receiving a grid from elsewhere. Owns layout, scaling, clipping, asset resolution, and transform mathematics.                                                                                                                                  | `02` §1, §8.2; `07` §9; `08` **S1**                                  |
| **Caller**           | Whatever invokes `generate()`. Under **S1** that is `<Tileset>`, **permanently** — a known object rather than an open role. Owns `07` §9 in full: the seed fallback, `loadSalt` held for the session, and `file.config` rather than `file`. It **passes values and does nothing structural** — it never inspects an Operation, clones, or mutates. | `02` §4.1, §6.7; `04` §8.1, **O8**; `07` §9, §9.4; `08` §3.2, **S1** |
| **`<Tileset>`**      | The one entry point. Takes a `TilesetFile`, calls `generate()`, draws. **Nothing in the package accepts a `Grid<TileState>`.**                                                                                                                                                                                                                     | `08` §3, **S1**                                                      |
| **Host**             | Whatever mounts `<Tileset>` — a page, a layout, the editor. Supplies a valid file and a provider, owns the render box's width and the error channel, and decides the seed. Introduced specifically so that _caller_ is not overloaded.                                                                                                             | `08` §3.2                                                            |
| **Render session**   | One caller holding one `(file, seed, loadSalt)` triple; it ends when the caller does. `generate()` runs when the session begins and whenever `file.config`, `seed`, or `loadSalt` changes — and on nothing else. A `layout`-only edit moves every cell box and leaves every `TileState` alone.                                                     | `07` §9.1; `08` §5.2                                                 |
| **Editor**           | The authoring tool that produces a `TilesetFile`. A **host**, not a caller, and **the only writer of a `TilesetFile`** — six of the package's guarantees are manufactured there and enforced nowhere. Derives `columns`, owns seed and reroll affordances, writes `engineVersion`, and writes every field explicitly except `steps`.               | `02` §6.6, §7.1, §7.3; `06` §4.4, §5.1; `08` §3.3; `09` §3, **E1**   |
| **Config**           | The serializable description of a tileset consumed by the engine. Typed `TilesetConfig`, and the inner block of a `TilesetFile` (§5.2).                                                                                                                                                                                                            | `02` §4; `06` §3                                                     |
| **Validated config** | One that `validate()` returned an empty error array for.                                                                                                                                                                                                                                                                                           | `06` §10, **C5**                                                     |
| **Seed**             | A **string**, supplied as a runtime parameter and **required**. Hashed to `uint32` by Stage 1 before use. `seed = hostSeed ?? file.config.defaultSeed`, and the engine never applies the default.                                                                                                                                                  | `02` §4.1; `07` §9.2                                                 |
| `loadSalt`           | A `uint32`, the engine's third argument, default `0`. Drawn **once per render session** by the host and held for its duration. Not a config field and never written to one. A prop, not a value the component draws (**S7**).                                                                                                                      | `02` §4.1, §6.7; `06` §3.4; `07` **R12**; `08` §5.1, **S7**          |
| **Purity**           | The property that the same `(config, seed, loadSalt)` triple yields a structurally identical result on any machine, in any runtime, at any time. Survives `reseedOnLoad` because the engine receives `loadSalt` and never draws it.                                                                                                                | `02` §4, **G1**; `04` §8.1                                           |

### 5.1 Config members named so far

Navigation only. The authoritative shape is `06` §5.

| Member                                                         | Required                               | Owner                    |
| -------------------------------------------------------------- | -------------------------------------- | ------------------------ |
| `rows`, `columns`                                              | yes                                    | `02` §7; `06` §5         |
| `defaultSeed`                                                  | yes                                    | `02` §4.1; `06` §3.3, §5 |
| `assetSalt`                                                    | no — default `0`                       | `02` §6.4; `06` §5.1     |
| `reseedAssetsOnLoad`                                           | no — default `false`                   | `04` §8.2; `06` §5.1     |
| `tiles` — the tile library                                     | yes; may be empty                      | `03` §3.1; `06` §5       |
| `operations` — the operation stack                             | yes; may be empty                      | `02` §6.3; `06` §5, §7   |
| `cellSize`, `referenceWidth`, `yOffset`, `horizontalAlignment` | yes — in `layout`, not `config`        | `02` §7; `06` §8         |
| `schemaVersion`, `engineVersion`                               | yes — on the file, outside both blocks | `06` §4                  |

`defaultSeed` is **the only field in the config the engine carries and never reads.** Before
ADR-002 there were three; the reversal made `reseedOnLoad` and `reseedAssetsOnLoad` into engine
inputs (`02` §4.1, §6.7).

### 5.2 The file

| Term                        | Definition                                                                                                                                                                                                                                  | Owner                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **`TilesetFile`**           | `{ schemaVersion, engineVersion, config, layout }`. The only name in the package for the thing on disk.                                                                                                                                     | `06` §3                              |
| **`TilesetConfig`**         | Fixed type name for the engine's first argument, settled rather than left incidental.                                                                                                                                                       | `06` §3                              |
| **`Layout`**                | Fixed type name for the non-engine block. Not "the renderer's block": `horizontalAlignment` is read by neither engine nor renderer and lives here anyway, because the split is _engine / not-engine_.                                       | `06` §3, §3.3, §8                    |
| **The structural boundary** | _(descriptive label)_ The two blocks are `02` §7's Grid/Layout split made structural. No member of `config`, at any depth, is a pixel measurement, so passing `config` whole is safe and passing the file whole is a type error.            | `06` §3.1, **C1**                    |
| `schemaVersion`             | Required integer — `1` for V1, `2` since ADR-005. Absent, non-integer, or unknown and unreachable by §4.5's migration is a **load failure**; no shape is inferred from the fields present. Versions the file's **shape** and says nothing about what it renders. | `06` §4.1, §4.2, §4.5, **C2**        |
| `engineVersion`             | Required string, **advisory only**: written by the editor, never compared against the running engine, never gates a load. Required though never read, because an optional advisory field is absent precisely on the old files that need it. | `06` §4.4, **C3**; `09` §11.3        |
| **Identifier**              | `[A-Za-z0-9_-]+`. Generated, never authored. The colon is excluded because `operationId` and channel strings share one namespace (`04` §4.3).                                                                                               | `06` §5.3, **C10**; `09` §4.3        |
| `uint32`                    | An integer in `[0, 2³²)`. Both salts are narrowed to it; a fractional or out-of-range value is an error, never a truncation.                                                                                                                | `06` §5.2, **C9**                    |
| `meta`                      | A nested, opaque object on a TileAsset, default `{}`. Validated only for being an object, and **additive-only** once published (**R4**). `07` §4.4 fixes its V1 contents; it never reaches the engine.                                      | `06` §6.1, **C4**; `07` §4.5, **R4** |
| **Spread-or-nest**          | _(descriptive label)_ **Spread where the schema knows the keys, nest where it does not.** Selection and Source parameters are spread siblings of `type`; a TileAsset's metadata is quarantined in `meta`.                                   | `06` §7.1                            |
| **Optional**                | A field is optional **iff** this document declares a default for it. `null` is never a way to write "absent" — it is a legal value in exactly one place, a palette entry's `tileId`.                                                        | `06` §5.1                            |
| `type` (the tag key)        | Reserved in the parameter namespace. No registered type may declare a parameter called `type`.                                                                                                                                              | `06` §7.1                            |

**No member of this file is called `grid`.** `rows` and `columns` sit flat in `config`, so
whatever open question 1 eventually decides about the word, it does not reach the file format
and no saved file needs rewriting (`06` §3.2).

**`loadSalt` has no slot, deliberately.** Writing it into the file would freeze a load that was
supposed to vary. A file wanting a fixed picture achieves it by setting no `reseedOnLoad` flag
anywhere (`06` §3.4).

### 5.3 Validation

| Term                    | Definition                                                                                                                                                                                                                           | Owner                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| **`validate()`**        | `validate(file: unknown) -> ValidationError[]`. An empty array means valid. Takes a **parsed value, not text** — JSON syntax belongs to whoever called `JSON.parse`. A **gate** at import and an **assertion** while editing (§5.4). | `06` §10, **C5**; `09` §12.1    |
| **Strictness**          | An unrecognized key is an **error at every depth**, not ignored, preserved, or warned about. `meta` is the sole exception.                                                                                                           | `06` §9.1, **C4**               |
| **Coercion**            | Never happens. No clamping, rounding, truncation, or substituting a default for a value that is present but wrong. Absent-with-a-declared-default is not coercion: nothing was rewritten because nothing was there.                  | `06` §9.2, **C6**               |
| **`ValidationError`**   | `{ path, code, message }`.                                                                                                                                                                                                           | `06` §10.2, **C7**              |
| `path`                  | An RFC 6901 **JSON Pointer** — `/operations/2/mapping/range/1`. An address, because `09` must highlight a control, and prose cannot be resolved to one.                                                                              | `06` §10.2                      |
| `code`                  | Stable, and **never reassigned to different semantics**. `09` branches on it, so a recycled code sends the reader to the wrong field.                                                                                                | `06` §10.3                      |
| `message`               | Human-readable and **not part of the contract**. May change freely.                                                                                                                                                                  | `06` §10.2, **C7**              |
| **Advisory diagnostic** | A legal config worth telling an author about. Not a validation error, never blocking, never modifying the file. **Four** in `06` §10.4; `09` §12.2 coins five more, for nine in V1.                                                  | `06` §10.4; `09` §12.2, **E16** |
| **Undefined behaviour** | What `generate()` does with an unvalidated config, and what `<Tileset>` does with an invalid file. Development builds may assert; production builds do neither. Accepted, not a defect, in the manner of `02` §10.1.                 | `06` §10, **C5**; `08` **S3**   |

**No warnings.** A warning is a thing a loader must decide what to do with, and there are only
two answers: ignore it, in which case a load-time function should not have produced it, or fail
on it, in which case it was an error (`06` §10.1, **C6**).

**The V1 error codes** — `06` §10.3. Names, so recorded; the list is open but no published code
is ever reassigned.

| Code                     | Raised when                                                               |
| ------------------------ | ------------------------------------------------------------------------- |
| `SCHEMA_VERSION_MISSING` | `schemaVersion` absent                                                    |
| `SCHEMA_VERSION_UNKNOWN` | present, but not a version this build knows                               |
| `MISSING_KEY`            | a required key absent                                                     |
| `UNKNOWN_KEY`            | a key not in the schema, outside `meta`                                   |
| `TYPE_MISMATCH`          | wrong JSON type, including `null` where `null` is not legal               |
| `NOT_AN_INTEGER`         | an integer-typed field carrying a fractional or unsafe value              |
| `NOT_FINITE`             | `NaN` or `Infinity` in an in-memory config                                |
| `OUT_OF_RANGE`           | a value outside its admissible range                                      |
| `INVALID_IDENTIFIER`     | an id not matching `[A-Za-z0-9_-]+`                                       |
| `DUPLICATE_ID`           | a `Tile.id`, `Operation.id`, or within-Tile `TileAsset.id` collision      |
| `EMPTY_ASSET_LIST`       | a Tile with no TileAssets                                                 |
| `ZERO_WEIGHT_SUM`        | a Tile's assets, or a palette's entries, summing to zero                  |
| `DANGLING_TILE_REF`      | a palette entry's `tileId` matching no Tile in the library                |
| `UNKNOWN_TYPE_NAME`      | a Selection, Source, or Blend name absent from the registry (`05` **X7**) |
| `INVALID_TARGET_BLEND`   | a `(target, blend)` pair outside `04` §7.2's accepted set                 |

**Three of these are import-time codes only.** `DANGLING_TILE_REF`, `ZERO_WEIGHT_SUM`, and by
extension every other code are unreachable from inside the editor, because **E5** makes every
edit a legal transition (§5.4).

### 5.4 The editor

`09` owns this vocabulary. The organizing claim is that the editor is the **only writer** of a
`TilesetFile`, so several guarantees are _manufactured_ there rather than checked anywhere.

| Term                       | Definition                                                                                                                                                                                                                                                                         | Owner                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Manufactured guarantee** | _(descriptive label)_ A property no document enforces because the editor produces it: `originX ≤ 0`, `columns` parity, generated identifiers, a truthful `engineVersion`, `meta.width`/`height`, and a meaningful `reseedOnLoad`. **An advisory diagnostic is the shadow of one.** | `09` §3, **E1**             |
| **Legal transition**       | Every file-touching action is a total function `TilesetFile → TilesetFile` on legal input. In-flight input lives in the control and reaches the file only when it parses, so a `ValidationError` is unreachable while editing.                                                     | `09` §4.2, **E5**           |
| **Transient UI state**     | Editor state held **beside** the file, keyed by `Operation.id`, `Tile.id`, `TileAsset.id`. Session-scoped; does not survive a reload. Never written into `meta` (**E4**) and never into the file.                                                                                  | `09` §4.1, **E3**, **E4**   |
| **Mute-by-removal**        | There is no disabled flag, because there is no field for one. An Operation is muted by removing it from `config.operations` and holding it in UI state. Correct for free: **G3** attaches randomness to `operationId` and `salt`, not to stack position.                           | `09` §4.1                   |
| **Overlay**                | Exactly one kind: low-opacity rectangles over the cells an Operation's Selection includes, in that Operation's Selection section. Geometry is `cellBox`, never recomputed.                                                                                                         | `09` §6.1, **E7**           |
| **`selection()`**          | `selection(config, operationId, seed, loadSalt) -> (x, y) -> boolean`. The export the overlay requires, so the editor implements no Selection test. Total and unbounded in `(x, y)`, matching `cellAt`. A minor engine bump — an added export that moves no output.                | `09` §6.2, **E8**; `02` §12 |
| **Affordance**             | A control plus its obligation — _writes this field_, _is destructive_. `09` specifies affordances, never appearance; panel layout is specified nowhere.                                                                                                                            | `09` §3.1                   |
| **Affordance mapping**     | `ParamSpec` → control, driven by bounds rather than by a table of widgets: both bounds give a slider, one or none gives a numeric field, an `enum` gives a segmented control. **Total**, so a registered type needs no editor code.                                                | `09` §7.1, **E9**           |
| **Soft track**             | A slider track that **extends to contain any typed value and never clamps one**. `scaleX`/`scaleY` get `[−2, 2]` and `scale` gets `[0, 4]`, UI constants with no authority anywhere. Clamping typed input would be `06` §9.2's coercion in the one place the author is watching.                            | `09` §7.5                   |
| **Authoring range**        | The finite track drawn for an attribute whose domain is open. Distinct from **domain** (§7.2), which is the attribute's permanent capacity.                                                                                                                                        | `09` §7.5                   |
| **Palette bar**            | The palette presented as a **single contiguous bar segmented by weight**, not a list of rows — because under a banded Source, threshold adjacency is spatial adjacency (**O6**). A zero-weight entry is a zero-width marker, never invisible.                                      | `09` §7.6                   |
| **Design width**           | The **numeric** control writing `referenceWidth`. Destructive: it re-derives `columns`, along with `cellSize` and `horizontalAlignment`. Confirmed only where a coordinate-bound Selection exists.                                                                                 | `09` §9.3, **E12**          |
| **Preview width**          | The **draggable** control. Sets `Wpx` on the render box and **writes no field**. Not destructive and never confirmed. _The destructive edit must not be the one that is easy to do by accident._                                                                                   | `09` §9.2, **E11**          |
| **Load preview**           | A control drawing a fresh `loadSalt` and passing it to the preview as a prop. Writes nothing, persists nothing. Disabled where no Operation is flagged and `reseedAssetsOnLoad` is false.                                                                                          | `09` §8.5, **E10**          |
| **Asset attach**           | Measuring an asset's intrinsic dimensions and writing `src`, `width`, and `height` together — **or failing**. A `meta` block missing `width` or `height` is never written.                                                                                                         | `09` §10.3, **E13**         |
| **Export folder**          | `tileset.json` beside `tiles/<tileId>/<assetId>.<ext>`. Not flat: the directory structure is the `(tileId, assetId)` pair, for the reason the provider key is. Every `meta.src` is relative to its root.                                                                           | `09` §11.1, **E14**         |
| **The import gate**        | On a non-empty `ValidationError[]` the file is **not opened**. No partial import, no automatic repair. **Every `ValidationError` an author ever sees originates here** — on the one screen with no file and therefore no preview.                                                  | `09` §12.1, §12.4, **E15**  |

**Four affordances vary the picture, and one is unlike the others** — `09` §8.1.

| Control              | Writes               | Scope                                 | Persisted |
| -------------------- | -------------------- | ------------------------------------- | --------- |
| **Seed**             | `config.defaultSeed` | everything                            | ✅        |
| **Operation reroll** | `Operation.salt`     | that Operation's Source and Selection | ✅        |
| **Asset reroll**     | `config.assetSalt`   | which variant each cell shows         | ✅        |
| **Load preview**     | nothing — a prop     | Operations with `reseedOnLoad: true`  | ❌        |

**The nine advisory diagnostics** — four from `06` §10.4, five coined at `09` §12.2. Three of
the first four are unreachable from inside the editor, which is the manufactured-guarantee table
read from the other side.

| #   | Diagnostic                                                                | From       |
| --- | ------------------------------------------------------------------------- | ---------- |
| 1   | `columns` parity does not match `horizontalAlignment`                     | `06` §10.4 |
| 2   | `reseedOnLoad: true` on an Operation whose Source is not stochastic       | `06` §10.4 |
| 3   | A `rect` Selection lying wholly outside the grid                          | `06` §10.4 |
| 4   | `columns × cellSize < referenceWidth`                                     | `06` §10.4 |
| 5   | The document is legal but has nothing to draw                             | `09` §12.2 |
| 6   | Two Tiles share a `name`                                                  | `09` §12.2 |
| 7   | A non-square asset will be centre-cropped                                 | `09` §12.2 |
| 8   | A palette reordered under a `random` Source, where order is meaningless   | `09` §12.2 |
| 9   | A stepped mapping on `rotation` whose range endpoints coincide modulo 360 | `09` §12.2 |

Diagnostic 7 is the **only consumer of `meta.width` and `meta.height` in the package** (`09`
§12.2). Diagnostic 3 is the only one reachable from editing, and only after a design-width
change.

**Orphans are not migrated, and undo is the repair.** Nothing is rewritten when `columns`
re-derives: proportional and absolute readings of a `rect` are both defensible, and choosing
silently is `06` §9.2's coercion applied to the thing the author cares about most. The
confirmation names what is at risk beforehand, an advisory carries it afterwards, and undo
restores the file whole (`09` §9.4, **E6**).

---

## 6. Grid, Layout, and space

| Term                  | Definition                                                                                                                                                                                                                                                                                                                              | Owner                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Cell**              | A grid coordinate `(x, y)`. Has no appearance of its own.                                                                                                                                                                                                                                                                               | `02` §3                                 |
| **Grid**              | The `rows × columns` integer matrix. Engine input. Also used as the container type of engine output, `Grid<TileState>` — see open question 1.                                                                                                                                                                                           | `02` §3, §8                             |
| **Layout**            | The non-engine block of a `TilesetFile`. Design-space measurements plus one authoring field. Never an engine input.                                                                                                                                                                                                                     | `02` §3, §7; `06` §3.3, §8              |
| `rows`                | Integer `≥ 1`. Config member, flat. The only control over grid height.                                                                                                                                                                                                                                                                  | `02` §7, §7.4; `06` §5                  |
| `columns`             | Integer `≥ 1`. Config member, flat. Derived by the editor at authoring time, then **frozen** in the config. Displayed in the editor, never edited there.                                                                                                                                                                                | `02` §7, §7.1, §7.3; `06` §5; `09` §9.1 |
| `cellSize`            | Design px, `> 0`, finite. Layout member. Cells are square, so this is a single number. Constrains the _cell_, not the drawable inside it.                                                                                                                                                                                               | `02` §7; `03` §5.4; `06` §8             |
| `referenceWidth`      | Design px, `> 0`, finite. Layout member. The authoring page width, **stored** because it is not derivable from `columns × cellSize` — a renderer deriving it would make the bleed vanish.                                                                                                                                               | `02` §7, §7.2; `06` §8; `07` §5.1       |
| `yOffset`             | Layout member, required, in `[0, 1)`. Shifts the grid upward by a fraction of one cell height. **Validated, not clamped** — a loader rejects `1.4` rather than quietly reading it as `0.999…`.                                                                                                                                          | `02` §7.4; `06` §8, **C6**              |
| `horizontalAlignment` | `"column" \| "gutter"`. Authoring metadata whose only function is constraining column parity during derivation. Read by neither engine nor renderer.                                                                                                                                                                                    | `02` §7, §7.3; `06` §3.3                |
| **Column alignment**  | `horizontalAlignment: "column"`. Requires odd `columns`; the centre axis falls through a cell.                                                                                                                                                                                                                                          | `02` §7.1                               |
| **Gutter alignment**  | `horizontalAlignment: "gutter"`. Requires even `columns`; the centre axis falls on a cell boundary.                                                                                                                                                                                                                                     | `02` §7.1                               |
| **Design px**         | The unit of the authoring coordinate space. `cellSize` and `referenceWidth` are both expressed in it. The second of three spaces (§6.1).                                                                                                                                                                                                | `02` §7; `07` §5.1                      |
| **Bleed**             | The intentional overflow of grid width beyond `referenceWidth`. Symmetric, because parity correction always rounds **upward**. Present and cut off by the render box, never absent.                                                                                                                                                     | `02` §7.1, §7.2; `07` §7.2              |
| **Parity correction** | Incrementing derived `n` by one when its parity does not match `horizontalAlignment`. Always upward, which is what guarantees `originX ≤ 0`.                                                                                                                                                                                            | `02` §7.1; `07` §5.2                    |
| **Top-anchored**      | The grid's vertical behaviour. There is no vertical counterpart to `horizontalAlignment`.                                                                                                                                                                                                                                               | `02` §7.4                               |
| **Grid-absolute**     | Coordinates expressed against the grid's own origin, never the viewport. Origin `(0, 0)` is the top-left cell; `x` increases rightward, `y` downward.                                                                                                                                                                                   | `02` §5                                 |
| **Clipped cell**      | A cell the renderer will not display. It exists in the grid, is tested by every Selection, and is spanned by every Source that normalizes over the grid.                                                                                                                                                                                | `02` §5, **G2**; `04` §4.2, §5.1        |
| **Destructive edit**  | An editor action that re-derives `columns`, orphaning coordinate-bound Selections (`04` §4.4). **Three fields trigger it** — `referenceWidth`, `cellSize`, `horizontalAlignment` — and it is the numeric **design width** control, not a drag handle (`09` §9.2 withdraws that premise). Warn and confirm; Selections are not migrated. | `02` §7.5; `09` §9.2, §9.3, **E12**     |

### 6.1 Render space

The third space, and everything the renderer computes in it. `07` owns the geometry; `08` owns
the element it lives on.

| Term                      | Definition                                                                                                                                                                                                                                       | Owner                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| **Render space**          | Rendered px, origin at the render box's top-left corner. The third space, alongside grid space (cells) and design px.                                                                                                                            | `07` §5.1                |
| **Render box**            | The rectangle the grid is drawn into. **The only clipping boundary in the system** — a cell never clips its drawable.                                                                                                                            | `07` §5.1, §7.2, **R9**  |
| **Render box element**    | The DOM element the component owns, styled with **no padding and no border**, so `Wpx` is unambiguous. Carries the clip and the positioning context for cells. Host padding or a border on it is unsupported rather than interpreted.            | `08` §6.2, **S9**        |
| `Wpx`                     | The render box's width in rendered px, supplied by the host. **There is no width prop** — it is whatever width the host's CSS gives the element.                                                                                                 | `07` §5.1; `08` §4       |
| **Scale factor**          | `s = Wpx / referenceWidth`. Derived from **width alone**; height never affects it. Written _scale factor_ throughout, never _scale_, which is an attribute (§10.3).                                                                              | `07` §5.1                |
| `originX`, `originY`      | `originX = (Wpx − s·gridWidth) / 2`, negative whenever there is bleed. `originY = −s·yOffset·cellSize`, negative for any non-zero `yOffset`. The grid is horizontally centred and top-anchored, and both clippings are the box's ordinary edges. | `07` §5.2                |
| **Cell box**              | A cell's rect in render space. A function of `Layout`, `rows`, `columns`, and `Wpx` **alone** — it consults no asset and reads no `TileState`.                                                                                                   | `07` §5.2, §5.5, **R5**  |
| **Shared edges**          | Cell boxes are defined by their edges; sizes derive from edges, never edges from sizes. Never independently rounded.                                                                                                                             | `07` §5.6, **R6**        |
| **Drawable box**          | The cell box **at scale 1**. The reference every transform is taken against; its centre is the cell box's centre.                                                                                                                                | `07` §6.1                |
| **Natural ratio**         | `referenceWidth : (rows − yOffset)·cellSize`. The **primary** quantity: the render box declares a ratio and no explicit height, so height follows width with no measurement and no script. Host CSS may override it.                             | `08` §6.1, **S8**        |
| **Natural height**        | `s · (rows − yOffset) · cellSize` — the natural ratio multiplied by `Wpx`. The box that exactly contains the visible grid. A **default, not a constraint**: a host wanting vertical bleed gives the box _less_ height.                           | `07` §5.3, §7.3          |
| **Row-major paint order** | Ascending `y`, then ascending `x` within a row. A cell painted later draws over one painted earlier. **Part of the rendered output, not an implementation choice.** Independent of generation order, which may be anything (`02` §9).            | `07` §7.4, **R10**       |
| **Authoring resize**      | The author changes the design width; `referenceWidth` changes and `columns` is re-derived. A destructive config edit.                                                                                                                            | `07` §9.1; `02` §7.5     |
| **Viewport resize**       | A visitor changes their window; `Wpx` and `s` change. A **pure scale change — no regeneration**, because every ratio is `Wpx`-independent.                                                                                                       | `07` §5.3, §9.1, **R12** |

**`Wpx` cancels out of every ratio.** The whole layout is a set of constants derived from
`Layout`, `rows`, and `columns`, multiplied by one number at the end. This is what buys no
measurement, complete SSR geometry, and no layout shift ever (`07` §5.3).

### 6.2 The coordinate mapping

Public surface in both directions, and **there is one implementation of it** — the renderer and
every overlay use the same functions rather than parallel arithmetic.

| Term                   | Definition                                                                                                                                                                                                                                       | Owner                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| **Coordinate mapping** | The pair below. One implementation; the failure it prevents is a picture that is right while the selection boxes are a few pixels off, with nothing reporting it.                                                                                | `07` §8, **R1**                   |
| `cellBox(x, y)`        | Forward: cell to rect in render space. Exported as a **pure function** of `(layout, rows, columns, Wpx, x, y)`, not a component method.                                                                                                          | `07` §5.2, §8.1; `08` §7, **S10** |
| `cellAt(px, py)`       | Inverse: render-space point to cell. **Total and unbounded** — it may return negative coordinates or coordinates past `rows`/`columns`, because `04` §4.2 permits a `rect` to extend past the grid. Bounding is one comparison at the call site. | `07` §8.2; `09` §7.3              |
| **Half-open**          | A point on a shared edge belongs to the **higher-indexed** cell. `cellAt` of any point within `cellBox(x, y)` returns `(x, y)`. The same discipline as `rect`'s bounds, the weight walk's strict comparison, and `[0, 1)`.                       | `07` §8.3, **R11**                |

**Render space is not client space.** Converting a pointer event into it is the caller's work
and `07` §8.2 names it as the single most likely place to get the coordinate space wrong. The
component exposes its render box element for exactly this; **R5** is untouched, because it
forbids the _renderer_ measuring, not the host (`08` §7).

---

## 7. Tiles, attributes, and cell content

### 7.1 Tiles and assets

| Term                 | Definition                                                                                                                                                                                                                                                                                              | Owner                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Tile**             | A tile family — `{ id, name, assets }`, `assets` of length `≥ 1`. The unit the engine reasons about. A family, not a picture.                                                                                                                                                                           | `03` §3; `06` §6                            |
| `Tile.id`            | Stable, generated, an Identifier, unique within the library. Assigned once at creation; never derived from list position and never from `name`. What `tileId` refers to.                                                                                                                                | `03` §3, **D1**; `06` **C10**               |
| `Tile.name`          | Authoring metadata. **Deliberately unconstrained** — not unique, not charset-limited, possibly empty. Never read during generation. The editor never blocks a rename; it suffixes the id where two collide and raises an advisory.                                                                      | `03` §3, **D1**; `06` §5.3; `09` §10.1      |
| **Tile library**     | The set of Tiles carried by the config, as `config.tiles`. **May be empty** — that is the state of a fresh editor document. A `tileId` is a reference into it.                                                                                                                                          | `03` §3.1; `06` §5                          |
| **TileAsset**        | One concrete drawable within a Tile family — `{ id, weight, meta }`. Carries no sprite data of any kind.                                                                                                                                                                                                | `03` §4, **D2**; `06` §6                    |
| `TileAsset.id`       | Stable, generated, an Identifier, unique **within its Tile**. Global uniqueness is neither required nor forbidden — which is exactly why the provider key and the export path are both the `(tileId, assetId)` pair.                                                                                    | `03` §4; `06` §6; `07` §4.1; `09` §11.1     |
| `TileAsset.meta`     | The renderer-facing metadata block. Opaque to the engine, quarantined so that strictness stays universal (§5.2), additive-only once published (**R4**).                                                                                                                                                 | `03` §4; `06` §6.1, **C4**; `07` §4.5       |
| **Weight**           | A number `≥ 0`, finite, on a TileAsset or a palette entry. **Relative** — normalized by its sum at walk time, never required to sum to `1`. A zero weight lists an entry that can never be chosen; an all-zero sum is a validation error.                                                               | `03` §4.1; `04` §6.3; `06` §6               |
| **Canonical order**  | The ordering rule for a Tile's assets: ascending by `TileAsset.id`, compared as sequences of **UTF-16 code units** — JavaScript's `<`, never `localeCompare` or `Intl.Collator`. The ASCII-only Identifier charset makes this trivially portable, with no surrogate pairs.                              | `03` §4.2, **D3**; `06` §5.3                |
| **Weight walk**      | The cumulative-weight walk: `target = t × total`, accumulate in order, the first entry whose cumulative **strictly exceeds** `target` wins. Total, because `t < 1`. Used for a Tile's assets in canonical order and for palette entries in authored order. **Renamed this pass** — see open question 7. | `03` §4.3; `04` §6.3; `05` §6.2             |
| **Palette walk**     | The weight walk over palette entries specifically. `05` §6.2's term, kept as the species of the genus above; there is no "palette" in the asset case.                                                                                                                                                   | `05` §6.2                                   |
| **Weight stability** | Thresholds derive from _all_ weights collectively, so editing one weight moves the boundaries under every cell of that Tile. Expected behaviour, not a defect.                                                                                                                                          | `02` §10.1; `03` §4.3                       |
| **Drawable**         | Whatever a renderer can actually paint. The engine never touches one. Concretely `{ src: string }` — see §7.4.                                                                                                                                                                                          | `02` §8.2, **G5**; `03` **D2**; `08` **S5** |

### 7.2 Attributes

| Term                     | Definition                                                                                                                                                                                                                                         | Owner                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Attribute**            | A named numeric field on `TileState`, interpreted by Targets rather than by Sources. The set is **closed at V1** and cannot be extended at runtime — an attribute is shared vocabulary between engine and renderer, not an engine extension point. | `03` §5, **D7**; `05` §4.1     |
| **Domain**               | The set of values an attribute can hold, in units natural to it. Its permanent **capacity**, as distinct from the **range** an individual Operation maps onto and from the **authoring range** the editor draws (§5.4).                            | `03` §5.1, **D4**              |
| **Attribute default**    | The value a fresh `TileState` initializes to, before any Operation runs. Belongs to the attribute, never to a Tile. One of four senses of the word — qualify it, per §11.5.                                                                        | `03` §5.1, **D8**              |
| **Bounding**             | `clamp \| wrap \| none`. Applied **immediately after every write**, not once at emit, so the accumulated value is in-domain at every point in the stack. Per-write `clamp` is lossy; accepted, not a defect.                                       | `03` §5.2, **D5**              |
| **Non-finite rejection** | A Blend producing `NaN`, `Infinity`, or `-Infinity` is discarded and the previous value stands — `Grid<TileState>` must round-trip through JSON. Guards _computed_ values; `06` §10 guards authored ones.                                          | `03` §5.3, **D6**              |
| `scale`                  | Any finite number. Default `1`. Bounding `none`. **Uniform**, and composes with the two axes rather than replacing them — `S(scaleX · scale, scaleY · scale)`. Added by ADR-005 because **G3** keys randomness to `operationId`, so two Operations cannot deliver one number to both axes.                                                | ADR-005; `03` §5.4; `07` §10.1 |
| `scaleX`, `scaleY`       | Any finite number. Default `1`. Bounding `none`. Two axes rather than one, because a single `scale` cannot express a flip; a negative value mirrors about the centre.                                                                              | `03` §5.4, §6.3                |
| `rotation`               | Degrees. Default `0`. Bounding `wrap` over `[0, 360)`. **Positive is clockwise** (§7.5).                                                                                                                                                           | `03` §5.4; `07` §6.2           |
| `opacity`                | `[0, 1]`. Default `1`. Bounding `clamp`. Defaults to `1` so that painting a Tile makes it visible without a second Operation.                                                                                                                      | `03` §5.4                      |
| **Transform order**      | Scale applied **before** rotation, both about the drawable's centre. Pinned because non-uniform scale does not commute with rotation. `opacity` is order-independent. Generalized as a composition ordinal at §7.5.                                | `03` §6.3, **D11**; `07` §10.1 |

### 7.3 TileState

| Term            | Definition                                                                                                                                                                                                                                            | Owner                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **TileState**   | The resolved state occupying a Cell: `{ tileId, assetId, scale, scaleX, scaleY, rotation, opacity }`. Plain serializable data — no DOM nodes, canvas contexts, asset references, or functions. `meta` is not carried in it.                                  | `02` §8; `03` §6; `06` §6.1           |
| `tileId`        | `string \| null`. A reference into the tile library. A Target, accepting `set` only — so the editor shows **no blend control at all** for it.                                                                                                         | `03` §6; `04` §7.2; `09` §7.7         |
| `assetId`       | `string \| null`. Written **only** by the resolution step of `02` §9. No Operation can target it.                                                                                                                                                     | `03` §6.1, **D9**; `04` §7.3          |
| **Empty cell**  | A cell with `tileId: null`. Nothing renders, no asset is resolved, `assetId` stays `null`; other attributes are retained but inert. Every cell initializes to this state, so an empty config generates a legal grid that renders nothing.             | `02` §8.1, **G4**; `03` §6.4; `06` §5 |
| **Inert state** | Either of the two states producing no visible output. They are **not the same**: `tileId: null` resolves no asset and has nothing to raise, whereas `opacity: 0` holds a real Tile with a populated `assetId` and can be raised by a later Operation. | `03` §6.4                             |
| **Layering**    | Absent within a cell — a `TileState` holds at most one `tileId`, permanently. Stacking is compositing of N grids in the renderer, which works because a `tileId: null` cell renders nothing.                                                          | `03` §6.2, **D10**                    |

### 7.4 Asset resolution

The renderer's half of `02` **G5**. The engine emits identifiers; everything below happens after
generation and never revises geometry.

| Term                        | Definition                                                                                                                                                                                                                                       | Owner                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| **`AssetProvider`**         | `(ref: AssetRef) -> Drawable \| Promise<Drawable>`. Supplied by the host alongside the file. **Pure per render session**: the same `AssetRef` resolves to the same `Drawable` for the session's duration.                                        | `07` §4.1, §4.2, **R2**        |
| **`AssetRef`**              | `{ tileId, assetId, meta }`. **The key is the pair**, never `assetId` alone — `TileAsset.id` is unique within its Tile only, so a provider keyed on it resolves one Tile's `a1` to another's drawable, correctly and silently, forever.          | `07` §4.1                      |
| **`Drawable`**              | `{ src: string }`, drawn as an `<img>`. A raster file and an SVG file are the same thing to the renderer: **a sealed picture at a URL**, not stylable from the host page. An object rather than a bare string so DPR keys can arrive additively. | `08` §4.2, **S5**              |
| **Default provider**        | `(ref) => ({ src: ref.meta.src })`. Renames one field; fetches, measures, and caches nothing. **Throws** on an absent or non-string `src` rather than passing `undefined` to the substrate.                                                      | `08` §4.3                      |
| `meta.src`                  | String, written by the editor at attach time, read by the default provider. **Relative** to the export folder's root; resolution is the host's.                                                                                                  | `07` §4.4; `09` §11.2, **E14** |
| `meta.width`, `meta.height` | Design px, measured once at attach and **frozen**; the renderer never measures. Written for a future that does not exist yet, on **C3**'s reasoning. Their one present consumer is advisory diagnostic 7.                                        | `07` §4.4; `09` §10.3, §12.2   |
| **Resolution failure**      | The provider throws or rejects — a missing `meta.src`, a custom provider's lookup miss.                                                                                                                                                          | `08` §4.4, **S6**              |
| **Load failure**            | The `<img>` errors — a 404, a network fault, a corrupt file. **The commonest failure in this substrate**, and one the provider never learns of.                                                                                                  | `08` §4.4, **S6**              |
| `onAssetError`              | `(ref: AssetRef, cause: unknown) => void`. **One channel for both failures.** A provider knows when it threw and cannot know about the other half, so a single prop covers both and gives **R3** an enforcement point.                           | `08` §4.4, **S6**              |

**Failure never substitutes.** Not a placeholder, not a default tile, not another TileAsset from
the same Tile, and not the browser's broken-image glyph. The cell draws nothing and the failure
is reported. Falling back to a sibling asset is the worst option precisely because it keeps the
picture plausible while silently reweighting the distribution **D3** exists to make deterministic
(`07` §4.3, **R3**).

**There is no `null` return.** A `null` drawable would be a third way to express emptiness
alongside `tileId: null` and `opacity: 0`, and the three would have to be told apart by whoever
draws them (`07` §4.3).

**Accepted, not a defect:** a production build renders a hole where an asset failed, and whether
anyone hears about it depends on the host wiring the channel. The alternative — failing the whole
render over one missing tile — is plainly worse (`07` §4.3; `08` §4.4).

### 7.5 Applying an attribute

_(descriptive-label section: `07` §10 names the contract, and the terms below are its parts.)_

| Term                        | Definition                                                                                                                                                                                                                                                                                                                                  | Owner                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Applier**                 | The table entry that turns one named attribute into drawing. The draw path dispatches **on the attribute's name**, not on four hardcoded fields. An attribute with no applier is a load failure, never a silent no-op.                                                                                                                      | `07` §10, §10.2, **R13** |
| **Facet**                   | Which part of drawing an attribute contributes to: `transform` or `compositing`.                                                                                                                                                                                                                                                            | `07` §10.1               |
| **Composition order**       | A transform contributor's ordinal. `scale`/`scaleX`/`scaleY` are `1` and share it because they are one matrix — a uniform factor commutes with the axis factors; `rotation` is `2`. **D11** generalized, so a future contributor arrives with a declared position.                                                                                                                                    | `07` §10.1               |
| **The transform six-tuple** | `[a b c d e f]` from `M = T(cx, cy) · R(θ) · S(scaleX · scale, scaleY · scale) · T(−cx, −cy)`, taken about the drawable box's centre.                                                                                                                                                                                                                       | `07` §6.2                |
| **Clockwise-positive**      | Positive `rotation` turns clockwise, because `y` increases downward. Pinned because nothing upstream states it and `05` §4.2's veto argument silently assumes a direction.                                                                                                                                                                  | `07` §6.2                |
| **Centre-crop**             | How a non-square asset is fitted to the drawable box — **before any transform**. Declarative on every substrate (`object-fit: cover`, `preserveAspectRatio="xMidYMid slice"`), so no measurement is needed.                                                                                                                                 | `07` §6.4, **R8**        |
| **Scale 1**                 | A drawable at `scaleX = 1, scaleY = 1, rotation = 0` occupies **exactly its cell box**; a circle inscribed in the asset is tangent to the cell's edges. This does not contradict `cellSize` constraining the cell rather than the drawable — one statement is about what the attribute may hold, the other about what the number `1` means. | `07` §6.1, **R7**        |

**Crop before transform is the load-bearing half.** Fitting the asset into an already-scaled box
would make `scaleX: 2` on a wide asset reveal more of the asset rather than making it twice as
wide — scale would no longer mean scale (`07` §6.4).

**A CSS transform list applies right to left.** `transform: translate(…) rotate(…) scale(…)` is
the order **D11** requires; putting the translation last inverts it and produces a picture that
looks deliberate (`07` §6.3; `08` §6.3).

---

## 8. Operations

`02` fixed these names and their roles in the evaluation model; `04` owns the semantics, `05`
owns how the list grows, and `06` owns their encoding.

### 8.1 The Operation

| Term                         | Definition                                                                                                                                                                                                                                                  | Owner                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Operation**                | `{ id, salt, reseedOnLoad, selection, source, target, mapping, blend }`. Reads as a sentence: _for the cells in `selection`, take a number from `source`, interpret it through `mapping`, and combine it into `target` with `blend`._                       | `04` §3; `06` §7                            |
| `operationId`                | A **stable generated identifier**, an Identifier, **unique within the stack**. Assigned at creation and never derived from stack position, including through duplication. Namespaces the Operation's two hash channels. Written `id` as a field; see §11.3. | `02` §6.3; `04` §3; `06` **C10**; `09` §4.3 |
| `salt`                       | `uint32`, default `0`. An **authoring value**: frozen in the file, incremented by the editor's reroll button, never written to at runtime. Incremented by one and wrapped at `2³²`, never by a fraction.                                                    | `02` §6.4; `04` §3; `06` §5.2; `09` §8.3    |
| **Operation stack**          | The ordered list of Operations, as `config.operations`. **Order is semantically significant and never canonicalized.** May be empty. Reordering changes composition only, never an Operation's own randomness.                                              | `02` §6.3, **G3**; `06` §7                  |
| **Evaluation model**         | Per cell: initialize to defaults, apply each Operation in stack order, resolve `assetId`, emit. Cells may be evaluated in any order or in parallel — and generation order is **not** paint order (**R10**).                                                 | `02` §9; `07` §7.4                          |
| **Operation evaluation**     | _(descriptive label)_ The five steps of one Operation against one cell: **a** test the Selection, **b** evaluate the Source to `t`, **b′** map `t` to `v`, **c** blend `v` onto the previous value, **d** reject if non-finite, then bound.                 | `04` §3.1                                   |
| **One Source per Operation** | An Operation has exactly one of each part. Combining two Sources means writing two Operations.                                                                                                                                                              | `04` §3.2                                   |

**Invariant O1** guarantees a Blend never sees a raw `[0, 1)` value and a Target never receives
an unmapped one.

### 8.2 Selection

| Term                           | Definition                                                                                                                                                                                                                                                 | Owner                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **Selection**                  | The test `(x, y) -> boolean` determining whether a cell is affected. Pure and positional; it never reads the accumulated `TileState`. Declares nothing beyond §8.7's baseline. **The word belongs to this mechanism alone** — see §7.1 on the weight walk. | `04` §4, **O2**; `05` §7      |
| **Procedural Selection**       | Defined by rule — `all`, `checkerboard`, `everyNth`, `random`. Survives a resize unharmed, so a config holding only these has nothing to confirm on a design-width change.                                                                                 | `04` §4.4; `09` §9.3          |
| **Coordinate-bound Selection** | Defined by specific coordinates — `rect`, `cellList`. Orphaned by a resize, and not migrated.                                                                                                                                                              | `04` §4.4; `09` §9.4          |
| **Manual Selection**           | The editor-facing term for `cellList` specifically — one the author painted cell by cell. A **subset** of coordinate-bound, not a synonym: a `rect` is coordinate-bound without being manual, and the brush bounds where the `rect` drag does not.         | `04` §4.4; `09` §7.3          |
| **Selection composition**      | `and`, `or`, `not` as ordinary registered types. The recursive shape `{ type, ...params }` ships in V1, so no schema change is needed later — but their parameters are Selections, which `ParamSpec` cannot yet express. `[EXTENSION POINT]`               | `04` §4.5; `05` §7; `06` §7.4 |

**V1 Selection presets** — `04` §4.2.

| Preset         | Parameters                                                                               |
| -------------- | ---------------------------------------------------------------------------------------- |
| `all`          | —                                                                                        |
| `rect`         | `x, y, width, height` — may extend beyond the grid; outside cells simply never test true |
| `checkerboard` | `parity: 0 \| 1`                                                                         |
| `everyNth`     | `axis: "column" \| "row"`, `n ≥ 1`, `offset = 0`                                         |
| `random`       | `density: [0, 1]`, drawn from the selection channel                                      |
| `cellList`     | `cells: [[x, y], ...]`                                                                   |

**On `mod`.** `everyNth` tests a **zero** residue, where JavaScript's `%` and a true modulo
agree for every integer, so `offset` needs no lower bound. `checkerboard` tests a **non-zero**
residue and is safe only because `cx + cy ≥ 0`. Any future Selection testing a non-zero residue
over a possibly-negative operand must use a true modulo (`04` §4.2; `06` Q11).

### 8.3 Source

| Term                            | Definition                                                                                                                                                                                                                                                                     | Owner                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **Source**                      | A pure, stateless, total function `(x, y, ctx) -> number in [0, 1)`.                                                                                                                                                                                                           | `02` §6; `04` §5                              |
| `ctx`                           | **Closed** at `{ rows, columns, effectiveSeed, operationId, salt }`. A Source receives nothing else — `ctx` is the doorway a pixel measurement would enter through, so it stays narrow.                                                                                        | `04` §5.1, **O4**                             |
| `effectiveSeed`                 | A `uint32`: the seed the Operation is actually supposed to hash against, Stage-1 hashed and load-mixed where `reseedOnLoad` is set. **Not the seed string.** A Source handed the raw seed would silently ignore its own Operation's flag.                                      | `04` §5.1; `02` §6.7                          |
| **Stochastic**                  | A Source whose output depends on the hash. Declared, not derived (§8.7). The property that makes `reseedOnLoad` meaningful — and the one the editor reads to decide whether to offer the flag at all.                                                                          | `04` §5.2, §8.4; `05` §6.1, **X5**; `09` §8.4 |
| **Spanning Source**             | _(descriptive label)_ One that normalizes across `rows × columns` — `gradient`, `vignette`. It spans the **whole** grid including clipped cells; a gradient normalized over the visible region only would drift its midpoint off centre by exactly the bleed.                  | `04` §5.1; **G2**                             |
| **Per-octave salt**             | _(descriptive label)_ `oSalt = salt XOR imul(o + 1, 0x9E3779B1)`, so octave 1 at a lattice point is not the same number as octave 0 there, and an author's `salt++` cannot collide with an octave offset. The `XOR` coerces to `int32`, which is why `06` §5.2 narrows `salt`. | `04` §5.2                                     |
| **smoothstep**                  | `s(a) = a·a·(3 − 2a)`, applied to the fractional lattice coordinates before bilinear interpolation in `valueNoise`.                                                                                                                                                            | `04` §5.2                                     |
| **lacunarity**, **persistence** | Fixed at `2` and `0.5` in V1, not exposed. Every exposed parameter is one more thing a conformant implementation must reproduce exactly. `[EXTENSION POINT]`                                                                                                                   | `04` §5.2                                     |

**V1 Source presets** — `04` §5.2.

| Source       | Parameters                                     | Stochastic | Note                                                                                                        |
| ------------ | ---------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `constant`   | —                                              | no         | Emits `0`, always. A fixed value is `min == max` on the mapping, not a `value` parameter.                   |
| `random`     | —                                              | yes        | `hash(effectiveSeed, operationId, x, y, salt)` directly; each cell independent.                             |
| `valueNoise` | `cellsPerFeature > 0`, `octaves` integer `1–3` | yes        | Spatially correlated. Degenerates to `random` at `cellsPerFeature = 1`; both are kept.                      |
| `gradient`   | `angle` in degrees                             | no         | `0` sweeps left to right, `90` top to bottom, because `y` increases downward.                               |
| `vignette`   | —                                              | no         | Normalized elliptical distance from the grid centre: `0` at centre, approaching `1` at the farthest corner. |

Reversal of any Source is a mapping with `min > max`, never a flag (`04` §5.2, §6.2).

**On floating point.** `02` §6.6's integer-only discipline governs **the hash**, not the Source.
IEEE 754 makes `+`, `−`, `×`, `÷`, and `sqrt` exactly reproducible; it does **not** make `cos`,
`sin`, `pow`, or `exp` reproducible, which is `05` open question 3, touches `gradient` only, and
is `roadmap` §7.1 A1's correctness obligation before `1.0.0`.

### 8.4 Mapping

| Term               | Definition                                                                                                                                                                                                                                                             | Owner                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Mapping**        | What gives a Source's bare number units. A property of the **Operation**, never of the attribute, so two Operations writing the same attribute may map differently. **One config slot, two shapes, no kind tag** — the kind is determined by the Operation's `target`. | `04` §6, **O5**; `06` §7.3, **C8** |
| `range`            | `[min, max]`, two finite numbers — the window within a Target's domain that this Operation uses. `min > max` is legal and reverses the map, so the editor's two handles **cross rather than clamp**.                                                                   | `04` §6.2; `06` §7.3; `09` §7.4    |
| `steps`            | Optional integer `≥ 2`. Its **absence is a meaning** — continuous, not stepped — rather than a default value. Stepped mapping attains `max`; continuous mapping never does, because `t < 1` strictly. The one field the editor omits rather than writing explicitly.   | `04` §6.2; `06` §5.1; `09` §11.3   |
| **Palette**        | The tile mapping: an ordered list of `{ tileId, weight }` entries, at least one, weights summing `> 0`. `tileId: null` is legal and means _clear this cell_ — the one place in the file where `null` is a value rather than an error.                                  | `04` §6.3; `06` §7.3               |
| **Authored order** | The palette's ordering rule, deliberately **opposite** to canonical order: under a banded Source, threshold adjacency is spatial adjacency, so order is the only way the author says water sits next to sand. Not canonicalized.                                       | `04` §6.4, **O6**                  |

**A gotcha on wrapping domains.** A range on a wrapping domain must exclude the duplicate
endpoint — quarter turns are `[0, 270]` with `steps: 4`, not `[0, 360]` (`04` §6.2). The editor
carries this as advisory diagnostic 9.

**Why no kind tag.** A `kind: "numeric"` field is a second source of truth that can only agree
with `target` or disagree with it, and on disagreement validation must name a winner. A numeric
mapping carrying `palette` is reported as an unknown key and a missing key, which between them
say precisely what is wrong (`06` §7.3).

### 8.5 Blend and Target

| Term                         | Definition                                                                                                                                                                                                                   | Owner                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Blend**                    | The rule combining a mapped value with the Target's current value. A pure binary function of `(mappedValue, previousValue)`; its result passes through **D6** then **D5**.                                                   | `04` §7.1; `05` §8                |
| `set`, `add`, `multiply`     | The V1 Blends. `subtract` and `divide` are absent because a signed or reciprocal range expresses both.                                                                                                                       | `04` §7.1                         |
| **`blend` is a bare string** | `"add"`, not `{ type: "add" }`. No V1 Blend takes parameters, and a Blend's declarations live in the registry, never in a file. Promoting it later is one `schemaVersion` bump and one migration.                            | `06` §7.2; `05` §8                |
| **Target**                   | The component of `TileState` an Operation writes to. Targets interpret attributes; Sources do not. The set is **closed** (§8.7).                                                                                             | `02` §8, §9; `04` §7.2; `05` §4.2 |
| **Target type**              | `numeric` or `tile`. It determines the mapping kind and the accepted Blend set. Not to be confused with a _registered_ type — qualify it, per §11.5.                                                                         | `04` §7.2; `06` §7.3              |
| **Partial Blends**           | A Blend declares the Target types it accepts; a Target declares its type, its default Blend, and any Blends it vetoes. A Target's accepted set is every Blend accepting its type, less its vetoes. Blends are **not** total. | `04` §7.2, **O7**; `05` **X2**    |
| **Veto**                     | The place a Target withholds a Blend that is arithmetically defined but has no authoring meaning. `rotation` vetoes `multiply`. Adding a Blend obliges reviewing every veto list.                                            | `04` §7.2; `05` §4.2, **X2**      |

| Blend      | Accepts       |
| ---------- | ------------- |
| `set`      | numeric, tile |
| `add`      | numeric       |
| `multiply` | numeric       |

| Target             | Type    | Default Blend | Vetoes     | Accepted                 |
| ------------------ | ------- | ------------- | ---------- | ------------------------ |
| `tileId`           | tile    | `set`         | —          | `set`                    |
| `scale`, `scaleX`, `scaleY` | numeric | `set` | —          | `set`, `add`, `multiply` |
| `rotation`         | numeric | `set`         | `multiply` | `set`, `add`             |
| `opacity`          | numeric | `set`         | —          | `set`, `add`, `multiply` |

The inversion of **O7** is recorded in `/adr/001-blend-declaration-inversion.md`. The V1 table
is unchanged by it; every row derives to the value it was previously asserted to have. The
editor computes the accepted set from the registry and never from a copy of this table
(`09` §7.7).

### 8.6 Reseeding

| Term                    | Definition                                                                                                                                                                                                                                                                                  | Owner                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `reseedOnLoad`          | A per-Operation boolean, default `false`. **An engine input.** It selects which seed the Operation hashes against: the run's seed when false, the seed mixed with `loadSalt` when true.                                                                                                     | `04` §8, **O8**; `02` §6.7    |
| `reseedAssetsOnLoad`    | The config-level counterpart for the asset channel, re-rolling which variant each cell shows without disturbing any Operation. Reads the same `loadSalt`.                                                                                                                                   | `04` §8.2; `02` §6.7          |
| **Drawn once and held** | _(descriptive label)_ `loadSalt` is drawn once per render session and held throughout. Re-drawing per cell is white noise and destroys the spatial structure of every Source that has any; re-drawing per `generate()` would reshuffle every flagged Operation on an unrelated config edit. | `04` §8.3; `07` §9.3, **R12** |

For `reseedOnLoad` to mean anything the **seed must be held fixed**: the seed is in every hash
key, so a fresh seed per load moves frozen Operations too (`04` §8.2, `02` §4.1).

**Flagged channels move together** — one draw re-rolls all of them — but their values stay
uncorrelated, because the channels are namespaced by `operationId` (**O3**). Moving together is
the intended reading of the flag.

**Reproduction is two values.** `(seed, loadSalt)` reproduces any render exactly, flags and all.
Nothing is derived along the way and no config is rewritten.

**What was withdrawn.** The pre-ADR-002 model had the caller overwrite each flagged Operation's
`salt` before invoking `generate()`, and carried an `[EXTENSION POINT]` for _the renderer emits
the derived config it actually used_. There is no derived config; the extension point is
**withdrawn**, and `roadmap` §6 carries the row that records it (`04` §8.3; ADR-002).

### 8.7 Registration

`05` owns how the list of Selections, Sources, and Blends grows.

| Term                       | Definition                                                                                                                                                                                                                                                                                                                                                                        | Owner                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **One engine**             | The operating assumption: one implementation, in this repository, published as a package, consumed by pinning a version. No public registration API, no third-party author, no second language port.                                                                                                                                                                              | `05` §3                     |
| **Registration**           | `{ kind, name, params, impl, ...kind-specific }`, plus an optional `editor` block. An entry in a table, keyed by the name a config uses. Not a function signature exposed to strangers.                                                                                                                                                                                           | `05` §5; `09` §7.2          |
| `kind`                     | `"selection" \| "source" \| "blend"`.                                                                                                                                                                                                                                                                                                                                             | `05` §5                     |
| `name`                     | What appears in a config. Unique **within a kind**, not globally — which is why `random` can be both a Selection and a Source. Registering into an occupied name is an error, never a silent overwrite.                                                                                                                                                                           | `05` §5, **X4**             |
| `impl`                     | The semantics.                                                                                                                                                                                                                                                                                                                                                                    | `05` §5                     |
| **`ParamSchema`**          | `{ [name]: ParamSpec }`. **Data, not code** — three consumers read it and only one runs it, and a function can be called but not walked. **Not a wire format**: it never appears in a `TilesetFile`, lives beside `impl`, and is versioned with the package.                                                                                                                      | `05` §5.1; `06` §7.4        |
| **`ParamSpec`**            | Four forms: `number` (with `min`/`max`/`exclusiveMin`/`exclusiveMax`/`default`), `integer`, `enum` (with `values`), and `cellList`. Covers every V1 parameter; nothing needs a nested or conditional schema. The editor's affordance mapping over it is **total** (**E9**).                                                                                                       | `06` §7.4; `09` §7.1        |
| **`editor` block**         | Optional on a Registration: `label`, `description`, and a `control` affordance hint. **Package-internal** — never in a file, never read by the engine, costing no bump of any kind. An unrecognized `control` falls back to the mechanical mapping: **the one place in the package where an unknown name is not an error**, because it names an affordance rather than semantics. | `09` §7.2                   |
| `stochastic`               | A boolean a Source declares. **Declared, not derived** — deriving it means inspecting whether `impl` calls `hash()`, a static-analysis question with a wrong answer available in both directions.                                                                                                                                                                                 | `05` §6.1, **X5**           |
| `accepts`                  | `("numeric" \| "tile")[]`, declared by a Blend. The registry side of the inverted **O7**.                                                                                                                                                                                                                                                                                         | `05` §8                     |
| **Totality**               | A Source returns a finite number in `[0, 1)` for every input its schema admits. `1.0` is not legal — the weight walk and the stepped mapping both prove their own termination from `t < 1` strictly.                                                                                                                                                                              | `05` §6.2, **X6**           |
| **Asserted, not enforced** | _(descriptive label)_ Totality is checked by development-build assertions and by tests, not by a per-cell clamp in production. The one place the single-engine assumption changes a decision rather than only its justification.                                                                                                                                                  | `05` §6.3                   |
| **Extensible**             | Selections, Sources, Blends.                                                                                                                                                                                                                                                                                                                                                      | `05` §4, **X1**             |
| **Closed**                 | Attributes, Targets, hash channels, mapping kinds. Each closure has its own reason: attributes need a renderer that knows how to apply them; Targets follow attributes; a fourth channel would collide in a shared namespace; a third mapping kind needs a third Target type.                                                                                                     | `05` §4, §4.1–§4.4, **X1**  |
| **Unknown type name**      | A config naming a type the engine does not have is a **load failure**. The engine never substitutes a default and never skips the Operation — a fallback renders a plausible-looking wrong picture with no error anywhere. Surfaces as `UNKNOWN_TYPE_NAME`.                                                                                                                       | `05` §9, **X7**; `06` §10.3 |
| **Retired name**           | A published type name is never reassigned to different semantics. Retiring is removal; the name is not recycled. `01` §11.4's tombstone discipline applied to type names.                                                                                                                                                                                                         | `05` §9.2, **X8**           |

**What the V1 presets require of `ParamSchema`**, as `05` §5.1's completeness check: `density`
as a bounded number, `parity` and `axis` as enums, `n` / `octaves` / `offset` as integers,
`cellsPerFeature` as `{ exclusiveMin: 0 }`, `angle` as an unbounded number, `rect`'s four
unbounded integers, and `cells` as the one list type. `cellList` is the single exception to
**E9**'s totality: it is painted on the preview rather than generated (`09` §7.3).

**Known gap.** Selection composition needs a Selection-valued parameter type, which the four
`ParamSpec` forms do not express. Nothing in V1 requires it; carried forward unsolved
(`05` §7; `06` §7.4, §12).

---

## 9. Determinism and randomness

| Term                   | Definition                                                                                                                                                                                                                                                                      | Owner                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Positional hashing** | Randomness addressed by position rather than drawn from a sequential stream: `value = hash(effectiveSeed, channel, x, y, salt) -> [0, 1)`.                                                                                                                                      | `02` §6                                         |
| **Hash channel**       | A namespace within the hash keyspace, so unrelated decisions never collide. **Three exist, and the set is closed** — see below.                                                                                                                                                 | `02` §6.3; `04` §4.3, **O3**; `05` §4.3, **X3** |
| `salt`                 | A `uint32` on each Operation, default `0`, included in both of its hash keys. Incrementing it re-rolls that Operation's randomness and nothing else. An authoring value, frozen in the file.                                                                                    | `02` §6.4                                       |
| `assetSalt`            | A `uint32` on the config, included in the asset-selection hash key. Re-rolls variant distribution without disturbing any Operation. Also frozen.                                                                                                                                | `02` §6.4                                       |
| `loadSalt`             | An engine argument, not a config field. The runtime counterpart to the two frozen salts. See §5.                                                                                                                                                                                | `02` §4.1, §6.7                                 |
| **Effective seed**     | What each channel actually hashes against: `seedU32` when the relevant flag is false, `mixLoad(seedU32, loadSalt)` when true. Resolved once, **outside** the Source, so the flag works whether or not a Source's author considered it.                                          | `02` §6.7; `04` §5.1                            |
| `mixLoad`              | A single multiply-xor-shift round combining two `uint32` values into one. Specified at the constraint level in the manner of §6.6, and adds **no key component to Stage 2**, whose shape is untouched. `mixLoad(s, 0) ≠ s`, deliberately — nothing about `0` is an identity.    | `02` §6.7; `08` §4.1                            |
| **Reroll**             | Changing a salt. Two author-facing affordances exist — **per-operation** and **global asset distribution**. Neither is the same as changing the seed, which moves everything, nor as `loadSalt`, which is not authored at all.                                                  | `02` §6.4; `09` §8.1                            |
| **Stage 1**            | Hashing of a string to `uint32`: a short avalanche hash over char codes. Applied to the seed, and to channel strings to yield `channelU32`.                                                                                                                                     | `02` §6.6                                       |
| **Stage 2**            | Positional mixing of `(effectiveSeed, channelU32, x, y, salt)` into a `uint32`, followed by a final avalanche. The top bits divided by `2³²` give the returned `[0, 1)` value — whose largest possible result is `4294967295 / 4294967296`, which is why **X6** is satisfiable. | `02` §6.6                                       |
| **Portability rules**  | All intermediate state is `uint32`, every step ending `>>> 0`; multiplication uses `Math.imul`, never `*`; no floating point except the single final division. These are the specification, more than the choice of function.                                                   | `02` §6.6                                       |
| **Test vector**        | A `(seed, channel, x, y, salt) → expected uint32` row shipping with the spec. `mixLoad` ships rows of its own. Part of the deliverable, and also a regression test (§9.1).                                                                                                      | `02` §6.6, §6.7; `05` §11                       |
| **Memorable seed**     | An editor-generated seed in word-word-number form, offered beside the seed field. Seeds exist to be written down and returned to; random hex defeats that.                                                                                                                      | `02` §6.6; `09` §8.2                            |

**The three channels.**

| Channel             | Key                                                              | Rerolled by                                  |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| Operation source    | `hash(effective(op), operationId, x, y, op.salt)`                | that Operation's salt; `loadSalt` if flagged |
| Operation selection | `hash(effective(op), operationId + ":selection", x, y, op.salt)` | that Operation's salt; `loadSalt` if flagged |
| Asset selection     | `hash(effective(assets), "asset", x, y, config.assetSalt)`       | the asset salt; `loadSalt` if flagged        |

Both Operation channels take the same `salt` and the same effective seed, so one reroll moves an
Operation's `random` Selection and its Source together. Channel strings are ordinary strings run
through Stage 1, so no registry of magic numbers exists.

**The set is closed at three.** A Source needing several independent numbers per cell varies its
**salt**, never the channel string — channel strings share one namespace and a future Source
reaching for a natural-sounding name could silently collide with the selection channel, and a
Source deriving extra draws from `salt` is rerolled correctly for free (`05` §4.3, **X3**).

**Drawing a `loadSalt`.** `Math.floor(Math.random() * 2**32)`, never `| 0` — the latter coerces
to `int32` and yields a negative number for half of all draws, a value **C9** would reject if it
ever reached a field, and it never does, so nothing catches it (`07` §9.3; `09` §8.5).

### 9.1 Output stability

Determinism across **time** rather than across machines. `05` §3.1 makes the case: a background
authored in March renders on a live site in September, and a config outlives the build that
wrote it.

| Term                        | Definition                                                                                                                                                                                                                                                 | Owner                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Output-breaking change**  | Any change to the generated output for an unchanged `(config, seed, loadSalt)` triple. A breaking change **whether or not any interface moved**.                                                                                                           | `05` §3.1, **X0**         |
| **Package version**         | Increments when generated output changes. Semver, and consumers pin. After `1.0.0`, an output change is a **major** bump — including a bug fix, which is the trap, because a consumer on `^1.4.0` picks patches up automatically.                          | `05` §10.1, §10.2, **X9** |
| **The two version numbers** | `schemaVersion` versions the file's shape; the package version versions the output. Conflating them is a real hazard: a file can be shape-perfect and render a different picture than it did last year. _"It loaded fine"_ is evidence of nothing.         | `05` §10.1; `06` §4.2     |
| **`1.0.0`**                 | A **decision**, not a milestone that arrives on its own: the moment the output freeze begins. Before it, `0.x` promises nothing and any release may change output freely.                                                                                  | `05` §10.3, Q2            |
| **Reference config**        | A config snapshotted against a `(config, seed, loadSalt)` triple. Between them they exercise every registered type, both mapping kinds, every Blend, both bounding behaviours, and at least one clipped-cell case. A new registered type arrives with one. | `05` §11, **X10**         |
| **Regression vector**       | _(descriptive label)_ The reading `05` §11 adds to `02` §6.6's test vectors: an unexpected diff on a patch or minor release means output changed without anyone intending it, caught before publish.                                                       | `05` §11                  |

**Hash vectors are not sufficient.** They cover `02` §6.6 and nothing above it. `valueNoise`'s
smoothstep, `gradient`'s corner projection, the weight walk's comparison, bounding applied at
emit rather than per write, and transform order would all pass an unchanged hash table while
changing every rendered background (`05` §11.1).

**What bumps which** — `05` §10.2 and `06` §4.3, side by side, because the two tables are easy to
confuse.

| Change                                        | `schemaVersion` | Package   |
| --------------------------------------------- | --------------- | --------- |
| Adding a key to the schema, optional or not   | **yes**         | —         |
| Removing, renaming, or retyping a key         | **yes**         | —         |
| Adding a Selection, Source, or Blend          | no              | minor     |
| Changing a registered type's parameter schema | no              | minor     |
| Changing a registered type's **output**       | no              | **major** |
| Fixing a bug that changes output              | no              | **major** |
| Renaming or retiring a type                   | no              | **major** |
| Widening a parameter's admissible range       | no              | minor     |
| Narrowing one                                 | no              | **major** |

### 9.2 Drawn-output stability

`07` §11's counterpart, for the picture rather than the grid. The distinction is load-bearing:
`05` §10.2 originally tested for _identical grid output_, which is why the amendment exists.

| Term                        | Definition                                                                                                                                                                                                                       | Owner               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **Drawn output**            | The picture, as distinct from the grid. After `1.0.0`, any change to it for an unchanged `(TilesetFile, seed, loadSalt)` triple and an unchanged **asset set** is a major bump — **whether or not `generate()`'s output moved**. | `07` §11.2, **R14** |
| **Geometry vectors**        | `(Layout, rows, columns, Wpx, x, y) → cellBox`, plus the `cellAt` round trip. Exact and browserless, in the manner of `02` §6.6.                                                                                                 | `07` §11.3, **R15** |
| **Transform vectors**       | `(scale, scaleX, scaleY, rotation, cellBox) → [a b c d e f]`. Catches **D11**'s order, the rotation sign, the centre, and scale-1 tangency.                                                                                             | `07` §11.3, **R15** |
| **The compositing residue** | The third layer, with no artifact: paint order, clipping, crop, and alpha resist everything short of the pixel comparison `05` Q5 already rejected. Recorded as open rather than invented, and `[POSTPONED]`.                    | `07` §11.3          |

**Major under R14 and invisible to every table `05` owns:** transform order, the sign of
`rotation`, paint order, what scale `1` means, the placement formula, centre-crop or the crop
window's position, and the clipping boundary (`07` §11.2).

**The asset set is quantified over** because it is genuinely outside the package: a replaced file
behind an unchanged `src` changes the picture and no version number can say so. That is the
host's, and **R2** confines the renderer's obligation to a single session.

---

## 10. Reserved, contested, and rejected names

### 10.1 Rejected

These are wrong. Flag them on sight.

| Do not write                                                                                 | Write                                                | Because                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CellState`                                                                                  | `TileState`                                          | A Cell is only a coordinate and has no appearance of its own (`02` §3). The state belongs to the tile.                                                                                                                                                                         |
| `TileType`                                                                                   | `Tile`                                               | `Tile` already denotes the family / identifier (`02` §3).                                                                                                                                                                                                                      |
| `Variant`                                                                                    | `TileAsset`                                          | `TileAsset` is the concrete drawable within a family (`02` §3). _Variant_ is unowned and attracts both assets and attribute jitter.                                                                                                                                            |
| `breakpoint`                                                                                 | `referenceWidth`                                     | `referenceWidth` is a frozen authoring width, not a runtime selector (`02` §12). The editor's preset widths are an unnamed convenience, not breakpoints (`09` §9.2).                                                                                                           |
| `scale` **as the only scale attribute**                                                      | `scaleX`, `scaleY`                                   | One axis cannot express a flip, and a leaf that only ever points one way is half a leaf (`03` §5.4). **Note the scope:** ADR-005 later added `scale` *beside* the axes, which this rejection never argued against — it rejected `scale` as a replacement, not as a companion. |
| `flipX: boolean`                                                                             | a negative `scaleX`                                  | A typed attribute would make Blends partial _by type_, and `06` would need per-type validation, all to encode a `-1` a number already encodes (`03` §5.4).                                                                                                                     |
| `override` — a Blend                                                                         | `set`                                                | They do not differ. `02` open question 3, resolved at `04` §7.1; `override` is struck from the vocabulary.                                                                                                                                                                     |
| `noise` — a Source                                                                           | `valueNoise`                                         | When a second noise function is registered, `noise` becomes a **category** and cannot also be a member (`04` §5.3). Reserved for that category — see §10.2.                                                                                                                    |
| `perlin`, `perlinNoise`                                                                      | `valueNoise`                                         | "Perlin" names a family whose implementations differ in gradient table, permutation, and interpolation. Two conformant renderers would produce different images, and no test vector table could be written. That is not a weakened **G1**; it is no **G1** at all (`04` §5.3). |
| `subtract`, `divide` — Blends                                                                | `add` / `multiply` with a signed or reciprocal range | `add` with `range: [−5, −5]` subtracts five (`04` §7.1).                                                                                                                                                                                                                       |
| `config.grid: { rows, columns }`                                                             | `config.rows`, `config.columns`, flat                | A nesting level whose only content is two integers, spending the contested word _grid_ on a config member (`06` §3.2).                                                                                                                                                         |
| `blend: { type: "add" }`                                                                     | `blend: "add"`                                       | The tempting symmetry with `selection` and `source` spends a nesting level on every Operation in every file to avoid a bump nobody has proposed (`06` §7.2).                                                                                                                   |
| `mapping.kind: "numeric"`                                                                    | nothing — read `target`                              | A second source of truth that can only agree or disagree, and on disagreement someone must write down which field wins (`06` §7.3, **C8**).                                                                                                                                    |
| Metadata spread beside `weight`                                                              | `meta: { ... }`                                      | This schema cannot enumerate `07`'s keys, so a blanket exception would sit at exactly the level where `weight` lives, and a metadata key called `weight` would shadow the real one (`06` §6.1).                                                                                |
| A validation **warning**                                                                     | an error, or an `09` advisory                        | A warning is either ignorable — in which case a load-time function should not produce it — or fatal, in which case calling it a warning made the failure look optional (`06` §10.1, **C6**).                                                                                   |
| Graceful degradation — an unknown type falls back to `constant`, or the Operation is dropped | a load failure                                       | A fallback renders a plausible-looking wrong picture with no error anywhere, which is worse than both a blank page and a stack trace (`05` §9, **X7**).                                                                                                                        |
| Per-cell clipping                                                                            | the render box as the only boundary                  | It would clip the two features the attribute set exists to provide: a bare 45° rotation already spills at scale 1 (`07` §7.1). **New this pass.**                                                                                                                              |
| Stretch, or letterbox                                                                        | centre-crop                                          | Stretch distorts silently; letterbox introduces bands whose size depends on the asset, breaking **R7**'s tangency for some assets and not others (`07` §6.4). **New this pass.**                                                                                               |
| A provider returning `null`                                                                  | throw or reject                                      | A `null` drawable is a third way to express emptiness alongside `tileId: null` and `opacity: 0` (`07` §4.3; `06` §5.1). **New this pass.**                                                                                                                                     |
| A provider keyed on `assetId` alone                                                          | the `(tileId, assetId)` pair                         | `TileAsset.id` is unique within its Tile only, so one Tile's `a1` would resolve to another's drawable, silently, forever (`07` §4.1). The same argument makes the export folder nested rather than flat (`09` §11.1). **New this pass.**                                       |
| _"identical grid output"_ as the test for a renderer bump                                    | identical **drawn** output                           | Reversing **D11** leaves `generate()` byte-identical and changes every rotated, non-uniformly scaled tile (`07` §11.1; `05` §10.2 amended). **New this pass.**                                                                                                                 |
| A component taking `(grid, layout)`                                                          | `<Tileset {file} />`                                 | Nothing produces a grid that did not come from a file, and split props make a mismatched grid/`Layout` pair expressible and undetectable (`08` §3.1, **S1**). **New this pass.**                                                                                               |
| "Preview mode", or a second component for the editor                                         | one component, with overlays drawn over it           | `07` §3 made literal by **S2**. Two implementations drift, and the drift surfaces where the author is looking directly at it. **New this pass.**                                                                                                                               |
| `Drawable = string`                                                                          | `{ src: string }`                                    | A bare string cannot grow; `07` §13's DPR point would be a breaking change instead of an added key (`08` §4.2). **New this pass.**                                                                                                                                             |
| Drawing `loadSalt` in component init or a module constant                                    | a prop, drawn by the host once                       | Both run twice under SSR and produce two pictures for one page (`08` §5.1, **S7**). **New this pass.**                                                                                                                                                                         |
| Alt text or accessible names on tiles                                                        | `aria-hidden`, `alt=""`                              | The output is decorative; meaningful content is never a tile (`08` §4.5). **New this pass.**                                                                                                                                                                                   |
| A width prop                                                                                 | CSS, and `Wpx` as whatever width the element gets    | Measuring reintroduces exactly what `07` §5.3 removes (`08` §4). **New this pass.**                                                                                                                                                                                            |
| A second document model that projects to a file on export                                    | the file **is** the editor's state                   | A projection can differ from what previews, and **S2** requires a live file at every instant regardless — so the second model adds a divergence without removing a requirement (`09` §4.1, **E3**). **New this pass.**                                                         |
| An editor `disabled` flag on an Operation                                                    | removal, held in UI state                            | There is no field for one and adding one is a `schemaVersion` bump. **G3** makes removal correct for free: a muted-then-unmuted Operation draws exactly what it drew before (`09` §4.1). **New this pass.**                                                                    |
| A separate preview seed in the editor                                                        | the seed field writes `config.defaultSeed`           | A preview seed lets the author approve a picture the file does not produce — `07` §3's stated worst outcome by a different route (`09` §5). **New this pass.**                                                                                                                 |
| A draggable page width that writes `referenceWidth`                                          | a numeric **design width** field                     | A draggable edge reads as a viewport, and a viewport does not destroy work. The destructive edit must not be the one that is easy to do by accident (`09` §9.2, **E11**). **New this pass.**                                                                                   |
| Migrating an orphaned `rect` or `cellList`                                                   | nothing — undo is the repair                         | Proportional and absolute are both defensible readings, and choosing silently is `06` §9.2's coercion applied to the thing the author cares about most (`09` §9.4). **New this pass.**                                                                                         |
| A placeholder glyph in the editor preview                                                    | report the failure beside the preview                | A placeholder is a drawable the renderer did not choose, in a cell **R3** says must draw nothing — and it misrepresents the picture the author is approving (`09` §12.3). **New this pass.**                                                                                   |

### 10.2 Reserved

Words deliberately held back for a future meaning. Do not spend them early.

| Word                          | Held for                                                                                                                                                                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **breakpoint**                | Per-Layout `minWidth`, if multi-layout support arrives (`02` §12; `06` §12).                                                                                                                                                                             |
| **Layout** (plural)           | `layout` becoming `layouts`, keyed by `minWidth`. `[EXTENSION POINT]` — a `schemaVersion` bump (`06` §12).                                                                                                                                               |
| **noise**                     | The **category** of noise Sources, once a second one is registered (`04` §5.3).                                                                                                                                                                          |
| `simplexNoise`, `worleyNoise` | Named future noise Sources, each pinning itself to the `02` §6.6 standard and to **X3** (`04` §10; `05` §13).                                                                                                                                            |
| `curve`                       | An optional field on a numeric mapping. `[POSTPONED]` — not a break, but still a `schemaVersion` bump (`04` §6.2; `06` §4.3).                                                                                                                            |
| `min`, `max`                  | Blend names. `[EXTENSION POINT]` — the only Blends that would make `03` §5.5's lossy clamp recoverable, and `rotation` must veto both (`04` §7.1; `05` §4.2).                                                                                            |
| `lacunarity`, `persistence`   | Exposed `valueNoise` parameters, if they ever earn their place (`04` §5.2).                                                                                                                                                                              |
| `type`                        | Reserved **in the parameter namespace**: no registered type may declare a parameter called `type` (`06` §7.1).                                                                                                                                           |
| `crop`, `sourceRect`          | The author-controlled crop `meta` key. `[EXTENSION POINT]` — costs no `schemaVersion` bump, and must ship with a default equal to the centre square, or its arrival moves every existing non-square asset's picture (`07` §6.4, §13). **New this pass.** |
| `srcset`, `sources`           | The DPR-aware `Drawable` key. `[EXTENSION POINT]` — additive under **S5** (`08` §10). **New this pass.**                                                                                                                                                 |
| `markup`, `inline`            | Recolourable tiles via inlined SVG. `[EXTENSION POINT]` — a second `Drawable` shape and a second draw path (`08` §10). **New this pass.**                                                                                                                |
| `layers`                      | The layer feature, whose real content is enforcing agreement on `rows`, `columns`, `cellSize`, `referenceWidth` — not the drawing, which already works through host CSS (`08` §8; `roadmap` §4.3). **New this pass.**                                    |
| `over`                        | An explicit region on a spanning Source — `gradient { angle, over? }`. `[EXTENSION POINT]` — raised by `09` §14.2, owned by `04` §10. **New this pass.**                                                                                                 |

### 10.3 Collisions deliberately tolerated

One word, two things — where the owning document considered it and let it stand. Recorded so a
later reader does not "fix" them.

| Collision                                                                                                       | Why it stands                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `random` is both a Selection preset and a Source preset                                                         | Namespaced by slot, and they take different parameters (`density` versus none). They also occupy **different hash channels** by design — `04` §4.3 exists precisely because sharing one would correlate them. `05` **X4** makes names unique within a kind rather than globally, which is what permits this. |
| **weight** appears on a TileAsset and on a palette entry                                                        | Both mean proportion of area, which is why one number serves. The ordering rules differ — canonical (**D3**) versus authored (**O6**) — but `04` §6.4 reasons about that tension explicitly and resolves it on a real distinction.                                                                           |
| **salt** is per-Operation, while `assetSalt` is per-config, and `loadSalt` is neither                           | Different scopes, all named for the same mechanism, all distinct from the seed. `02` §6.4 and `04` §8.2 both carry the three-row table that keeps them apart: two are frozen authoring values in the config, one is a runtime argument.                                                                      |
| `01` §11.4's **tombstone** applies to section numbers, `05` **X8**'s to type names, `06` §10.3's to error codes | Three scopes, one discipline, and `05` §9.2 and `06` §10.3 both cite the original rather than restating it. The word is doing the same work in each. **`07` **R4**'s additive-only `meta` is a fourth** (`07` §4.5).                                                                                         |
| **resize** means an authoring edit and a viewport change                                                        | Genuinely different events with different costs. `07` §9.1 carries the two-row table that keeps them apart; the first re-derives `columns`, the second changes only `s` and never regenerates. **New this pass.**                                                                                            |
| **scale** means an attribute (`scale`, `scaleX`, `scaleY`) and the viewport **scale factor** `s`                | Different layers entirely. `07` says _scale factor_ for the second throughout, and **R7** exists to state precisely how the two meet at the number `1`. Sharpened by ADR-005, which made `scale` an attribute name in its own right: an unqualified _scale_ is now ambiguous in three ways, so qualify it.                                                                                                                                   |
| **schema** means the config format (`06`) and the registry's `ParamSchema` (`05` §5.1, `06` §7.4)               | Different layers, neither renameable now. `roadmap` §4.1 carries the note, because the two extension-point rows contradict each other on their face. **New this pass.**                                                                                                                                      |
| **caller** and **host** both mount something                                                                    | Not a collision but a split, made to avoid one: `07` §9 left _caller_ ambiguous, and **S1** closed the role, so the package needed a second word for what mounts the component. `08` §3.2's two-row table is the definition. **New this pass.**                                                              |

**Resolved rather than tolerated this pass:** _Selection_ / _weighted selection_ was carried in
this table's spirit for two passes and is now **fixed by renaming** — the walk is the **weight
walk** (§7.1, open question 7). It failed the test the other rows pass: `03` §4.2's heading
_"Selection is order-independent"_ and `04` §6.4's _"Palette order is load-bearing"_ describe the
same mechanism and read as a flat contradiction, which is not a collision a reader can navigate.

---

## 11. Document conventions

Recorded here because this document ships to the repo and these conventions must survive with it.

### 11.1 Invariant prefixes

Invariant IDs are prefixed per document so they never collide.

| Doc             | Prefix |     | Doc         | Prefix |
| --------------- | ------ | --- | ----------- | ------ |
| `02` generation | **G**  |     | `06` config | **C**  |
| `03` domain     | **D**  |     | `07` render | **R**  |
| `04` operations | **O**  |     | `08` svelte | **S**  |
| `05` extension  | **X**  |     | `09` editor | **E**  |

`00`, `01`, and `roadmap` declare no invariants and hold no prefix. That gap is intentional:
they collect rather than constrain, and a binding that needs to exist belongs in the document
that owns the decision, where the documents downstream inherit it (`00` §11; `roadmap` §8).

### 11.2 Status markers

| Marker              | Meaning                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `[EXTENSION POINT]` | Enabled by a decision already made; deliberately not built.                                                                         |
| `[POSTPONED]`       | Deliberately deferred beyond V1; no design work done.                                                                               |
| `[UNHARVESTED]`     | Glossary-local. Term owned by a document not yet written. **None remain** — retained because a future document reopens the case.    |
| **ADR**             | A record in `/adr` for a decision reversed, or contested and likely to be re-proposed. Ordinary rationale stays inline in the spec. |

### 11.3 Identifier naming

_(descriptive label — a pattern four documents follow without naming it)_

A stable generated identifier is the bare field `id` **on the thing it identifies**, and
`<thing>Id` **when referred to from elsewhere**.

| On the thing   | Referred to as                                         | Owner                    |
| -------------- | ------------------------------------------------------ | ------------------------ |
| `Tile.id`      | `tileId` on a `TileState`, `tileId` in a palette entry | `03` §3, §6; `04` §6.3   |
| `TileAsset.id` | `assetId` on a `TileState`                             | `03` §4, §6              |
| `Operation.id` | `operationId` in a hash key and in `ctx`               | `02` §6.3; `04` §3, §5.1 |

Every such identifier is assigned once at creation, never derived from list position and never
from a human-readable name (`03` **D1**, `02` §6.3). All three match `[A-Za-z0-9_-]+` and
exclude the colon (`06` §5.3, **C10**). The editor generates all three and **never reassigns
one, including through duplication** — which is why a duplicated Operation looks different from
its original, and why authors will ask about it (`09` §4.3).

### 11.4 Section numbering is append-only

_(descriptive label — a constraint on how these documents are edited, not on what they say)_

**A section number, once published, is permanent.** A new section takes the next unused
number in its parent. Sections are never renumbered to make room, and never renumbered to
close a gap.

| Edit                           | Correct                                                               | Wrong                                  |
| ------------------------------ | --------------------------------------------------------------------- | -------------------------------------- |
| Adding a subsection to `03` §5 | append as §5.7                                                        | insert as §5.3, pushing §5.3–§5.6 down |
| Superseding `04` §6.2          | rewrite §6.2 in place, or add §6.5 and mark §6.2 withdrawn            | delete §6.2 and renumber               |
| Removing a section entirely    | keep the heading, mark it **Withdrawn**, state where the content went | delete it                              |

Every cross-reference in this package is a **position** — `03` §5.4, `02` §6.6, `04` §7.2 —
and a position is only a valid identifier while the thing it addresses stays put. Renumbering
`03` §5.4 to §5.5 silently redirects six citations in three documents to the wrong paragraph.
Nothing detects this: the citation still parses, still points at a real section, and still
reads plausibly. It is the same failure class as `Tile.id` derived from list position
(**D1**), applied to documents rather than to data. `05` **X8**, `06` §10.3, and `07` **R4**
apply the same discipline to type names, error codes, and `meta` keys.

The tempting alternative is to renumber for legibility — keep related material adjacent,
close the gaps a withdrawal leaves. It loses because legibility is recoverable and citations
are not. A reader who finds §5.7 discussing something that belongs beside §5.2 loses a few
seconds. A reader who follows a citation to a renumbered section is misinformed and has no
signal that they were.

**A heading may be rewritten; a number may not.** Renaming §4.3 from _"The selection algorithm"_
to _"The weight walk"_ costs nothing structural, because nothing cites a title.

**Withdrawal keeps its number.** §1.2 of this document already withdrew the bare-`§`
shorthand without deleting the convention that carried it; that is the pattern. A withdrawn
section is a tombstone, and a tombstone is what makes a stale citation legible rather than
misleading.

**Ordering is not semantic.** A section's number records when it was written, not where it
belongs in an argument. Where reading order matters, the prose says so — as `03` §5.4 does
when it points forward to `04` §7.2.

### 11.5 Qualify `type` and `default`

_(resolves open question 8, carried through two passes and adopted here.)_

Two words carry four senses each. Each sense is unambiguous when the noun is qualified and
genuinely ambiguous when it is not.

| Word      | The four senses                                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`    | a **registered type** (`05` throughout) · a **Target type** (`04` §7.2) · the **tag key** in `{ type, ...params }` (`06` §7.1) · the discriminant in `ParamSpec` (`06` §7.4) |
| `default` | an **attribute default** (**D8**) · a Target's **default Blend** (`04` §7.2) · a **parameter default** (`05` §5.1) · a **schema field default** (`06` §5.1)                  |

**The rule: never write bare _type_ or bare _default_ where two senses are in scope.** Write
_registered type_, _Target type_, _default Blend_, _parameter default_, _attribute default_.

`07`, `08`, and `09` were named as the test and passed it: neither word acquired a fifth sense.
`09` §7.2's `control` is an affordance hint, not a registered type, and it is the only place in
the package where an unrecognized name is not an error — which is exactly the kind of thing bare
_type_ would have obscured.

### 11.6 Deferral and scope vocabulary

`roadmap` and `00` own this. Neither binds anything, and both collect from documents that do.

| Term                        | Definition                                                                                                                                                                                                                                                                                                                                                                                                            | Owner                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Cost of arrival**         | _(descriptive label)_ Eight tiers labelling rules already fixed elsewhere: **none**, **editor-only**, **package-internal**, **minor engine bump**, **minor renderer bump**, **`schemaVersion` bump**, **major engine bump**, **major renderer bump**. **editor-only** is not cheaper than **none**: both move no version number, but the second is invisible because the editor is unversioned, and the work is real. | `roadmap` §3.2; `09` §14.1 |
| **unknown** (a cost)        | A legitimate value, and itself information: an item whose cost cannot be stated is not ready to be scheduled.                                                                                                                                                                                                                                                                                                         | `roadmap` §3.2, Q4         |
| **Gated on**                | What must land, or be reversed, before an item can. Reads _nothing_ where the item is merely unbuilt.                                                                                                                                                                                                                                                                                                                 | `roadmap` §3.2             |
| **Gate discharged**         | _(descriptive label)_ The case where later work removed a blocker without the blocked row being updated — the open attribute registry, unblocked by `07` §10 while still reading as gated on it.                                                                                                                                                                                                                      | `roadmap` §5.1             |
| **Delivered and withdrawn** | Where a row goes when it leaves §4 or §5. A row never leaves by being deleted.                                                                                                                                                                                                                                                                                                                                        | `roadmap` §6               |
| **Homeless question**       | A question raised in a completed spec, answered by no document and deferred to no document. Collected in `roadmap` §7 because otherwise it exists only in the table that raised it, and the conversation is discarded.                                                                                                                                                                                                | `roadmap` §7               |
| **Standing posture**        | An assumption several documents reason from. Reversing one does not add a feature; it **invalidates arguments**. Distinct from a deferral, which `roadmap` carries with a cost and a gate.                                                                                                                                                                                                                            | `00` §5.1, §5.2            |
| **Permanent non-goal**      | A standing posture with no `roadmap` row, because it is not reversible. Three carry invariant IDs (**D10**, **G1**, **X7**); two do not, and whether that distinction is principled is `00` Q4.                                                                                                                                                                                                                       | `00` §5.2                  |
| **The census**              | `00` §4.5's counts of every V1 surface. The owning table is authoritative; the census exists so drift is cheap to detect.                                                                                                                                                                                                                                                                                             | `00` §4, §4.5              |

**`00` §8's five principles** — descriptive labels for patterns visible only from outside any one
document. Non-binding; every claim cites the sections that already make it.

| Principle                                                      | One line                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Determinism is the load-bearing property                       | Two honest exceptions are on the record: weight edits, and `gradient`'s transcendentals.                |
| One implementation of anything two things could disagree about | Portability becomes a claim about **time**, not about languages.                                        |
| Make the wrong thing unstateable, rather than detecting it     | **C1** is the model; unenforced layer stacking is the counter-instance the principle exists to prevent. |
| Failure is loud                                                | The one deliberate exception is `meta`, and the cost is recorded rather than argued away.               |
| Nothing is deleted                                             | Section numbers, type names, error codes, roadmap rows, `meta` keys, and `_harvest.md` blocks alike.    |

---

## 12. Alphabetical index

Mechanically maintained. Regenerate on each harvest — and see open question 5, whose case is now
past arguing.

| Term                            | Where                          |
| ------------------------------- | ------------------------------ |
| `accepts`                       | §8.5, §8.7                     |
| `add`                           | §8.5                           |
| Advisory diagnostic             | §5.3, §5.4                     |
| Affordance                      | §5.4                           |
| Affordance mapping              | §5.4                           |
| `all`                           | §8.2                           |
| `angle`                         | §8.3                           |
| Applier                         | §7.5                           |
| Asserted, not enforced          | §8.7                           |
| Asset attach                    | §5.4                           |
| Asset provider                  | §7.4                           |
| `AssetProvider`                 | §7.4                           |
| `AssetRef`                      | §7.4                           |
| `assetId`                       | §7.3                           |
| `assetSalt`                     | §9                             |
| Attribute                       | §7.2                           |
| Attribute default               | §7.2, §11.5                    |
| Authored order                  | §8.4                           |
| Authoring range                 | §5.4                           |
| Authoring resize                | §6.1, §10.3                    |
| Bleed                           | §6                             |
| Blend                           | §8.5                           |
| `blend` as a bare string        | §8.5, §10.1                    |
| Bounding                        | §7.2                           |
| breakpoint                      | §10.1 rejected, §10.2 reserved |
| Caller                          | §5, §10.3                      |
| Canonical order                 | §7.1                           |
| Cell                            | §6                             |
| Cell box                        | §6.1                           |
| `cellAt`                        | §6.2                           |
| `cellBox`                       | §6.2                           |
| `cellList` (Selection)          | §8.2                           |
| `cellList` (`ParamSpec`)        | §8.7                           |
| `CellState`                     | §10.1 rejected                 |
| `cellsPerFeature`               | §8.3                           |
| `cellSize`                      | §6                             |
| Census                          | §11.6                          |
| Centre-crop                     | §7.5                           |
| `checkerboard`                  | §8.2                           |
| Clipped cell                    | §6                             |
| Clockwise-positive              | §7.5                           |
| Closed                          | §8.7                           |
| `code`                          | §5.3                           |
| Coercion                        | §5.3                           |
| Collisions tolerated            | §10.3                          |
| Column alignment                | §6                             |
| `columns`                       | §6                             |
| Composition order               | §7.5                           |
| Compositing residue             | §9.2                           |
| Config                          | §5, §5.1                       |
| `constant`                      | §8.3                           |
| Coordinate-bound Selection      | §8.2                           |
| Coordinate mapping              | §6.2                           |
| Cost of arrival                 | §11.6                          |
| `crop`                          | §10.2 reserved                 |
| `ctx`                           | §8.3                           |
| `curve`                         | §10.2 reserved                 |
| Default Blend                   | §8.5, §11.5                    |
| Default provider                | §7.4                           |
| `defaultSeed`                   | §5, §5.1                       |
| Delivered and withdrawn         | §11.6                          |
| Design px                       | §6                             |
| Design width                    | §5.4                           |
| Destructive edit                | §6, §5.4                       |
| Domain                          | §7.2                           |
| Drawable                        | §7.1, §7.4                     |
| Drawable box                    | §6.1                           |
| Drawn once and held             | §8.6                           |
| Drawn output                    | §9.2                           |
| Editor                          | §5, §5.4                       |
| `editor` block                  | §8.7                           |
| Effective seed                  | §9                             |
| `effectiveSeed`                 | §8.3, §9                       |
| Empty cell                      | §7.3                           |
| Engine                          | §5                             |
| `engineVersion`                 | §5.2                           |
| Error codes                     | §5.3                           |
| Evaluation model                | §8.1                           |
| `everyNth`                      | §8.2                           |
| Export folder                   | §5.4                           |
| Extensible                      | §8.7                           |
| Facet                           | §7.5                           |
| `flipX`                         | §10.1 rejected                 |
| Gate discharged                 | §11.6                          |
| Gated on                        | §11.6                          |
| `generateRegion`                | §14 — `[EXTENSION POINT]`      |
| Geometry vectors                | §9.2                           |
| `gradient`                      | §8.3                           |
| Graceful degradation            | §10.1 rejected                 |
| Grid                            | §6                             |
| `grid` as a config member       | §10.1 rejected                 |
| Grid-absolute                   | §6                             |
| Gutter alignment                | §6                             |
| Half-open                       | §6.2                           |
| Hash channel                    | §9                             |
| Homeless question               | §11.6                          |
| Host                            | §5, §10.3                      |
| `horizontalAlignment`           | §6                             |
| Identifier                      | §5.2                           |
| Identifier naming               | §11.3                          |
| `impl`                          | §8.7                           |
| Import gate                     | §5.4                           |
| Inert state                     | §7.3                           |
| JSON Pointer                    | §5.3                           |
| `kind` (Registration)           | §8.7                           |
| `kind` tag on a Mapping         | §10.1 rejected                 |
| `lacunarity`                    | §8.3, §10.2                    |
| Layering                        | §7.3                           |
| `layers`                        | §10.2 reserved                 |
| Layout                          | §5.2, §6                       |
| Legal transition                | §5.4                           |
| Load failure                    | §7.4                           |
| Load preview                    | §5.4                           |
| `loadSalt`                      | §5, §9                         |
| Manual Selection                | §8.2                           |
| Manufactured guarantee          | §5.4                           |
| Mapping                         | §8.4                           |
| `markup` / `inline`             | §10.2 reserved                 |
| Memorable seed                  | §9                             |
| `message`                       | §5.3                           |
| `meta`                          | §5.2, §7.1, §7.4               |
| `meta.src` / `width` / `height` | §7.4                           |
| `min` / `max` (Blends)          | §10.2 reserved                 |
| `minWidth`                      | §10.2 reserved, §14            |
| `mixLoad`                       | §9                             |
| `mod`, remainder versus         | §8.2                           |
| `multiply`                      | §8.5                           |
| Mute-by-removal                 | §5.4, §10.1 rejected           |
| `name` (Registration)           | §8.7                           |
| Natural height                  | §6.1                           |
| Natural ratio                   | §6.1                           |
| `noise`                         | §10.1 rejected, §10.2 reserved |
| Non-finite rejection            | §7.2                           |
| `octaves`                       | §8.3                           |
| `onAssetError`                  | §7.4                           |
| One engine                      | §8.7                           |
| One Source per Operation        | §8.1                           |
| `opacity`                       | §7.2                           |
| Operation                       | §8.1                           |
| Operation evaluation            | §8.1                           |
| Operation stack                 | §8.1                           |
| `operationId`                   | §8.1, §11.3                    |
| Optional (schema)               | §5.2                           |
| `originX` / `originY`           | §6.1                           |
| Output-breaking change          | §9.1                           |
| `over`                          | §10.2 reserved                 |
| `override`                      | §10.1 rejected                 |
| Package version                 | §9.1                           |
| Palette                         | §8.4                           |
| Palette bar                     | §5.4                           |
| Palette walk                    | §7.1                           |
| `ParamSchema`                   | §8.7                           |
| `ParamSpec`                     | §8.7                           |
| Parameter default               | §8.7, §11.5                    |
| Parity correction               | §6                             |
| Partial Blends                  | §8.5                           |
| `path`                          | §5.3                           |
| Per-octave salt                 | §8.3                           |
| Permanent non-goal              | §11.6                          |
| `perlin`                        | §10.1 rejected                 |
| `persistence`                   | §8.3, §10.2                    |
| Portability rules               | §9                             |
| Positional hashing              | §9                             |
| Preview width                   | §5.4                           |
| Procedural Selection            | §8.2                           |
| Purity                          | §5                             |
| `random` (Selection)            | §8.2                           |
| `random` (Source)               | §8.3                           |
| `range`                         | §8.4                           |
| `rect`                          | §8.2                           |
| Reference config                | §9.1                           |
| `referenceWidth`                | §6                             |
| Registered type                 | §8.7, §11.5                    |
| Registration                    | §8.7                           |
| Regression vector               | §9.1                           |
| Render box                      | §6.1                           |
| Render box element              | §6.1                           |
| Render session                  | §5                             |
| Render space                    | §6.1                           |
| Renderer                        | §5                             |
| Reroll                          | §9, §5.4                       |
| `reseedAssetsOnLoad`            | §8.6                           |
| `reseedOnLoad`                  | §8.6                           |
| Resolution failure              | §7.4                           |
| Retired name                    | §8.7                           |
| `rotation`                      | §7.2                           |
| Row-major paint order           | §6.1                           |
| `rows`                          | §6                             |
| `salt`                          | §8.1, §9                       |
| Scale 1                         | §7.5                           |
| Scale factor                    | §6.1, §10.3                    |
| `scale` / `scaleX` / `scaleY`   | §7.2                           |
| `schemaVersion`                 | §5.2, §9.1                     |
| Section numbering               | §11.4                          |
| Seed                            | §5                             |
| Selection                       | §8.2                           |
| `selection()`                   | §5.4                           |
| Selection composition           | §8.2                           |
| `set`                           | §8.5                           |
| Shared edges                    | §6.1                           |
| `simplexNoise`                  | §10.2 reserved                 |
| smoothstep                      | §8.3                           |
| Soft track                      | §5.4                           |
| Source                          | §8.3                           |
| Spanning Source                 | §8.3                           |
| Spread-or-nest                  | §5.2                           |
| `srcset` / `sources`            | §10.2 reserved                 |
| Stage 1 / Stage 2               | §9                             |
| Standing posture                | §11.6                          |
| `steps`                         | §8.4                           |
| Stochastic                      | §8.3, §8.7                     |
| Strictness                      | §5.3                           |
| Structural boundary             | §5.2                           |
| `subtract` / `divide`           | §10.1 rejected                 |
| Target                          | §8.5                           |
| Target type                     | §8.5, §11.5                    |
| Test vector                     | §9                             |
| Tile                            | §7.1                           |
| Tile library                    | §7.1                           |
| `Tile.id` / `Tile.name`         | §7.1                           |
| TileAsset                       | §7.1                           |
| `TileAsset.id`                  | §7.1                           |
| `tileId`                        | §7.3                           |
| TileState                       | §7.3                           |
| `<Tileset>`                     | §5                             |
| `TilesetConfig`                 | §5.2                           |
| `TilesetFile`                   | §5.2                           |
| `TileType`                      | §10.1 rejected                 |
| Tombstone                       | §10.3, §11.4                   |
| Top-anchored                    | §6                             |
| Totality                        | §8.7                           |
| Transform order                 | §7.2, §7.5                     |
| Transform six-tuple             | §7.5                           |
| Transform vectors               | §9.2                           |
| Transient UI state              | §5.4                           |
| Two version numbers             | §9.1                           |
| `type` (four senses)            | §11.5                          |
| `type` (the tag key)            | §5.2, §10.2 reserved           |
| `uint32`                        | §5.2                           |
| Undefined behaviour             | §5.3                           |
| unknown (a cost)                | §11.6                          |
| Unknown key                     | §5.3                           |
| Unknown type name               | §8.7                           |
| `validate()`                    | §5.3                           |
| Validated config                | §5                             |
| `ValidationError`               | §5.3                           |
| `valueNoise`                    | §8.3                           |
| `Variant`                       | §10.1 rejected                 |
| Veto                            | §8.5, §8.7                     |
| Viewport resize                 | §6.1, §10.3                    |
| `vignette`                      | §8.3                           |
| Warning                         | §10.1 rejected                 |
| Weight                          | §7.1                           |
| Weight stability                | §7.1                           |
| Weight walk                     | §7.1                           |
| Weighted selection              | §7.1 — **renamed**, see Q7     |
| `worleyNoise`                   | §10.2 reserved                 |
| `Wpx`                           | §6.1                           |
| `yOffset`                       | §6                             |
| `1.0.0`                         | §9.1                           |

---

## 13. Invariants summary

This document declares no invariants. It constrains spelling, not behaviour.

Authoritative invariants live in their owning documents. As of this revision:

| Doc                         | Declared           | Count |
| --------------------------- | ------------------ | ----- |
| `02-generation-contract.md` | **G1**–**G5**      | 5     |
| `03-domain-model.md`        | **D1**–**D11**     | 11    |
| `04-operations.md`          | **O1**–**O8**      | 8     |
| `05-extension-model.md`     | **X0**–**X10**     | 11    |
| `06-config-schema.md`       | **C1**–**C10**     | 10    |
| `07-render-contract.md`     | **R1**–**R15**     | 15    |
| `08-renderer-svelte.md`     | **S1**–**S10**     | 10    |
| `09-editor.md`              | **E1**–**E16**     | 16    |
| `00`, `01`, `roadmap`       | none, deliberately | —     |

**Eighty-six invariants across eight documents.** Every prefix §11.1 reserves is now in use;
none is reserved against a document that does not exist. **X0** is numbered zero because `05`
§10 is its enforcement and everything else in that document is downstream of it.

**Rewritten in place, not renumbered:** **G1** (ADR-002), **O4** and **O8** (ADR-002), **O7**
(ADR-001), **R3** (`08` Q2 — it now binds load failure alongside resolution failure and cites
**S6**), and **D3** (open question 7's weight-walk rename). Each keeps its identifier; only the
text moved.

---

## 14. Extension points

| Point                                                                        | Status                                                                                                                                                |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~Harvest passes for `07`–`09`, `00`, and `roadmap`~~                        | **Delivered** — this pass. Kept as a tombstone per §11.4. The document is complete and grows only when a document is added or amended                 |
| Cross-references from each term to its first _use_ as well as its definition | `[EXTENSION POINT]` — the gate is discharged: it was gated on the package being complete, and the package is complete. `roadmap` §4.5 carries the row |
| Generating §12 from the body rather than maintaining it by hand              | `[POSTPONED]` — see open question 5. `roadmap` §5.4, `06` Q12, and `00` §12 all want the same tooling                                                 |
| `minWidth` / `layouts`                                                       | `[EXTENSION POINT]` — not a hole. `02` §12, `06` §12; the reserved words are in §10.2. Moved here from §3.1, where it never belonged                  |
| `generateRegion(x0, y0, w, h)`                                               | `[EXTENSION POINT]` — not a hole. `02` §12. Moved here from §3.1 for the same reason                                                                  |

---

## 15. Open questions

| #   | Question                                                                                                                                                               | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `Grid` carries two senses: the `rows × columns` engine input (`02` §3, §7) and the container type of the output, `Grid<TileState>` (`02` §8). One word, two things.    | **Open → `02`.** Unchanged by this pass and now **the only naming question that outlived the package.** `06` §3.2 keeps the word out of the file format entirely, so whatever is decided costs no saved file a rewrite and no `schemaVersion` bump; what remains is a type-name ambiguity in `02` §3 and §8. Every other document is complete and none of them made it worse. It still needs an explicit decision rather than a silent fix.                                                                                                                                                                                          |
| 2   | _Manual_ versus _coordinate-bound_ Selection — same concept, or a subset?                                                                                              | **Resolved** — `04` §4.4, and confirmed by `09` §7.3. _Manual_ is the editor-facing term for `cellList` specifically, a **subset** of coordinate-bound. The two are repaired differently, and the brush bounds where the `rect` drag does not.                                                                                                                                                                                                                                                                                                                                                                                       |
| 3   | Is `assetId` an attribute or a distinct identifier field?                                                                                                              | **Resolved** — `03` §6, **D9**. A distinct field, not an attribute: it declares no domain, default, or bounding (**D4** does not apply to it), and it is an engine **output** no Operation can target.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 4   | Is `TilesetConfig` the fixed type name, or incidental to the signature in `02` §4?                                                                                     | **Resolved** — `06` §3, and `06` Q9. Fixed, alongside `TilesetFile` and `Layout`. All three are naming truth (§5.2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 5   | Should §12 be generated from the body rather than maintained by hand?                                                                                                  | **Open, and past arguing.** The index is now roughly 250 rows, added by hand over four passes. It is still a tooling question rather than a spec question, and it is now the same question in four places — `01` §14, `06` Q12, `00` §12, `roadmap` §5.4. The first document to build it settles it for all of them.                                                                                                                                                                                                                                                                                                                 |
| 6   | Completeness.                                                                                                                                                          | **Resolved.** Ten of ten sources harvested; §3.1 is empty and no `[UNHARVESTED]` marker remains. Status is _Draft, agreed_. It reopens only when a document is added or materially amended — including by open question 7's rename, which is owed but does not gate this status, since the terms are already recorded correctly here.                                                                                                                                                                                                                                                                                                |
| 7   | _Selection_ (capital S — the cell test, `04` §4) and _weighted selection_ (the cumulative-weight walk, `03` §4.3 / `04` §6.3) are unrelated mechanisms sharing a word. | **Resolved — renamed.** The walk is **the weight walk**; _selection_ belongs to `04` §4 alone. `05` §6.2's _palette walk_ survives as the palette instance of it and needs no change, which is what makes the rename cheap. The deciding evidence is not the `09` §7.6 adjacency but `03` §4.2's heading _"Selection is order-independent"_ against `04` §6.4's _"Palette order is load-bearing"_ — the same mechanism, read as a contradiction. Eight amendments are owed across `02`, `03`, and `04`; **D3** is rewritten in place. No identifier, config key, or API moves, so no version number of any kind moves.               |
| 8   | Two words carry four senses each — `type` and `default`.                                                                                                               | **Resolved — adopted as a convention at §11.5.** No renaming was warranted; the fix is a prose rule. `07`–`09` were named as the test and produced no fifth sense of either word. Cheap to follow, and it costs nothing when ignored, which is why it is a convention rather than an invariant.                                                                                                                                                                                                                                                                                                                                      |
| 9   | **New this pass.** `_harvest.md` claims to be _"the only input the `01` harvest needs"_, and it had no `09` block at all.                                              | **Open → process.** `09` was harvested by reading `09-editor.md` directly, so nothing was lost. But the ledger's own preamble and `00` §10.2 both address the _opposite_ failure — a block wrongly marked retired — and neither covers a block that was never appended. **The absence is invisible by construction**, since an append-only file with a missing entry looks exactly like one that is up to date. The fix is not in this document: either the end-of-conversation checklist appends the block before the spec is filed, or the harvest stops treating the ledger as sufficient and diffs it against the document list. |
