# 06 — Config Schema

> **Status:** Draft, agreed  
> **Depends on:** `01-glossary.md`, `02-generation-contract.md`, `03-domain-model.md`, `04-operations.md`, `05-extension-model.md`  
> **Constrains:** `07-render-contract.md`, `08-renderer-svelte.md`, `09-editor.md`  
> **Amended:** §10.4 rewritten in place — see `07-render-contract.md` §5.2

---

## 1. Purpose

This document defines the **file**: the concrete JSON a saved tileset is, the rules that decide
whether a given file is legal, and the shape of the answer when it is not.

Everything upstream describes the system in types and prose. This is where those types acquire
key names and where "a validated config" — assumed by `03` §3.1, relied on by `02` §9, and
never defined — becomes a specific function returning a specific result.

It also owns `schemaVersion`, the second of the two version numbers `05` §10.1 insists on
keeping apart.

---

## 2. Not in this document

The following belong elsewhere and must not be specified here:

- The semantics of any Selection, Source, Mapping, Blend, or Target → `04-operations.md`
- Which types exist and what each declares → `05-extension-model.md`
- Attribute domains, defaults, bounding behaviour → `03-domain-model.md` §5
- Package versioning and output stability → `05-extension-model.md` §10
- The hash function and its portability rules → `02-generation-contract.md` §6.6
- What the caller does with `defaultSeed`, or how it draws `loadSalt` → `07-render-contract.md`
- The contents of a TileAsset's `meta` block → `07-render-contract.md`
- How a validation error is presented to an author, and every advisory diagnostic → `09-editor.md` (§10.4)
- Migration code for a future `schemaVersion` → does not exist; `roadmap.md`

---

## 3. The file

```
TilesetFile {
  schemaVersion: 2
  engineVersion: string
  config:        TilesetConfig
  layout:        Layout
}
```

`TilesetConfig` is the type name `02` §4 gave the engine's first argument, fixed here rather
than left incidental (`01` open question 4). `Layout` is the type `02` §7 named. `TilesetFile`
is new, and is the only name in the package for the thing on disk.

A load is therefore:

```
generate(file.config, seed, loadSalt)
```

### 3.1 Why the split is the engine boundary

The two blocks are not organizational. They are `02` §7's Grid/Layout split made structural, so
that the call above **cannot** carry a prohibited input.

`02` §4.2 forbids the engine from receiving a pixel measurement, and `02` §7 assigns `cellSize`,
`referenceWidth`, `yOffset`, and `horizontalAlignment` to the renderer. Under a flat file — one
object with everything in it — honouring that means the caller picking out the right fields on
every call, forever, correctly. Under this split it is a property of the file: there is no pixel
measurement anywhere inside `config`, at any depth, so passing `config` whole is safe and
passing the file whole is a type error.

**Invariant C1** — _No member of `config`, at any depth, is a pixel measurement or any other
input prohibited by `02` §4.2. The engine boundary is enforced by the shape of the file, not by
the caller's discipline._

The converse is not claimed. `config` also carries `defaultSeed`, which the engine never reads,
and `Tile.name`, which **D1** guarantees it never reads. C1 is one-directional because **G1** is
one-directional: what matters is what gets _in_.

### 3.2 `rows` and `columns` are flat

They sit directly in `config`, not in a nested `grid` block:

```
config: { rows, columns, defaultSeed, ... }     ✅
config: { grid: { rows, columns }, ... }        ❌
```

A `grid` block is the tempting symmetry — `grid` beside `layout`, matching `02` §7's two-column
table. It loses on two counts. It adds a level of nesting whose only content is two integers.
And it would spend the word _grid_ on a config member, at a moment when `01` open question 1
records that word as already carrying two senses — the `rows × columns` input and the container
type `Grid<TileState>`. No member of this file is called `grid`, so whatever `01` Q1 eventually
decides, it does not reach the file format and no saved file needs rewriting.

### 3.3 What lives where

| Value                                    | Where                 | Read by                  |
| ---------------------------------------- | --------------------- | ------------------------ |
| `rows`, `columns`, `tiles`, `operations` | `config`              | engine                   |
| `assetSalt`, `reseedAssetsOnLoad`        | `config`              | engine (`02` §6.3, §6.7) |
| `defaultSeed`                            | `config`              | caller (`02` §4.1)       |
| `cellSize`, `referenceWidth`, `yOffset`  | `layout`              | renderer                 |
| `horizontalAlignment`                    | `layout`              | editor (`02` §7.3)       |
| `seed`                                   | nowhere — an argument | engine                   |
| `loadSalt`                               | nowhere — an argument | engine (`02` §6.7)       |

Two rows need a word.

**`defaultSeed` is the file's only caller instruction.** Before ADR-002 there were three; the
reversal made `reseedOnLoad` and `reseedAssetsOnLoad` into things the engine reads directly
(`02` §6.7, `04` **O8**). `defaultSeed` remains an instruction to whoever calls `generate()`,
and it lives in `config` rather than in a block of its own because it is the default value of an
engine argument — it travels with what it substitutes for.

**`horizontalAlignment` is read by neither engine nor renderer.** `02` §7 groups it under Layout
and `02` §7.3 states that the renderer never reads it: correct alignment falls out of parity
automatically. It stays in `layout` regardless, because the split this file draws is
_engine / not-engine_, and a third top-level block holding one authoring field would be
nesting for the sake of a taxonomy nothing consumes.

### 3.4 `loadSalt` has no slot

Deliberate, and recorded so the absence does not read as an oversight. `loadSalt` is drawn once
per load by the caller and held (`02` §6.7); writing it into the file would freeze a load that
was supposed to vary, which is the opposite of what the flag requests. A file that wants a fixed
picture achieves it by setting no `reseedOnLoad` flag anywhere, at which point the file is
byte-identical on every load _regardless_ of `loadSalt` (`04` §8.3).

Pinning a particular load — capturing a visitor's render worth keeping — is `(seed, loadSalt)`
written down, not a field. Adding the field later is a new key and therefore a `schemaVersion`
bump (§4.3).

---

## 4. Versioning

### 4.1 `schemaVersion`

**Required. An integer. `2` since ADR-005**, which widened `Operation.target`'s admissible set
(§7) and so changed the set of files this schema accepts — §4.3's rule. It was `1` for the whole
of V1 before that. A `schemaVersion: 1` file is **migrated**, not refused: §4.5 carries the path,
and its v1 → v2 row is §4.3's *nothing to do*.

Absent, non-integer, or naming a version this build does not know **and cannot reach by
migration** → **load failure**. No shape is inferred from which fields happen to be present, and
no attempt is made to read an unknown version optimistically.

**Invariant C2** — _`schemaVersion` is required. A file without one, or with one this build does
not recognize, fails to load. The loader never guesses a version from the fields present._

This resolves `02` open question 5 in the affirmative, on the grounds `02` already gave: the
field costs one integer now, and adding it later leaves every file written before that point
unversioned and indistinguishable — which is precisely the condition it exists to detect.

Failing on an _unknown_ version, rather than attempting the load, follows `05` **X7**. A newer
file read by an older build is the same situation as a config naming a Source that build does
not have, and it takes the same answer: a legible failure beats a plausible-looking wrong
picture.

**An older file is a different situation and takes a different answer.** This build knows what
that version was, and §4.5 says how to get from it to this one — so "unknown" is the wrong word
for it and refusing it would discard a document this build can read perfectly well. The
distinction is load-bearing in the editor: `09` §12.4's *update the editor, not the file* is
right for a newer file and exactly backwards for an older one.

### 4.2 What `schemaVersion` does not do

It versions the file's shape. It says nothing whatever about what that file will render.

`05` §10.1 is emphatic here and it is restated because this is the document a reader would
check: a file can be shape-perfect — every key present, every type correct, `schemaVersion`
matching exactly — and produce a different picture than it did last year, because the engine's
`valueNoise` was tidied up in between. _"It loaded fine"_ is evidence of nothing. Output
stability is the package version's job (`05` **X9**) and there is no field in this file that
can detect it.

### 4.3 What bumps it

One rule, applied without judgement:

**`schemaVersion` increments whenever the set of files this document's schema accepts changes,
in either direction.**

| Change                                                                            | Bumps `schemaVersion`                                                    |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Adding a key anywhere in §5–§8, optional or not                                   | **yes**                                                                  |
| Removing or renaming a key                                                        | **yes**                                                                  |
| Changing a key's type                                                             | **yes**                                                                  |
| Widening or narrowing an admissible range fixed here (`yOffset`, `steps`, `rows`) | **yes**                                                                  |
| Adding a Selection, Source, or Blend                                              | no — the registry resolves names, and `05` **X7** reports an unknown one |
| Changing a registered type's parameter schema                                     | no — validation reports it at the parameter's own path (§7.4)            |
| Changing a registered type's _output_                                             | no — `05` **X9**, a package **major** bump                               |

The line between rows 4 and 5 is the line between what this document **fixes** and what it
**defers to the registry**. Key names and shapes are fixed here, and nothing but a version
number can announce that they moved. Type names and their parameters are resolved through
`05` §5, which already has a precise failure for every case — `UNKNOWN_TYPE_NAME` at the
offending path names the problem better than an integer would.

**On bumping for an optional key.** The permissive reading — an added optional field breaks no
existing file, so charge nothing — is exactly the instinct `05` §10.2 identifies as the trap,
transplanted. A version number that moves only when someone judges the change important is a
version number that does not move. Most bumps will carry a no-op migration, which is the
correct cost: the migration table gains a row saying _nothing to do_, and the loader gains the
ability to say _this file is newer than this build_ instead of _I do not recognize the key
`curve`_.

**A note for `04` §6.2.** That section holds `curve` as `[POSTPONED]` and says adding it later
is _"an optional field, not a break."_ Both are true and they are not in tension: no existing
file is invalidated, **and** the addition is a `schemaVersion` bump under the rule above.
Recorded plainly so the two documents are not quietly at odds.

### 4.4 `engineVersion`

**Required. A string. Never validated against anything.**

**Invariant C3** — _`engineVersion` is advisory. It is written by the editor, never compared
against the running engine, and never gates a load._

It answers one question — _which build made this picture_ — and that question is asked during
diagnosis, months later, by a person looking at a file that renders differently than they
remember. `05` open question 1 recommended it on exactly those grounds and deferred the call
here. Taken.

**Required, though never read**, because an optional advisory field is absent precisely on the
files that most need it: the old ones, written before anyone thought it mattered. Presence is a
shape rule; content is unconstrained. A hand-written regression fixture (`05` §11) may put
anything in it.

**Never validated**, because there are only two things a check could do and both are wrong. It
could refuse to load a file written by a newer build — but the file may be perfectly legal
under the `schemaVersion` it declares, and refusing it substitutes a guess for the check that already
exists. Or it could refuse a file written by an _older_ build — but that is the ordinary case,
it is the one this package's whole versioning story is built to support, and refusing it would
make every published site's config a liability. `schemaVersion` gates loads. This field
gates nothing.

### 4.5 The migration path

§4.3 mentions "the migration table" while defining what bumps the version, and leaves the table
itself undefined because at the time there was nothing to migrate from. ADR-005 supplied the
second shape. This section is that table's contract; `06` §12's `[EXTENSION POINT]` — _"
`schemaVersion: 2` and a migration path"_ — is discharged by it.

```
migrate(file: unknown) -> MigrationOutcome

MigrationOutcome =
  | { kind: "current" }
  | { kind: "migrated",     file: unknown, steps: Migration[] }
  | { kind: "newer",        declared: integer }
  | { kind: "unrecognized", declared: unknown }

Migration { from: integer, to: integer, note: string, upgrade: (file) -> file }
```

**Migration is a separate function from validation, and runs before it.** §9.2 is categorical —
_validation never coerces_ — and rewriting a file's `schemaVersion` is a coercion. Putting it
inside `validate()` would make that rule a rule with an exception, in the one function whose
whole value is that it has none. So `migrate` produces a new value and `validate` sees a file
already claiming the single version it knows. **C5**'s separation of concerns, one layer out.

**It does not validate either.** A migrated file is _shaped for_ this schema, not proven legal by
it. A migration that also validated would make `validate()` reachable by two paths with two
answers, which is the second source of truth **C8** rejects one level down.

**The rows are adjacent and are walked, never indexed.** Each step goes from `n` to `n + 1`, and a
version with no row is `unrecognized` rather than silently skipped to the next row that happens
to fit. A future `2 → 3` row appends and composes; nothing existing changes.

**A no-op row is still a row.** §4.3's own argument applies to the table as much as to the
version number: recording that the answer to _what has to change_ is _nothing_ is a fact worth
carrying, and an omitted row is indistinguishable from an oversight.

**The four outcomes are distinct because they take four different actions**, and conflating two
of them is a real defect rather than a tidiness point. `newer` is the only one where §4.1's
_a legible failure beats a plausible-looking wrong picture_ resolves to **update the build**;
`09` §12.4 words its import screen on exactly that reading, and applying it to an older file
tells an author with a current editor that their editor is at fault.

---

## 5. `TilesetConfig`

```
TilesetConfig {
  rows:               integer ≥ 1
  columns:            integer ≥ 1
  defaultSeed:        string, length ≥ 1
  assetSalt:          uint32                    default 0
  reseedAssetsOnLoad: boolean                   default false
  tiles:              Tile[]
  operations:         Operation[]
}
```

`defaultSeed` is required, per `02` §4.1 as amended: a config must render standalone, and making
the field mandatory removes the null branch rather than handling it. Length ≥ 1 because the
empty string hashes to a legal `uint32` and would render, silently, as a seed nobody chose.

`tiles` and `operations` may both be **empty**. An empty file is the state a fresh editor
document is in, and it generates a grid of `tileId: null` — legal, and renders nothing (**G4**).
Rejecting it would mean the editor cannot save a document until it is finished.

### 5.1 Required, defaulted, and absent

A field is optional **if and only if this document declares a default for it.** Everything else
is required. The complete set of optional fields:

| Field                         | Absent means                                       |
| ----------------------------- | -------------------------------------------------- |
| `config.assetSalt`            | `0`                                                |
| `config.reseedAssetsOnLoad`   | `false`                                            |
| `Operation.salt`              | `0`                                                |
| `Operation.reseedOnLoad`      | `false`                                            |
| `TileAsset.meta`              | `{}`                                               |
| `Mapping.steps`               | continuous, not stepped (`04` §6.2)                |
| A registered type's parameter | its registry default, where one exists (`05` §5.1) |

`steps` is the odd row: its absence is a _meaning_, not a default value, which is why there is
no number in the right-hand column.

**The editor writes every field explicitly** except `steps`. The defaults exist so that
hand-written fixtures stay short, not so that saved files can be sparse.

**`null` is never a way to write "absent".** It is a legal value in exactly one place — a
palette entry's `tileId` (§7.3) — and everywhere else it is a type error. `steps: null` is
invalid; omit the key. This forecloses the ambiguity where a field has three states (present,
null, absent) and only two meanings.

### 5.2 Integers, and why the salts are narrowed

JSON has no integer type. **Integer** here means a JSON number with no fractional part, within
the safe-integer range.

`02` §6.4 and `04` §3 both write `salt: number`. This document narrows both salts to
**integers in `[0, 2³²)`** and rejects everything else.

**Invariant C9** — _`Operation.salt` and `config.assetSalt` are integers in `[0, 2³²)`. A
fractional or out-of-range value is an error, never a truncation._

The narrowing is not fastidiousness about types. Every consumer of a salt truncates it. `04`
§5.2 derives its per-octave salt with `oSalt = salt XOR imul(o + 1, 0x9E3779B1)`, and `XOR`
coerces to `int32` first; the Stage 2 mixer of `02` §6.6 is `uint32` throughout. So:

> `salt: 0` and `salt: 0.5` are the same input. `salt: 3` and `salt: 4294967299` are the same
> input.

The failure this produces is specific and horrible to diagnose. The editor's reroll button
increments a salt; the author clicks it; the config visibly changes; the picture does not. There
is no error anywhere, because nothing went wrong — two different files simply denote the same
number. Rejecting the value at load is the only place this is catchable.

### 5.3 Identifiers

**Every generated identifier — `Tile.id`, `TileAsset.id`, `Operation.id` — matches
`[A-Za-z0-9_-]+`.**

**Invariant C10** — _Identifiers match `[A-Za-z0-9_-]+`. `Tile.id`is unique within the
library;`Operation.id`is unique within the stack;`TileAsset.id`is unique within its Tile.`Tile.name` is unconstrained.\_

Two of the three constraints earn their place for reasons beyond tidiness.

**`Operation.id` uniqueness is a correctness requirement.** `02` §6.3 namespaces hash channels
by `operationId`. Two Operations sharing an id share both channels, so their Sources return
identical values at every cell and their `random` Selections agree everywhere — the correlation
bug `04` §4.3 exists to prevent, arriving from a different direction and with no symptom other
than a picture that looks oddly aligned with itself.

**The colon is excluded for the same reason.** `04` §4.3 builds the selection channel by string
concatenation:

> Operation **A** has `id: "op7"`. Its selection channel string is `"op7:selection"`.
> Operation **B** has `id: "op7:selection"`. Its _source_ channel string is `"op7:selection"`.
>
> Identical strings, hashed identically. B's Source now returns exactly the values that decide
> whether A's `random` Selection includes each cell.

Operation ids and channel strings occupy one namespace, and nothing downstream of the
concatenation can tell them apart. Excluding the separator is the cheapest place to close it.

**The charset costs nothing**, because these identifiers are _generated_, never authored
(`03` §3, `02` §6.3, `01` §11.3). It also removes a portability question: `03` §4.2 orders
assets by comparing ids as UTF-16 code units, and an ASCII-only charset makes that ordering
trivially the same everywhere, with no surrogate pairs to reason about.

`Tile.name` is deliberately unconstrained — not unique, not charset-limited, possibly empty.
This resolves `03` open question 2. **D1** guarantees a name collision cannot reach output, so
the only cost is authoring clarity, and disambiguating two Tiles called _"leaf"_ on screen is
`09`'s problem. Enforcing uniqueness here would make the editor block a rename for a reason the
engine does not care about.

---

## 6. Tiles

```
Tile {
  id:     Identifier
  name:   string
  assets: TileAsset[]        // length ≥ 1
}

TileAsset {
  id:     Identifier          // unique within this Tile
  weight: number ≥ 0, finite
  meta:   object              default {}
}
```

Validation rules beyond the shapes, each of them a rule `03` stated and deferred:

| Rule                            | Source                                                        |
| ------------------------------- | ------------------------------------------------------------- |
| At least one TileAsset per Tile | `03` §4.1 — a Tile with no assets cannot resolve              |
| A Tile's weights sum `> 0`      | `03` §4.1 — an all-zero Tile has no selectable asset          |
| `weight ≥ 0`, finite            | `03` §4.1 — zero is legal and means _listed but never chosen_ |

`TileAsset.id` is unique **within its Tile only**, which is all `03` §4.2's canonical ordering
needs. Global uniqueness is neither required nor forbidden — `03` open question 3 resolved this
and this document confirms it rather than tightening it.

### 6.1 `meta` is a nested block

`03` §4 gives a TileAsset _"renderer-facing metadata, opaque to the engine"_ and defers the
field list to `07`. Three shapes were available and only one survives §9's strictness.

**Spread siblings** — `{ id, weight, src, width, height }` — cannot work. This document does not
know what `07` will put there, so it cannot enumerate the legal keys, so the unknown-key rule
would have to carry a blanket exception at exactly the level where `weight` lives. A metadata
key called `weight` would then shadow the real one, and a typo in a real field would be silently
accepted as metadata.

**A nested `meta` object** keeps strictness universal by quarantining the exception:

**Invariant C4** — _An unrecognized key is an error at every depth. `meta` is the sole
exception: this document validates that it is an object and inspects nothing inside it._

The block is opaque, named, and owned. `07` gets a namespace it can fill without touching this
schema; `06` gets a rule with one exception instead of one level of ambiguity; and `weight`
cannot be shadowed because it is not in the same object.

`meta` is not carried in `TileState` and never reaches the engine — **D2** and **G5** are
unchanged. It travels in the file so that the asset provider of `07` has somewhere to read it
from.

---

## 7. Operations

```
Operation {
  id:           Identifier
  salt:         uint32               default 0
  reseedOnLoad: boolean              default false
  selection:    Selection
  source:       Source
  target:       "tileId" | "scale" | "scaleX" | "scaleY" | "rotation" | "opacity"
  mapping:      Mapping
  blend:        BlendName
}
```

`operations` is an **array, and its order is the stack order** of `02` §9. Order is
semantically significant and is never canonicalized — the opposite rule to a Tile's asset list
(**D3**), and the same rule as a palette (**O6**), for the same reason: reordering changes
output for a reason the author can see (`02` §6.3).

Validation rules across the whole Operation:

| Rule                                                  | Source                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `(target, blend)` is in the accepted set              | `04` §7.2 — validated against the table, not against prose |
| `mapping`'s shape matches the Target's type           | §7.3                                                       |
| Every type name resolves in the registry              | `05` **X7**                                                |
| Every parameter validates against its registry schema | §7.4                                                       |

### 7.1 The tagged shape, and where parameters go

`selection` and `source` are the recursive tagged object `04` §4.5 fixed:

```
Selection { type: string, ...params }
Source    { type: string, ...params }
```

Parameters are **spread siblings of `type`**, which is the opposite of the decision `meta` took
one section earlier. The rule that makes both correct:

> **Spread where the schema knows the keys. Nest where it does not.**

A Selection's parameters are known — the registry declares them (`05` §5.1) and validation
checks them exactly. A TileAsset's metadata is not known to this document at all. Strictness is
possible in the first case and impossible in the second, so the first gets the flat shape and
the second gets a quarantine.

**`type` is reserved in the parameter namespace.** No registered type may declare a parameter
called `type`. Nothing in V1 comes close, but the spread shape makes the collision unstateable
rather than merely unlikely, and it costs one line to say so.

### 7.2 `blend` is a bare string

```
blend: "add"                    ✅
blend: { type: "add" }          ❌
```

No V1 Blend takes parameters. A Blend's `accepts` declaration (`05` §8) and its parameter
schema (`05` §5) live in the registry and are never authored into a file — the config names a
Blend, and everything about that Blend is looked up.

The tempting symmetry is to give `blend` the same tagged object as `selection` and `source`, so
that all three read alike and a future parameterized Blend needs no shape change. It is
rejected: it spends a level of nesting today, on every Operation in every file, buying only the
absence of a `schemaVersion` bump on a change nobody has proposed. When a parameterized Blend
arrives, promoting the string to an object is one bump and one migration — and §4.3 has already
established that bumps are cheap and that avoiding them is not a design goal.

### 7.3 Mapping is one slot, discriminated by `target`

This resolves `04` open question 2. **One slot, two shapes, no tag.**

```
// target type numeric — scaleX, scaleY, rotation, opacity
Mapping { range: [min, max], steps?: integer ≥ 2 }

// target type tile — tileId
Mapping { palette: [{ tileId: Identifier | null, weight: number ≥ 0 }, ...] }
```

Validation reads `target`, looks up its type in `04` §7.2's table, and validates `mapping`
against the corresponding shape strictly. A numeric mapping carrying `palette` is not a "wrong
kind" error; it is an unknown key at `/operations/N/mapping/palette` and a missing key at
`/operations/N/mapping/range`, which between them say precisely what is wrong.

**Invariant C8** — _A Mapping's kind is determined by its Operation's `target`. The file carries
no kind tag._

**Why no tag.** A `kind: "numeric"` field is the obvious defensive move and it is a second
source of truth. Targets are closed (`05` §4.4) and each declares exactly one type, so the tag
can only ever agree with `target` or disagree with it — and on disagreement, validation must
pick a winner, which means writing down which of two fields is authoritative and then
maintaining an error code for the case where the non-authoritative one lied. `05` §4.4 already
closed mapping kinds on the grounds that a third kind needs a third Target type. The tag adds
a failure mode and no expressiveness.

Rules on the shapes:

| Rule                                                                     | Source      |
| ------------------------------------------------------------------------ | ----------- |
| `range` is two finite numbers; `min > max` is legal and reverses the map | `04` §6.2   |
| `steps ≥ 2` — the stepped formula divides by `steps - 1`                 | `04` §6.2   |
| A palette has at least one entry and its weights sum `> 0`               | `04` §6.3   |
| Palette order is authored and preserved; never canonicalized             | `04` **O6** |
| Every non-null palette `tileId` resolves to a Tile in `config.tiles`     | `03` §3.1   |

`tileId: null` is legal in a palette entry and means _clear this cell_ (`02` §8.1, `04` §6.3).
It is the one place in the file where `null` is a value rather than an error (§5.1).

### 7.4 Parameter schemas are data

`05` open question 4 asked whether the parameter schema lives as data or as code alongside
`impl`, and deferred its encoding here. **Data**, and here is the encoding:

```
ParamSchema = { [name: string]: ParamSpec }

ParamSpec =
  | { type: "number",   min?, max?, exclusiveMin?, exclusiveMax?, default? }
  | { type: "integer",  min?, max?, default? }
  | { type: "enum",     values: (string | number)[], default? }
  | { type: "cellList" }
```

Data rather than a validator function, because three consumers need to _read_ it and only one
needs to run it: this document validates against it, `09` builds controls from it, and `05` §11
enumerates the admissible parameter space to test totality. A function can be called but not
walked.

This covers every V1 parameter in `05` §5.1's completeness table — `density` as a bounded
number, `parity` and `axis` as enums, `n` and `octaves` and `offset` as integers,
`cellsPerFeature` as `{ exclusiveMin: 0 }`, `angle` as an unbounded number, `rect`'s four
integers with no bounds at all, and `cells` as the one list type.

**This is not a wire format.** A `ParamSchema` never appears in a `TilesetFile`; it lives beside
`impl` in the registry, is versioned with the package, and crosses no boundary. It is specified
here only because this document is what validates against it.

**Known gap, inherited:** `05` §7 records that Selection composition (`and`, `or`, `not`) needs
a Selection-valued parameter type, which the four specs above do not express. Nothing in V1
requires it. Carried forward in §12, unsolved, exactly as `05` left it.

---

## 8. `Layout`

```
Layout {
  cellSize:            number > 0, finite
  referenceWidth:      number > 0, finite
  yOffset:             number in [0, 1)          required
  horizontalAlignment: "column" | "gutter"
}
```

All four required. `referenceWidth` is stored rather than derived, per `02` §7.2 — it is not
`columns × cellSize`, the difference is the intentional bleed, and a renderer that recomputes it
produces the layout the design marks as wrong.

**On `yOffset` being validated rather than clamped.** `02` §7.4 says it _is clamped_ to
`[0, 1)`. Read that as the constraint the editor imposes on input, not as something the loader
does. This document rejects `yOffset: 1.4` with `OUT_OF_RANGE`; it does not quietly load it as
`0.999…`. §9.2 is the general rule and this is its most tempting exception: a loader that
silently rewrites a value produces a picture the file does not describe, and the author's next
save writes the rewritten value back over their own.

---

## 9. Strictness

### 9.1 An unrecognized key is an error

Not ignored, not preserved, not warned about. An error, at every depth, with `meta` the sole
exception (§6.1).

The failure this prevents is the one this package keeps refusing:

> `"opactiy": 0.5` in a mapping. Under a permissive schema it loads cleanly, the key is
> discarded, opacity stays at its default, and the author is looking at a picture that does not
> match the file they just wrote — with no error anywhere.

That is the shape of `05` §9's rejected graceful degradation, `03` §6.4's insistence on
distinguishing two ways of rendering nothing, and `02` §6.1's objection to load-bearing
invisible state. A silent discard is worse than a stack trace because it produces a
plausible-looking wrong picture, and worse than a blank page because there is nothing to notice.

**Forward compatibility is `schemaVersion`'s job, not the parser's.** A permissive parser buys
the ability to read a newer file — badly, dropping whatever it does not understand. §4.3 buys
the ability to _recognize_ a newer file and say so.

**Accepted, and possibly revisitable.** The cost is real and lands in §4.3's first row: every
added field, however optional, is a version bump. If that proves genuinely obstructive during
implementation, the decision to revisit is this one and not `schemaVersion` — recorded in §13
rather than left to be rediscovered.

### 9.2 Validation never coerces

No clamping, no rounding, no truncation, no substituting a default for a value that is present
but wrong. A field that is present and invalid is an error.

Absent-with-a-declared-default (§5.1) is not coercion: nothing was rewritten, because nothing
was there. The distinction is the whole rule — coercion changes what the author wrote, defaults
supply what they did not write.

This is what makes §5.2's salt narrowing enforceable. Truncating `0.5` to `0` would be the
coercion the whole section exists to catch.

---

## 10. Validation

**Validation is a separate function.** It runs at load, and continuously in the editor.
`generate()` does not validate.

```
validate(file: unknown) -> ValidationError[]        // empty array == valid
```

**Invariant C5** — _Validation is a separate function. `generate()` trusts its input; its
behaviour on an unvalidated config is undefined._

This resolves `03` open question 1 in the direction `03` §3.1 already assumed.

**Why not inside `generate()`.** Validity is a property of the config, and the config does not
change between generations. `02` §9 is `O(rows × columns × operations)`; validation is `O(config)`.
Folding one into the other means paying per generation for a property that could not have
changed — and paying it again on every resize, every reroll, every frame of an editor preview.

**Undefined, not "throws helpfully."** This follows `05` §6.3 exactly, and for the same reason:
the engine has one author, a bad config is that author's, and a defensive re-check inside
`generate()` hides the bug at the point it would otherwise be visible. Development builds may
assert; production builds do neither. **Accepted, not a defect** — an unvalidated config in a
production build produces undefined behaviour rather than a diagnostic. Recorded in the manner
of `02` §10.1.

**`validate` takes a parsed value, not text.** JSON syntax errors belong to whoever called
`JSON.parse`. This matters more than it sounds: the editor holds a live `TilesetFile` in memory
and validates it continuously, and an in-memory value can hold things JSON cannot — `NaN`,
`Infinity`, a function. Finiteness is therefore checked, never assumed from the fact that the
value came out of a file. (`03` **D6** guards _computed_ attribute values at the other end of
the pipeline; this guards authored ones.)

### 10.1 Errors only, no warnings

**Invariant C6** — _Validation produces errors only. A file validates completely or not at all;
there is no partial load and no severity axis._

A warning is a thing a loader must decide what to do with, and there are only two answers.
Ignore it — in which case a load-time function should not have produced it, since nobody is
present to read it. Or fail on it — in which case it was an error and calling it a warning was
a mislabelling that makes the failure look optional.

The editor is a different context: a human is present, they can act, and a diagnostic that says
_this is legal but probably not what you meant_ is genuinely useful there. That is why §10.4
sends every advisory to `09` rather than deleting it.

### 10.2 The shape of an error

```
ValidationError {
  path:    string    // RFC 6901 JSON Pointer
  code:    string    // stable
  message: string    // human-readable, NOT part of the contract
}
```

**Invariant C7** — _Every validation error carries a JSON Pointer path and a stable code.
Message text is not part of the contract and may change freely._

Both halves are load-bearing for `09`. The editor must highlight the offending field, which
requires an address and not a description — `/operations/2/mapping/range/1` locates a control;
_"the second range value in operation 3"_ requires parsing English and counting from one. And
the editor must branch on what went wrong to offer a repair, which requires a code, because
matching on prose means every reworded message is a silent behaviour change in a different
package.

A JSON Pointer rather than a dotted path because arrays are everywhere in this file —
`operations`, `tiles`, `assets`, `palette`, `range`, `cells` — and the pointer syntax indexes
them without inventing a convention.

### 10.3 The V1 codes

| Code                     | Raised when                                                               |
| ------------------------ | ------------------------------------------------------------------------- |
| `SCHEMA_VERSION_MISSING` | `schemaVersion` absent                                                    |
| `SCHEMA_VERSION_UNKNOWN` | present, but not a version this build knows (§4.1)                        |
| `MISSING_KEY`            | a required key absent                                                     |
| `UNKNOWN_KEY`            | a key not in the schema, outside `meta` (§9.1)                            |
| `TYPE_MISMATCH`          | wrong JSON type, including `null` where `null` is not a legal value       |
| `NOT_AN_INTEGER`         | an integer-typed field carrying a fractional or unsafe value              |
| `NOT_FINITE`             | `NaN` or `Infinity` in an in-memory config (§10)                          |
| `OUT_OF_RANGE`           | a value outside its admissible range                                      |
| `INVALID_IDENTIFIER`     | an id not matching `[A-Za-z0-9_-]+` (§5.3)                                |
| `DUPLICATE_ID`           | a `Tile.id`, `Operation.id`, or within-Tile `TileAsset.id` collision      |
| `EMPTY_ASSET_LIST`       | a Tile with no TileAssets                                                 |
| `ZERO_WEIGHT_SUM`        | a Tile's assets, or a palette's entries, summing to zero                  |
| `DANGLING_TILE_REF`      | a palette entry's `tileId` matching no Tile in the library                |
| `UNKNOWN_TYPE_NAME`      | a Selection, Source, or Blend name absent from the registry (`05` **X7**) |
| `INVALID_TARGET_BLEND`   | a `(target, blend)` pair outside `04` §7.2's accepted set                 |

`UNKNOWN_TYPE_NAME` is `05` **X7**'s load failure expressed as a validation error. That is the
whole of X7's enforcement: the engine never substitutes a default because it never sees the
config at all.

The list is not closed — a new rule brings a new code — but a **published code is never
reassigned to different semantics**, on `05` **X8**'s reasoning applied one level down. A
recycled code still matches, still branches, and sends `09`'s repair affordance to the wrong
field.

### 10.4 What is not an error

Four diagnostics look like validation failures and are not. Each describes a **legal** config
that renders exactly as specified, and each belongs to `09`.

| Diagnostic                                                          | Why it is legal                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `columns` parity does not match `horizontalAlignment`               | `02` §7.3 — the field is authoring metadata the renderer never reads. The picture is correct; it is simply not the alignment the author selected during derivation.                                                                                                                                                                                                                                                                                                            |
| `reseedOnLoad: true` on an Operation whose Source is not stochastic | `04` §8.4 — the flag is inert on `constant`, `gradient`, and `vignette`. Nothing misrenders; the control does nothing. Note the flag also moves the Operation's `random` Selection (`04` §8.2), so "non-stochastic Source" is not the same as "no effect".                                                                                                                                                                                                                     |
| A `rect` Selection lying wholly outside the grid                    | `04` §4.2 — a `rect` may deliberately extend past the grid, and cells outside it simply never test true. The Operation contributes nothing, which may be exactly what a resize left behind.                                                                                                                                                                                                                                                                                    |
| `columns × cellSize < referenceWidth`                               | `07` §5.2 — the grid is narrower than the render box, so it is centred with empty margins at the viewport edges rather than bleeding past them. Well-defined and drawn exactly as the file describes. It cannot arise from `02` §7.1, whose parity correction always rounds upward; it arises from a hand-edited or migrated file. §8 validates the four `Layout` fields independently and has no cross-field rule, and adding one would reject a file that renders correctly. |

All four are worth telling an author about. None is worth refusing to load a file over, and the
first two cannot even be stated as errors without contradicting the section that made them
legal.

---

## 11. Invariants summary

| ID      | Invariant                                                                                                                  |
| ------- | -------------------------------------------------------------------------------------------------------------------------- |
| **C1**  | Nothing in `config`, at any depth, is an input `02` §4.2 prohibits. The engine boundary is a property of the file's shape. |
| **C2**  | `schemaVersion` is required. Absent or unknown is a load failure; no shape is inferred from the fields present.            |
| **C3**  | `engineVersion` is advisory. Never validated against, never gates a load.                                                  |
| **C4**  | An unrecognized key is an error at every depth. `meta` is the sole exception and is inspected only for being an object.    |
| **C5**  | Validation is a separate function. `generate()` trusts its input; behaviour on an unvalidated config is undefined.         |
| **C6**  | Validation produces errors only and never coerces. A file validates completely or not at all.                              |
| **C7**  | Every error carries a JSON Pointer path and a stable code. Message text is not part of the contract.                       |
| **C8**  | A Mapping's kind is determined by its Operation's `target`. The file carries no kind tag.                                  |
| **C9**  | `Operation.salt` and `config.assetSalt` are integers in `[0, 2³²)`.                                                        |
| **C10** | Identifiers match `[A-Za-z0-9_-]+` and are unique within their scope. `Tile.name` is unconstrained.                        |

---

## 12. Extension points

| Point                                                                                       | Status                                                                                                                          |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion: 2` and a migration path                                                     | **Discharged** — ADR-005 supplied the second shape; §4.5 carries the table and the v1 → v2 row is §4.3's _nothing to do_        |
| Parameterized Blends — `blend` promoted to `{ type, ...params }`                            | `[EXTENSION POINT]` — one bump and one migration (§7.2)                                                                         |
| `curve` on a numeric mapping                                                                | `[EXTENSION POINT]` — an added key, therefore a bump; not a break (§4.3, `04` §6.2)                                             |
| Selection-valued parameters in `ParamSchema`                                                | `[EXTENSION POINT]` — required before `and` / `or` / `not` can be registered (§7.4, `05` §7)                                    |
| `layout` becoming `layouts`, keyed by `minWidth`                                            | `[EXTENSION POINT]` — a bump; the term _breakpoint_ is reserved for it (`02` §12)                                               |
| A machine-readable schema artifact (JSON Schema or equivalent) generated from this document | `[POSTPONED]` — §10.3's codes and paths are the contract; a second encoding of the same rules is a second thing to keep in sync |
| Relaxing §9.1 so that added optional keys need no bump                                      | `[POSTPONED]` — the cost is recorded in §9.1 and revisited in open question 4                                                   |

---

## 13. Open questions

| #   | Question                                                                                        | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Does the config carry `schemaVersion`? (`02` Q5)                                                | **Resolved** — §4.1. Required, an integer; `1` for V1, `2` since ADR-005. Absent, or unknown and unreachable by §4.5's migration, is a load failure.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2   | Does the config record the engine version that wrote it? (`05` Q1)                              | **Resolved** — §4.4. Yes, required, and advisory only (**C3**).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 3   | Does the engine validate, or trust a validated config? (`03` Q1)                                | **Resolved** — §10. A separate `validate()`; `generate()` trusts. Behaviour on an unvalidated config is undefined (**C5**).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 4   | Should unknown keys be rejected?                                                                | **Resolved — §9.1, and flagged as the decision to revisit.** Rejected. The cost is that every added key is a `schemaVersion` bump (§4.3). If that proves obstructive in implementation, this is the decision to reopen, not `schemaVersion`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 5   | Is `Mapping` one slot or two exclusive fields? (`04` Q2)                                        | **Resolved** — §7.3. One slot, discriminated by `target`, no kind tag (**C8**).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 6   | Is `Tile.name` unique? (`03` Q2)                                                                | **Resolved** — §5.3. No. **D1** means a collision cannot reach output; disambiguation is `09`'s.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 7   | Are `TileAsset.id` values unique per Tile or globally? (`03` Q3)                                | **Resolved** — §6. Per Tile. Confirmed, not tightened.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 8   | Does the parameter schema live as data or as code? (`05` Q4)                                    | **Resolved** — §7.4. Data, in the encoding given there. Not a wire format.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 9   | Is `TilesetConfig` a fixed type name? (`01` Q4)                                                 | **Resolved** — §3. Fixed, alongside `TilesetFile` and `Layout`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 10  | Does `Grid`'s two senses (`01` Q1) reach the file format?                                       | **Resolved for this document; the underlying question stays open.** §3.2 — no member of the file is called `grid`, so whatever `01` Q1 decides costs no saved file a rewrite. The type-name ambiguity in `02` §3 and §8 is untouched and still needs an explicit decision.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 11  | Does `everyNth`'s `(coord − offset) mod n == 0` misbehave under JS `%` for a positive `offset`? | **Resolved — no, and no constraint on `offset` is needed.** JS `%` is a remainder and differs from true modulo in sign only; a remainder is zero exactly when the divisor divides the dividend, so `a % n === 0` and `a mod n === 0` agree for every integer `a` — including where `coord − offset` is negative, since `-0 === 0`. Recorded because the next reader will have the same worry. **The residual hazard is real but elsewhere:** `checkerboard` compares against a _non-zero_ residue (`(cx + cy) mod 2 == parity`, `04` §4.2), where the two operators genuinely diverge, and is safe only because `cx + cy ≥ 0`. Any future predicate testing a non-zero residue over a possibly-negative operand must use a true modulo. `04` owns the note. |
| 12  | Should `06` ship a machine-readable schema artifact rather than prose plus a code table?        | **Open.** §12 holds it `[POSTPONED]` on the grounds that two encodings of one rule set drift. Revisit if hand-written validation proves error-prone during implementation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
