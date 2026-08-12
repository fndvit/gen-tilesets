# ADR-005 — A uniform `scale` attribute

> **Status:** Accepted
> **Date:** 2026-08-12
> **Affects:** `03-domain-model.md` §5.4, §5.5 (**D7**), Q5; `06-config-schema.md` §7;
> `07-render-contract.md` §10.1; `09-editor.md` §7.5
> **Raised by:** using the editor
> **Amended 2026-08-12:** the `schemaVersion` section below was wrong twice — see
> *Correction* at the end. The attribute, the composition rule, and the bump itself all stand.

---

## Context

`03` §5.4 rejected the single `scale` of `02`'s provisional attribute set:

> The single `scale` of `02`'s provisional set cannot express a flip, which is a basic tileset
> primitive — a leaf that only ever points one way is half a leaf.

The split into `scaleX` and `scaleY` is correct and this ADR does not touch it. What the split
also did, silently, was remove the ability to say *make this bigger* in one gesture. Every
uniform scale is now two authored numbers that must be kept equal by hand, in two places, for
the life of the document.

**Two Operations cannot substitute.** The obvious editor-side workaround — offer "uniform scale"
in the UI and commit an Operation targeting `scaleX` beside one targeting `scaleY` — is wrong
for a reason that is not a UI reason. **G3** attaches an Operation's randomness to its
`operationId`, so the two Operations hash on different channels: under a `random` Source they
draw *different* numbers and the axes disagree, cell by cell. The workaround produces uniform
scale only under `constant`, which is the one case the author could already have typed by hand.

Two authored Operations have the same problem and additionally cost two rows in the stack, two
salts, and two of everything at edit time.

`03` **D7** closes the attribute set, and `05` §108-110 is explicit that an addition is "a
coordinated change across `03`, `06`, `07`, and `08` — a schema change, not a registration". So
this cannot be done quietly, and this document is the record.

## Decision

Add a fifth attribute, `scale`: domain any finite number, default `1`, bounding `none` — the
same three answers `scaleX` and `scaleY` give, for the same reasons.

It **composes with** `scaleX`/`scaleY` rather than replacing them. The renderer folds it into
the same matrix:

    S(scaleX · scale, scaleY · scale)

Flip stays a negative `scaleX`, non-uniform scale stays two axes, and `03` §5.4's rejection of a
`flipX: boolean` is untouched — nothing here introduces a second type, so `04` §7.2's two-type
Blend model still holds and no Blend has to declare anything new.

### It is a row at ordinal 1, not a new ordinal

`07` §10.1 assigns `scaleX` and `scaleY` a shared ordinal, and says why:

> `scaleX` and `scaleY` share an ordinal because they are one matrix; they are separate
> attributes for the reason `03` §5.4 gives and not because they compose separately.

A uniform factor multiplied into `S` commutes with the axis factors, so `scale` is a third row
at that same ordinal rather than a new position in the composition order. **D11** — scale before
rotation, both about the drawable box's centre — is unaffected, and so is every existing
transform. At `scale = 1` the matrix is arithmetically identical to the one it replaces.

### `schemaVersion` moves to 2

`06` §4.3's rule is *"`schemaVersion` increments whenever the set of files this document's schema
accepts changes, in either direction"*, and it does: `Operation.target`'s admissible set gains
`"scale"` (`06` §7). A file using it was not accepted before and is now.

That is the **whole** of this ADR's reach into the file. No key is added, removed, renamed or
retyped anywhere in `06` §5–§8. So the widening is pure, every legal v1 file is already a
structurally legal v2 file, and the migration is `06` §4.3's *no-op* row: stamp the version and
change nothing else. The reverse does not hold — a v2 file using `target: "scale"` is illegal
under v1 — which is exactly what the bump exists to signal, and `05` **X7**'s legible failure
rather than a plausible-looking wrong picture.

The migration path is `06` §4.5 and `packages/tileset/src/migrate.ts`. It runs **before**
`validate()`, because §9.2 forbids validation from coercing anything and rewriting a version is a
coercion.

## Consequence

- **`03` **D7** still holds.** The set is closed at runtime; this is a schema change made
  through the door `05` §108-110 describes, not a registration through a door that does not
  exist. `03` Q5 ("Is the V1 attribute set final? *Resolved — final for V1*") is reopened by
  this document and should be read against it.
- **Generated output does not move.** No attribute name, count, or `ATTRIBUTES` key order feeds
  the hash — its inputs are `(effectiveSeed, channel, x, y, salt)` — and the weight walk is over
  a Tile's assets. For any config that does not target `scale`, every `tileId`, `assetId`,
  `scaleX`, `scaleY`, `rotation` and `opacity` is byte-identical. `Grid<TileState>` does gain a
  field, but that is the *engine's output type* and `05` **X9**'s territory — not something
  `schemaVersion` versions or can detect (`06` §4.2).
- **No vector table is regenerated.** All five are still ungenerated. When the transform table of
  `07` §11.3 is generated it will carry `scale` rows; the multiplicative fold is what guarantees
  its `scale = 1` rows are the ones that would have been generated without this change. ADR-004
  governs regeneration until 1.0.0 either way.
- **`multiply` is accepted on `scale`, with no veto.** `rotation` vetoes it because `04` §7.2's
  reasoning does not survive a wrapped angular domain. A uniform scale is the case where a
  multiplying Blend is the natural one: stacking two Operations each scaling by 0.9 should give
  0.81, which is what `multiply` means and what `set` cannot express.
- **The editor's authoring track is `[0, 4]`, soft**, not the `[-2, 2]` of the axis tracks. A
  negative *uniform* scale flips both axes, which is a 180° rotation rather than a flip, so the
  useful range starts at 0. `soft` keeps the domain open, per `03` §5.4's refusal to invent a
  maximum.

---

## Correction — 2026-08-12

The `schemaVersion` reasoning above was wrong in two ways. Both were caught the first time an
author tried to open a file written before this ADR. The attribute, the composition rule, and the
bump are unaffected; what follows is what replaced the argument for them.

**It was justified on the wrong grounds.** The original text read: *"`03` §8 and `05` §4.1 gate an
attribute addition on a bump, and `TileState` gains a field, so this is that bump."* But
`TileState` is `generate()`'s **output** and appears nowhere inside a `TilesetFile` — `06` §4.2 is
explicit that `schemaVersion` *"versions the file's shape. It says nothing whatever about what
that file will render"*, and §4.3's nearest row makes a registered type's output change **no
bump**, because that is `05` **X9**'s job. The bump is correct, but for the reason now given
above: the `target` enum widened, and `06` §4.3's rule is about the accepted set.

**"No v1 compatibility path" had no support anywhere.** `06` §4.3 says the opposite in the same
paragraph that justifies bumping — *"Most bumps will carry a no-op migration, which is the correct
cost: the migration table gains a row saying nothing to do, and the loader gains the ability to
say this file is newer than this build."* Every migration reference in `spec/` and `attic/` pairs
a bump with a migration; none sanctions refusing old files. The original argument was from
expedience — *import does not exist yet, nothing has been released* — which is a reason to defer
work, never a reason to call the deferred work unnecessary.

**It produced a user-facing defect.** `09` §12.4 defines `SCHEMA_VERSION_UNKNOWN` as meaning the
file came from a **newer** build, action *"update the editor rather than to fix the file"*. With
no migration it fired on **older** files instead, telling an author whose editor was perfectly
current that the editor was at fault. The two cases are now distinguished by `migrate()`'s
outcome rather than inferred from an error code that covers both.
