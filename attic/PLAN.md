# PLAN.md

Build order and sequencing. Deliberately **not** in `/spec` — `roadmap.md` §3.3 keeps schedule and
priority out of the specification, and this file exists so that rule can hold.

Derived from `audit/a-engine.md`, `audit/b-render.md`, `audit/c-editor.md` and session D's four
sweeps. It resolves no under-determination; it orders the work and names what blocks it.

**Units are identified by ID, never by ordinal.** `U-A*` are `a-engine` §5's, `U-B*` are
`b-render` §5's (numbered 1–10 there, prefixed here), `U-C*` are `c-editor` §5's. The **Order**
column carries the build ordinal and is the only thing that moves when the sequence changes. Every
cross-reference in this file, in the ledger, and in `test/untestable.md` names an ID.

**`U-B*` assignment** — `b-render` §5 numbered its units without a prefix. In that file's order:
`U-B1` validate() and the error vocabulary · `U-B2` file and config types · `U-B3` coordinate
mapping · `U-B4` geometry vector table · `U-B5` transform composition and applier dispatch ·
`U-B6` transform vector table · `U-B7` `<Tileset>` component · `U-B8` provider and error channel ·
`U-B9` caller policy and the render session · `U-B10` the draw path.

**Standing marker `†`** — every citation of `00` §10.1 is marked. Sweep 3 found that section's
**last row** stale in all three of its claims. Its other rows, including the `gradient` row, are
separate rows and are not implicated. The marker exists so no reader takes a `00` §10.1 cite as
safe or as broken without checking which row it points at.

---

## §0. Decisions that must precede code

**The rule dividing §0 from the under-determination census.** The census (session D's consolidated
reply) carries all fifty-eight entries and is the complete list; it routes nothing and prioritises
nothing. **§0 carries an entry if and only if both hold: (a) a named unit or milestone cannot start
or cannot ship without it, and (b) deferring it past that point is irreversible, or costs a major
bump.** Criterion (b) is what keeps §0 short — an entry someone can decide later at ordinary cost is
not a sequencing fact and belongs to the census only. **§0 is a subset, never a substitute.**
Routing to the `spec-amendment` skill is stated here and nowhere else in this file.

Twenty-five entries meet both criteria: seven in §0.1, four in §0.2, five in §0.3, seven in §0.4,
two in §0.5.

### §0.1 Frozen by `U-A2` — the hash and `mixLoad` tables

Once `U-A2` runs, `02` §6.6's prose stops determining behaviour and the table starts.

| Entry | Settled before | Why irreversible |
| --- | --- | --- |
| **A-1** — Stage 1 / Stage 2 constants, fold order, finalizer variant | `U-A1` | A row records `input → output` and cannot be inverted. Afterwards nothing in the package records which family member was chosen, so a later reader cannot distinguish a deliberate constant from a typo. |
| **A-2** — `mixLoad`'s round, constants, operand assignment | `U-A1` | Ships its own rows in the same table (`02` §6.7); a multiply-xor-shift round is not symmetric and the spec does not say which operand is multiplied. |
| **A-3** — `charCodeAt` vs `codePointAt` for the seed string | `U-A1` | Changes every row whose seed leaves the BMP, and `02` §6.6 invites author-chosen strings. Channel half resolved (A-S7). |
| **A-4** — `salt`'s sign at the Stage 2 boundary; the table's `salt` column | `U-A1` | A published column. The same row printed as `int32` and as `uint32` is two different tables of one function. |
| **A-27** — key and channel column types; whether the pre-division `uint32` is exported | `U-A2` | Determines whether the table freezes Stage 1 at all, or only Stage 2. |
| **A-14** — which text is **X10** (`05` §11.1 vs `05` §12) | `U-A2` | Determines how many artifacts `vectors:check` must cover — two, three, or five. |
| **A-20** — what authorises a regeneration during `0.x` | `U-A2` | `05` §11's gate is a major-bump rule; `05` §10.3 puts all of V1 at `0.x` where no bump kind binds. Without an answer the freeze has no release valve for the entire build. |

### §0.2 Frozen by `U-A14` — the reference configs

`U-A14` snapshots a strictly larger surface: `05` §11.1 names `valueNoise`'s smoothstep and bilinear
weighting, `gradient`'s projection, the palette walk, and bounding order as what the hash table
cannot catch.

| Entry | Settled before | Why irreversible |
| --- | --- | --- |
| **A-5** — `vignette` is unpinned; no `[0,1)` totality argument | `U-A8` | *Normalized elliptical distance* names a family exactly as *Perlin* does — `04` §5.3's own objection, unanswered for `vignette`. **X6** forbids `1.0` and nothing proves the bound. |
| **A-7** — `valueNoise`'s bilinear arrangement | `U-A8` | Algebraically identical, not bit-identical. `05` §11.1 names it as uncaught, and it is the one line of the block not written out. |
| **A-18** — `gradient`'s `cos`/`sin` | `U-A8` | `U-A14` snapshots whatever `Math.cos` returned on the generating machine. `00` §10.1's `gradient` row†: *"the first thing implementation forces."* |
| **A-6** — weight-walk and palette-walk summation order | `U-A4`, `U-A9` | `05` §11.1 places the cost squarely on the reference configs; `03` §4.2 pins the walk order and not the total's. |

### §0.3 Frozen by `U-B4` and `U-B6` — the renderer tables

| Entry | Settled before | Why irreversible |
| --- | --- | --- |
| **B-7** — **R15** says *exact* and fixes no sampling, encoding or tolerance | `U-B4` | `07` §8.3 accepts that a point on a shared edge *"may land on either side of it depending on the width."* A row sampling a boundary point freezes an indeterminacy as normative. |
| **B-10** — **R15**'s artifact has no location, format or regeneration procedure | `U-B4` | The same missing release valve as A-20, one layer over. |
| **B-8** — the two tables compose nowhere | `U-B6` | The transform table takes `cellBox` as an *input*, so a wrong `cellBox` never surfaces there. Adding a composed column later is a table change. |
| **B-6** — nothing binds the CSS transform list to the tested six-tuple | `U-B6` | Both `07` §6.3 and `08` §6.3 predict the inversion in advance, and the table that exists to catch transform order cannot see it. |
| **B-9** — `07` §6.2's transcendentals are named by no document | `U-B6` | Its output feeds an *exact* table; drift is an **R14** major bump that nothing detects. `04` Q9 and `05` Q3 both name the engine side only. |

### §0.4 Structural, and cheap only while V1 is being written

| Entry | Settled before | Why |
| --- | --- | --- |
| **A-10** — `Grid<TileState>`'s container shape and index order | `U-A5` | Public surface: `07` and `08` consume it and `08` **S1** exports one component against it. Not private to the engine. |
| **B-5** — whether `08` §6.3 is the draw path or an illustration | `U-B3` | Decides what **R1** is testable against. A second algebra written now is a second algebra forever. |
| **B-15 / C-16** — dev vs production build | `U-A15` | **Three** consumers, not two: `05` §6.3, `07` §4.3, `09` §12.1. **E15**, **R3** and **S6** rest on it, and the three must get **one** answer or the invariants disagree at their boundaries. |
| **C-6** — where `engineVersion`'s string comes from | `U-C20` | A repository-layout decision (`c-editor` §5.4). Retrofitting one resolution path after two exist is a workspace migration. |
| **`roadmap` §4.3 — author-controlled cropping** | `U-B8` | **The build trips this by omission.** With a centre-square default the feature is free forever; without it, its later arrival moves drawn output and is a **major renderer bump** permanently. Doing nothing is the expensive choice and the row does not say so. Depends on C-S5, carried unresolved. |
| **`roadmap` §4.3 — reserved names** (`srcset`, `sources`, `markup`, `inline`) | `U-B7`, `U-B8` | A reserved name is only reserved if V1 honours the reservation. `01` §10.2 owns the list and is unread (C-S28). |
| **A-11 / C-1** — `selection()`'s status | `U-A13` | Not code-blocking; sweep 1 settles it as V1. But `roadmap` §4.1 and `00` §4.5 both misclassify it, and a build trusting either will sequence it as deferred. |

### §0.5 Package integrity — blocks the port to `/spec`, not a unit

Two entries whose milestone is not a unit. Both must close before any spec document is amended,
because both change what an amending pass is amending against.

#### `_harvest.md` — cited as authority by three documents, absent from the repository

`00` §10.2, `09` Q11 and `01` Q9 each cite `_harvest.md` as the source of a correction or a
structural gap. `find` over the repository returns nothing. Five copies live outside it in
`../specs-versions/`.

**Canonical copy: `0608-0942/_harvest.md`.** Established by content comparison, not recency — the
file's *"Append-only… Never rewritten, never summarized"* preamble is **false of the file itself**:
four of five transitions rewrite it, and `0408-1352 → 0408-2230` replaces 26 contiguous lines and
deletes two. Recency is therefore not sufficient evidence and was not used. The evidence that is:

1. **Strict content superset.** Non-blank lines present in an older copy and absent from
   `0608-0942`: 33, 6, 4, **0**. Every one inspected is header prose rewritten in place, or a block
   heading whose retirement marker was updated (`## 09-editor.md — harvested into 01, 2026-08-05`
   → `… · harvested into roadmap, 2026-08-06`) — the documented mechanism under *How a block is
   retired*. **No block body is lost in any transition.**
2. **The last transition is a pure append** — `383a384,488`, adding the `00-overview.md` block and
   nothing else.
3. **The appended block declares terminality**: *"no marker: no harvest follows this block"* — `00`
   is the last document written and the last of the three harvests, so by the file's own rules no
   later copy can exist.
4. **Independent corroboration against the repo**: the block's correction table already carries the
   **D3** correction that `00` §10.1 records as owed,† agreeing with A-22 and `c-editor` §1.3,
   which reached it from `01` §13.

**What must be decided, and is not decided here.** Whether `_harvest.md` enters the repository, or
the three citations are amended to point elsewhere. The choice is not free in either direction:

- **Entering the repo** makes `00` §8.5's tombstone discipline and `01` §11.4's append-only rule
  apply to a file that has already violated the weaker version of that rule four times, and imports
  its header history as tombstones.
- **Amending the three citations** requires a destination for each. `00` §10.2's is a count; `09`
  Q11's is a correction the `00` block carries verbatim and `09` Q11 restates; `01` Q9's is a
  structural argument about invisible absence — which the file makes about itself and which no
  other document makes.
- **Doing neither is what has already happened three times.** `c-editor` §1.1 records `roadmap.md`
  missing from `spec/` while three harvest passes ran against it, and `01` Q9 names the shape —
  *"The absence is invisible by construction."* This is that incident's third instance and the
  first where the missing file is the one the package uses to count its own stale claims.

**Also found here, and carried to §7's amendment list:** the *Authoring resize* row is byte-identical
in all five copies and sits in the `07-render-contract.md` block, which is marked *harvested into
01, 2026-08-05*. It still reads *"The author **drags** the design page width."* `01` §6.1's row is
its descendant — drag removed, `cellSize` and `horizontalAlignment` never added. **The abbreviation
defect in the glossary is inherited from a retired harvest block that still carries the withdrawn
premise.**

**Blocks:** every amendment in §7, because two of them trace to a harvest block in this file, and an
amending pass cannot cite a document it cannot open.

#### `00` §10.2 — whether it should carry a total at all

The count went fourteen → twenty (§7). **All six new instances were produced by passes auditing for
the pattern**, matching §10.2's own observation that four of its original fourteen were.

The `00` block in `_harvest.md` records that the alternative was already considered and cut:

> a fourteen-row register of §10.2's instances, one row per instance, was considered and cut in
> favour of a table of *sites* — where the instances are recorded, and how many each site holds.
> The register would have made `00` the owner of rows no other document carries, which is
> authorship, and §1.1 forbids it.

The register was cut. **The total survived, and nothing records why it survived the argument that
killed the register.** The framing for the amendment session, stated and not decided: the *sites*
are checkable by opening them and stay true; the *total* is a claim with a short half-life,
incremented by every pass including the ones auditing for it, and stale from the moment it is
written — which is the property §10.2 exists to name. Whether the section keeps a number, keeps
only sites, or keeps a number marked as a floor rather than a count, is the decision. **Session D
does not take it.**

### Routing

Each of the twenty-five goes to the `spec-amendment` skill — proposed, confirmed, then applied, one
at a time, never as a step inside a larger task. §0.1 and §0.2 additionally go through
`regression-vectors` at generation time. **§0.5 closes before any other amendment is applied.** No
unit in §1 may start on a row that names it here until that row is closed.

---

## §1. Pure and browser-free

`packages/tileset` only; runs under `pnpm --filter @tileset/core test`. **Discharges** names only
invariants a test discharges under that ID. **Honours** names postures the unit keeps, whose
residues are tested under other names. The two are disjoint from `test/untestable.md` §1 by
construction — `pnpm invariants` check C2.

| Order | ID | Unit | Source | Discharges | Honours | Blocked on |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `U-B2` | File & config types | `06` §3–§3.4 | — | **C1**, **C5** | — |
| 2 | `U-A6` | `ParamSpec` encoding & the registry | `06` §7.4; `05` §5, §5.1, §6.1, §7, §8 | **X4**, **X5**, **X7** | **X1**, **X8** | — |
| 3 | `U-A1` | Hash core | `02` §6.6, §6.7; `04` §4.3 | — (substrate) | — | §0.1 |
| 4 | `U-A2` | **Hash + `mixLoad` vector tables, `vectors:check`** | `02` §6.6, §6.7; `05` §11 | **X10** (first half) | — | `U-A1`; §0.1 |
| 5 | `U-A3` | Attribute table, bounding, non-finite rejection | `03` §5.1–§5.4, §5.6 | **D4**, **D5**, **D6**, **D8** | **D7** | A-8 |
| 6 | `U-A4` | Tile, TileAsset, the weight walk | `03` §3, §4.1–§4.3; `02` §10 | **D1**, **D2**, **D3** | — | `U-A1`, `U-A3`; §0.2 |
| 7 | `U-A5` | `TileState`, initialization, null semantics | `02` §8, §8.1; `03` §6, §6.1, §6.4 | **G4**, **D9**, **D10** | — | `U-A3`; §0.4 |
| 8 | `U-A7` | Selection presets | `04` §4.2–§4.5 | **O2**, **O3** | — | `U-A1`, `U-A6` |
| 9 | `U-A8` | Source presets | `04` §5.2–§5.4; `05` §6.2, §6.4 | **O4** | — | `U-A1`, `U-A6`; §0.2 |
| 10 | `U-A9` | Mapping | `04` §6.1–§6.4 | **O1**, **O5**, **O6** | — | `U-A3`; §0.2 |
| 11 | `U-A10` | Blend & Target tables | `04` §7.1–§7.3; ADR-001; `05` §8 | **O7** | **X2** | `U-A3` |
| 12 | `U-A11` | `generate()` and the evaluation loop | `02` §4, §5, §9; `04` §3.1 | **G1**, **G2**, **G3** | **G5** | `U-A3`–`U-A10`; A-9, §0.4 |
| 13 | `U-A12` | Effective seed wiring | `02` §6.7; `04` §8; ADR-002 | **O8** | — | `U-A1`, `U-A11` |
| 14 | `U-B1` | `validate()` and the error vocabulary | `06` §5–§10 | **C2**, **C3**, **C4**, **C6**, **C7**, **C8**, **C9**, **C10** | — | `U-B2`, `U-A6`; B-12 |
| 15 | `U-A13` | `selection()` export *(= `U-C4`)* | `02` §12; `09` §6.2 | — (**E8**'s precondition; discharged with `U-C6`) | — | `U-A7`, `U-A12`; §0.4 |
| 16 | `U-A14` | **Reference configs** | `05` §11.1 | **X10** (second half) | — | `U-A11`, `U-A12`; §0.1, §0.2 |
| 17 | `U-A15` | Dev-build totality assertion & Source sweep | `05` §6.3, §3.1 | **X6** | — | `U-A8`; A-16, A-17, §0.4 |
| 18 | `U-B3` | Coordinate mapping — `cellBox`, `cellAt` | `07` §5.2, §5.3, §8.1–§8.3; `08` §7 | **R5**, **R6**, **R11**, **S10** | **R1** | `U-B2`; §0.4 |
| 19 | `U-B4` | **Geometry vector table** | `07` §11.3 row 1 | **R15** (first half) | — | `U-B3`; §0.3 |
| 20 | `U-B5` | Transform composition & applier dispatch | `07` §6.1, §6.2, §10.1, §10.2 | **R7**, **R13**\* | — | `U-B3`; B-16 |
| 21 | `U-B6` | **Transform vector table** | `07` §11.3 row 2 | **R15** (second half), **D11** | — | `U-B5`; §0.3 |

\* narrowed artifact — `test/untestable.md` §2.

## §2. Browser

| Order | ID | Unit | Source | Discharges | Honours | Blocked on |
| --- | --- | --- | --- | --- | --- | --- |
| 22 | `U-B7` | `<Tileset>` component | `08` §3, §4, §4.1, §4.5, §6.1, §6.2 | **S1**, **S5**, **S8**, **S9** | **S3** | `U-B2`, `U-A11`, `U-B3`, `U-B5`; §0.4 |
| 23 | `U-B8` | Provider & error channel | `07` §4.1–§4.5; `08` §4.2–§4.4 | **R3**, **S6** | **R2**, **R4** | `U-B7`; B-14, §0.4 |
| 24 | `U-B9` | Caller policy & the render session | `07` §9–§9.4; `08` §4.1, §5–§5.2 | **R12**, **S4**, **S7** | — | `U-B7` |
| 25 | `U-B10` | The draw path — crop, clip, paint order | `07` §6.4, §7.1–§7.4; `08` §4.2, §6.2, §6.3 | **R8**\*, **R9**\*, **R10**\* | — | `U-B3`, `U-B5`, `U-B7`; B-11 |

## §3. Editor

`apps/editor`. A host, not a caller (`08` §3.1, **S2**).

| Order | ID | Unit | Discharges | Honours | Blocked on |
| --- | --- | --- | --- | --- | --- |
| 26 | `U-C1` | Document core & edit vocabulary | **E5** | **E3** | `U-B2`, `U-B1`; C-3 |
| 27 | `U-C2` | Undo stack | **E6** | — | `U-C1`; C-2 |
| 28 | `U-C3` | Identifier generation | **E1** row 3 (with `U-C21`) | — | `U-B1` |
| 29 | `U-C20` | **E2** pinning — one package, one dependency entry | — | **E2** | §0.4 (C-6) |
| 30 | `U-C5` | Preview host | — | **S2** *(reassigned, sweep 4)* | `U-B7`, `U-C1` |
| 31 | `U-C7` | `ParamSchema`-driven controls | **E9** | — | `U-A6`, `U-C1`; C-4 |
| 32 | `U-C6` | Selection overlay | **E8** (with `U-A13`) | **E7** | `U-A13`, `U-B3`, `U-C5` |
| 33 | `U-C8` | `cellList` brush | — | — | `U-B3`, `U-C5` |
| 34 | `U-C19` | Asset error surface | — | — | `U-B8`, `U-C5` |
| 35 | `U-C9` | Numeric mapping control & authoring ranges | — | — | `U-C7`; C-13, C-S13 |
| 36 | `U-C12` | Seed, salts, reroll, load preview | **E10**, **E1** row 6 (with `U-C21`) | — | `U-A12`, `U-C1`; C-12, C-S3, C-S18 |
| 37 | `U-C13` | Layout authoring | **E11**, **E12**, **E1** rows 1–2 (with `U-C21`) | — | `U-C1`, `U-C2` |
| 38 | `U-C14` | Tile library, asset attach, editor provider | **E13**, **E4** (attach half) | — | `U-B8`, `U-C19`; C-8, C-9, C-14, C-S5, C-S21 |
| 39 | `U-C10` | Palette builder | — | — | `U-C14` |
| 40 | `U-C11` | Blend control | — | — | `U-A6`, `U-A10` |
| 41 | `U-C15` | Export | **E14**, **E4** (export half), **E1** row 4 (with `U-C21`) | — | `U-C20`, `U-C14`; C-8 |
| 42 | `U-C17` | Advisory diagnostics | **E16** | — | `U-C1`; C-7, C-S27. **Exit criterion: C-S22** — see below |
| 43 | `U-C18` | Import screen | — (**E15**'s import half) | **E15** | `U-B1`; C-11, C-S23 |
| 44 | `U-C21` | **E1** conformance suite | **E1** | — | `U-C3`, `U-C12`, `U-C13`, `U-C14`, `U-C15` |

`U-C16` is a withdrawn tombstone (`c-editor` §5.1), carried here as one per `00` §8.5 — a gap in the
IDs would read as a lost unit.

### Units carrying no invariant, each with its reason

Sweep 4 confirmed all five ownership claims. One excuse failed (`U-C5`) and was converted; two gained
a residue.

- **`U-C8`** — `cellAt`'s correctness is `07` §8.2 / **S10**'s, discharged at `U-B3`. **Acceptance
  criterion gained by session D:** the pointer-event → render-space conversion, which `07` §8.2
  assigns to the caller and calls *"the single most likely place to get this wrong"*, and which no
  invariant covers. Test: a synthetic pointer event at a known client offset maps to the cell
  `cellBox` places there, for a render box with a non-zero page offset.
- **`U-C19`** — the channel is **S6**'s and the empty cell is **R3**'s, both at `U-B8`; `09` §12.3
  adds a prohibition riding on both and no assertable behaviour of its own. The unit exists because
  the surface is editor UI that someone must build.
- **`U-C9`** — `09` §7.5 states its own `[−2, 2]` figure is *"a UI constant with no authority
  anywhere"*; the presentation is `04` §6.1's. C-S13 is resolved only in part.
- **`U-C10`** — presentation only; order semantics are **O6**'s (`U-A9`) and asset ordering is
  **D3**'s (`U-A4`), which take deliberately opposite rules.
- **`U-C11`** — the accepted-set rule is `04` §7.2's (`U-A10`). **Residue asserted here:** the
  editor's computed set equals `04` §7.2's derived table for all five Targets — **O7** tested one
  layer up. Named `O7-editor:`, not `O7:`.

### `U-C17`'s exit criterion — C-S22

`09` §12.2's diagnostic 7 claims to be *"the only consumer of `meta.width` and `meta.height` in the
entire package."* A package-wide negative is the one claim shape no reading can settle; it needs a
grep over an implemented package with every `meta` consumer built — `U-B8`, `U-C14`, `U-C15`,
`U-C17`. `U-C17` is the last of those, so **the check runs as `U-C17`'s exit criterion** and the
suspicion is closed there or restated as a finding. It is recorded in §6's ledger as carried, and
here as the place it becomes checkable.

---

## §4. The freeze points

**Five artifacts, three freeze points, not two tables.** `05` §13's *Renderer-side regression
snapshots* row reads **Delivered — `07` §11.3, R15** (opened by session D, A-S2). If the engine and
renderer tables are generated on one pass, all five freeze at once.

| Artifact | Frozen at | Cited |
| --- | --- | --- |
| **Hash vectors** — `(seed, channel, x, y, salt) → uint32` | `U-A2` | `02` §6.6; **X10** |
| **`mixLoad` vectors** | `U-A2`, same pass | `02` §6.7; **X10** |
| **Reference configs** — snapshotted against `(config, seed, loadSalt)` | `U-A14` | `05` §11.1; **X10** |
| **Geometry vectors** — `(Layout, rows, columns, Wpx, x, y) → cellBox`, `(…, px, py) → cellAt` | `U-B4` | `07` §11.3 row 1; **R15** |
| **Transform vectors** — `(scaleX, scaleY, rotation, cellBox) → [a b c d e f]` | `U-B6` | `07` §11.3 row 2; **R15** |

`U-A2` is the irreversible act A-1 describes: it converts a deliberately open hash family into one
member, permanently, by running the code once. `U-A14` freezes the larger surface `05` §11.1 lists as
*"not sufficient"* for the hash table alone. **A-20 and B-10 must both close first** — `05` §11's
gate and **R15**'s *"only alongside a major bump"* are both major-bump rules, and `05` §10.3 puts all
of V1 at `0.x` where no bump kind binds.

Use the `regression-vectors` skill for all five. **Never regenerate a table to make a test pass** — an
unexpected diff means output moved without anyone intending it, which is the entire point.

---

## §5. Gates that open during the build

`c-editor` §5.5's rows are ordering constraints, not units. Each is marked at the unit where its gate
opens.

| Gate (`roadmap`) | Opens at | Why there |
| --- | --- | --- |
| §4.1 · `selection()` as an export | `U-A13` — **already open** | Sweep 1: `02` §12 marks it **Required by `09` §6.2, E8**, not deferred. What is wrong is the row's classification in `roadmap` §4.1, not the export's status. |
| §7.1 A1 · `gradient` transcendental reproducibility | `U-A8`, made permanent at `U-A14` | The first `gradient` implementation. `00` §10.1's `gradient` row†: *"the first thing implementation forces."* Two exits (`05` Q3): an integer approximation for the angle projection, or the exposure accepted and recorded in the manner of `02` §10.1. §0.2. |
| §7.2 B2 · development vs production build | `U-A15`, again at `U-B8`, again at `U-C18` | Three consumers, one undecided mechanism: `05` §6.3's dev assertion, `07` §4.3's split, `09` §12.1's editing-time `validate()`. **E15**, **R3** and **S6** rest on it. One answer, decided at `U-A15`. §0.4. |
| §4.3 · author-controlled cropping | `U-B8` — **and the build trips it by omission** | Satisfiable only while V1's `meta` shape is written. With a centre-square default the feature is free forever; without it, its later arrival moves drawn output and is a **major renderer bump** permanently. **Doing nothing is the expensive choice and the row does not say so.** §0.4; depends on C-S5, carried. |
| §4.3 · DPR-aware selection (`srcset`/`sources`); recolourable tiles (`markup`/`inline`) | `U-B7`, `U-B8` | A reserved name is only reserved if V1 honours the reservation. `01` §10.2 owns the list and is unread (C-S28). §0.4. |
| §7.2 B1 · provider memoization | Concrete at `U-B8`; forced at `U-C14` | `09` §10.4 requires the editor's provider to obey **R2**; building one makes B-14 / `08` Q1 concrete. Not a blocker — the editor can simply obey. |
| §7.2 B8 · the editor's asset store | `U-C14` | The gate's wording defers the *general* answer to a second deployment shape; **E13** must measure an asset the editor holds and **E14** must copy it at export, so the *first* answer cannot be deferred. |
| §5.5 / B10 · persisted editor state | `U-C1` and `U-C12` | `09` §4.1 ships mute-by-removal with session-scoped state. The gate is *the observation* that a muted Operation is lost to a reload, and V1 produces it by construction. |

**Excluded, with reasons, so the omissions stay visible:** `roadmap` §5.3 (pixel-level compositing
artifact — the build does not supply it), §4.2 (Selection-valued `ParamSpec` — gates composition, not
V1, but see C-4), §4.1's open attribute registry (gated on reversing **D7**), §5.1 (expression
language and everything behind it), §5.2 / B7 (strictness relaxation — V1 is arguably the
demonstration, but the gate opens only if the demonstration is made, which the build does not force).

---

## §6. The invariant ledger

All 86, each against a unit ID or a stated reason. `†` on a class marks a narrowed artifact
(`test/untestable.md` §2).

### G — `02`, 5

| ID | Class | Discharged at | Honoured at | Note |
| --- | --- | --- | --- | --- |
| **G1** | assertion | `U-A11` | — | Overstated until A-18 settles (`00` §10.1†). |
| **G2** | assertion | `U-A11` | — | Clipped-region config; `gradient` midpoint against the whole grid. |
| **G3** | assertion | `U-A11` | — | Reorder the stack, assert each Operation's contribution is bit-identical. C-S3 carried. |
| **G4** | assertion | `U-A5` | — | `tileId: null` emits no output, attributes retained. |
| **G5** | posture | — | `U-A11` | Residue: no import edge from engine code to any asset type. |

### D — `03`, 11

| ID | Class | Discharged at | Honoured at | Note |
| --- | --- | --- | --- | --- |
| **D1** | assertion | `U-A4` | — | Rename a Tile, assert zero cells move. |
| **D2** | assertion | `U-A4` | — | Engine-visible fields are `id` and `weight`. |
| **D3** | assertion | `U-A4` | — | Permute a Tile's asset array, assert identical output. |
| **D4** | assertion | `U-A3` | — | Table completeness over `03` §5.4. |
| **D5** | assertion | `U-A3` | — | `03` §5.2's `1 → clamp(1.5) = 1 → 0.5` example is the test. |
| **D6** | assertion | `U-A3` | — | Blend forced to `NaN`/`±Infinity`; previous value stands. |
| **D7** | posture | — | `U-A3` | No residue. |
| **D8** | assertion | `U-A3` | — | Defaults at `02` §9 step 1, before any `tileId` exists. |
| **D9** | assertion | `U-A5` | — | No Target named `assetId`; resolution is the only writer. |
| **D10** | assertion | `U-A5` | — | One `tileId` slot. |
| **D11** | assertion | `U-B6` | — | Declared engine-side (`03` §6.3), discharged renderer-side. `07` §10.1's two transform rows read in order *are* **D11** (A-S1). |

### O — `04`, 8

| ID | Class | Discharged at | Honoured at | Note |
| --- | --- | --- | --- | --- |
| **O1** | assertion | `U-A9` | — | Every Source value passes exactly one mapping. |
| **O2** | assertion | `U-A7` | — | Signature-level: never accumulated state. |
| **O3** | assertion | `U-A7` | — | Three channel keys; Selection and Source differ at one cell. A-26 open. |
| **O4** | assertion | `U-A8` | — | Exact key-set equality on `ctx`. A-25 open on the declared type. |
| **O5** | assertion | `U-A9` | — | `04` §6.1's table is the test. |
| **O6** | assertion | `U-A9` | — | Permute a palette, assert output changes; contrast **D3**. |
| **O7** | assertion | `U-A10` | — | `04` §7.2's derived table row by row. Residue at `U-C11` as `O7-editor:`. |
| **O8** | assertion | `U-A12` | — | `02` §6.7's worked example across two `loadSalt` values. |

### X — `05`, 11

| ID | Class | Discharged at | Honoured at | Note |
| --- | --- | --- | --- | --- |
| **X0** | posture | — | **none** | Nothing in a running program can violate a release-classification rule. |
| **X1** | posture | — | `U-A6` | No residue. |
| **X2** | posture | — | `U-A10` | No residue. |
| **X3** | posture | — | **none** | Binds a future Source's author. |
| **X4** | assertion | `U-A6` | — | Registering into an occupied name throws. |
| **X5** | assertion | `U-A6` | — | Every registration carries the flag; matches `04` §5.2's column. |
| **X6** | assertion | `U-A15` | — | Testability contingent on A-16 / A-17. |
| **X7** | assertion | `U-A6` | — | Unknown type name is a load failure; nothing substitutes. |
| **X8** | posture | — | `U-A6` | No residue. |
| **X9** | posture | — | **none** | Enforced by `05` §11's tables in CI and by nothing in the engine. |
| **X10** | assertion | `U-A2`, `U-A14` | — | Content is A-14 — two texts in one document. |

### C — `06`, 10

| ID | Class | Discharged at | Honoured at | Note |
| --- | --- | --- | --- | --- |
| **C1** | posture | — | `U-B2` | Residue: `generate(file)` does not type-check; no member of `TilesetConfig` at any depth is a `Layout` field. |
| **C2** | assertion | `U-B1` | — | Unknown version is a load failure. |
| **C3** | assertion | `U-B1` | — | Negative: no error code is ever raised against `engineVersion`'s content. |
| **C4** | assertion | `U-B1` | — | `meta` exempt from strictness. |
| **C5** | posture | — | `U-B2` | Residue: `generate` never imports or calls `validate`. |
| **C6** | assertion | `U-B1` | — | **B-12 open**: a test named `C6:` must know whether it discharges §10.1's text or §11's broader one. |
| **C7** | assertion | `U-B1` | — | JSON Pointer and stable code per error. |
| **C8** | assertion | `U-B1` | — | `mapping` discriminated by `target`, no `kind` tag. |
| **C9** | assertion | `U-B1` | — | `salt`/`assetSalt` as `uint32`. A-S7 / C-S18 carried on §5.2's text. |
| **C10** | assertion | `U-B1` | — | Charset and uniqueness scopes. B-17: the statement sentence is malformed. |

### R — `07`, 15

| ID | Class | Discharged at | Honoured at | Note |
| --- | --- | --- | --- | --- |
| **R1** | posture | — | `U-B3` | Residue: one module exports the mapping and no other computes it. B-5 open on what counts as one implementation. |
| **R2** | posture | — | `U-B8` | Residue: the **default** provider is asserted pure; a host's cannot be. B-14. |
| **R3** | assertion | `U-B8` | — | Never substitutes a drawable; binds resolution and load failure alike. |
| **R4** | posture | — | `U-B8` | No residue — no published key set to diff a release against. |
| **R5** | assertion | `U-B3` | — | Cell box a function of `Layout`, `rows`, `columns`, `Wpx` alone. |
| **R6** | assertion | `U-B3` | — | Shared edges, never independently rounded. |
| **R7** | assertion | `U-B5` | — | Transform composition order. |
| **R8** | assertion † | `U-B10` | — | Narrowed — `test/untestable.md` §2. |
| **R9** | assertion † | `U-B10` | — | Narrowed — §2. |
| **R10** | assertion † | `U-B10` | — | Narrowed — §2. |
| **R11** | assertion | `U-B3` | — | `cellAt` round trip, half-open. |
| **R12** | assertion | `U-B9` | — | `loadSalt` drawn once per session and held. |
| **R13** | assertion † | `U-B5` | — | Narrowed — §2. Unreachable from a valid file in V1; **B-16 unresolved**. |
| **R14** | posture | — | **none** | A release-process rule, discharged by no build artifact. |
| **R15** | assertion | `U-B4`, `U-B6` | — | B-7, B-8, B-10 open on the deliverable itself. |

### S — `08`, 10

| ID | Class | Discharged at | Honoured at | Note |
| --- | --- | --- | --- | --- |
| **S1** | assertion | `U-B7` | — | Component takes a whole `TilesetFile` and calls the engine itself. |
| **S2** | posture | — | `U-C5` | **Reassigned by session D** — `b-render` §5 and `c-editor` §5.2 each assigned it to the other and it landed nowhere. Residue: the preview imports `<Tileset>` and no other renderer. |
| **S3** | posture | — | `U-B7` | Residue: the component imports no validator. |
| **S4** | assertion | `U-B9` | — | Caller passes `file.config`, never `file`. |
| **S5** | assertion | `U-B7` | — | `Drawable` is `{ src }`, drawn as an `<img>`. |
| **S6** | assertion | `U-B8` | — | Load half needs a substrate. |
| **S7** | assertion | `U-B9` | — | Discharged by **lint**, not a runtime test — the test name will not look like the others. |
| **S8** | assertion | `U-B7` | — | Natural ratio, no height. |
| **S9** | assertion | `U-B7` | — | Render box element carries the clip and the positioning context. |
| **S10** | assertion | `U-B3` | — | `cellBox`/`cellAt` exported pure, independent of the component. |

### E — `09`, 16

| ID | Class | Discharged at | Honoured at | Note |
| --- | --- | --- | --- | --- |
| **E1** | assertion | `U-C21`, fed by `U-C3`, `U-C12`, `U-C13`, `U-C14`, `U-C15` | — | Six conditions over every emitted file. |
| **E2** | posture | — | `U-C20` | Residue: the written `engineVersion` equals the version of the package module the preview imports, obtained through the same import. |
| **E3** | posture | — | `U-C1` | No residue. |
| **E4** | assertion | `U-C14`, `U-C15` | — | The two sites that write `meta` and nowhere else. Content depends on C-S5, carried. |
| **E5** | assertion | `U-C1` | — | Every file-touching action is total legal → legal. C-3 open on the commit gate. |
| **E6** | assertion | `U-C2` | — | Undo is a stack of files. C-2 open on lifetime and depth. |
| **E7** | posture | — | `U-C6` | Residue: overlay geometry equals `cellBox`. |
| **E8** | assertion | `U-A13`, `U-C6` | — | Second clause — *no Selection test in the editor* — enforced at the import boundary by lint, not a test. First clause fully assertable at `U-C6`. |
| **E9** | assertion | `U-C7` | — | `ParamSpec` → affordance is total. C-4 open on future forms. |
| **E10** | assertion | `U-C12` | — | Seed and salt affordances. |
| **E11** | assertion | `U-C13` | — | Preview width writes no field. |
| **E12** | assertion | `U-C13` | — | Design width is a numeric field and destructive. |
| **E13** | assertion | `U-C14` | — | Attach measures or fails. C-9 open on assets with no intrinsic size. |
| **E14** | assertion | `U-C15` | — | File plus asset folder. C-8 open on `<ext>` and the artifact. |
| **E15** | posture | — | `U-C18` | Its assertable content **is E5's**, discharged at `U-C1`. No residue of its own. |
| **E16** | assertion | `U-C17` | — | An advisory never blocks, never modifies, never errors. C-7 open on lifecycle. |

### Reconciliation with `01` §13

| Prefix | Declared | Found | Assertions | Postures |
| --- | --- | --- | --- | --- |
| **G** | 5 | 5 | 4 | 1 |
| **D** | 11 | 11 | 10 | 1 |
| **O** | 8 | 8 | 8 | 0 |
| **X** | 11 | 11 | 5 | 6 |
| **C** | 10 | 10 | 8 | 2 |
| **R** | 15 | 15 | 11 | 4 |
| **S** | 10 | 10 | 8 | 2 |
| **E** | 16 | 16 | 12 | 4 |
| | **86** | **86** | **66** | **20** |

### The `pnpm invariants` check

Written as checks, not prose. The root script asserts all six; any failure is a build failure.

```
DECLARED   = the 86 IDs of `01` §13, hardcoded from the census
TESTED     = { id : a test named `<id>:` exists in either workspace }
UNTESTABLE = { id : a row in test/untestable.md §1 }
NARROWED   = { id : a row in test/untestable.md §2 }

C1  TESTED ∪ UNTESTABLE == DECLARED          # nothing absent, nothing invented
C2  TESTED ∩ UNTESTABLE == ∅                 # no ID both discharged and excused
C3  NARROWED ⊆ TESTED                        # a narrowed artifact is not an absence
C4  NARROWED ∩ UNTESTABLE == ∅               # §2 is not a second posture list
C5  |UNTESTABLE| == 20 and |TESTED| == 66    # against this ledger, not a recount
C6  every row of §1 and §2 carries a non-empty reason
```

**C2 is the check that would have caught D7** — and the thirteen like it — without a reviewer. It is
why `invariants` is a root script rather than a per-workspace one: **E**1–16 live in `apps/editor`
and the rest in `packages/tileset`, and C1 and C5 cannot be evaluated one workspace at a time.

---

## §7. Amendments

Every amendment the audit implies. **None is applied by this plan.** Each goes through the
`spec-amendment` skill, one at a time, after §0.5 closes.

| Document | What moves | Source |
| --- | --- | --- |
| `00` §10.1, last row | All three residues describe landed work. The row asserts its own verification, dated. | Sweep 3; A-22; `c-editor` §1.3; B-1 |
| `00` §6, closing paragraph | Says `07`'s header carries **Amended** lines for `/adr` and `08` only; `07`'s header carries two, the second recording exactly the change `00` says is unrecorded, and citing `00` §6 while doing so. | B-2 |
| `00` §4.3 vs §10.1 | One document, one pass, both directions on the drag premise. | B-3 |
| `00` §4.5 | The census says one engine entry point; `02` §12 marks a second **Required**. | A-11; sweep 1 |
| `00` §10.2 | Whether the section carries a total at all. | §0.5 |
| `roadmap` §4.1 | Files `selection()` as *agreed, unbuilt* while **E8** and `02` §12 make it V1. | C-1; sweep 1 |
| `09` §9.3 | *"`02` §7.5 names only the first"* is false against current `02` §7.5. | Sweep 3 |
| `09` §9.2 | Reproduces `07` §9.1's table dropping `cellSize` and `horizontalAlignment` from row 1. | Sweep 3 |
| `09` header | No **Amended** line, yet Q11 was amended in place. | `c-editor` §1.2 |
| **`01` §6.1** — *Authoring resize* | Reads *"The author changes the design width; `referenceWidth` changes and `columns` is re-derived."* Drag gone, but names **only `referenceWidth`** — `09` §9.2's abbreviation defect, in the naming authority, in a document that ships. `07` §9.1 and `02` §7.5 both name all three fields. | Session D |
| **`_harvest.md`** — *Authoring resize* | Reads *"The author **drags** the design page width"* — the withdrawn premise verbatim, in a block marked *harvested into 01, 2026-08-05*. `01` §6.1's row is its descendant. | Session D; §0.5 |
| `05` §12 | **X10**'s summary row drops `mixLoad` and rebinds *"two tables"*. | A-14 |
| `05` header | Says one row corrected; §10.2 says three replaced one. | A-24 |
| `06` §11 | **C6**'s summary is broader than §10.1's declaration; §9.2's no-coercion rule carries no ID. | B-12 |
| `06` §5.3 | **C10**'s statement sentence has collapsed spacing and an unterminated emphasis marker. | B-17 |
| `07` header | **R3** was amended (`08` Q2 records it taken) with no **Amended** line. | B-4 |
| `07` §12, §14 | An extra column in §12's header rule; §14 split into three tables. | B-17 |
| `04` §5.1 | The `ctx` block types `salt: number` against `04` §3 and `02` §6.4. | A-25 |
| `04` §2 | Routes `reseedOnLoad` to `07` only; the exposure half is `08`'s. | A-12; A-S4 |
| `04` §5.3 vs `05` §13 | Disjunction versus single conjunct on what a new noise Source owes. | A-15 |
| `03` §5.5, §6.3 | *conformant renderer* wording, withdrawn by `00` §5.2/§6 and unsupported by `07` §10. | A-13; A-S5 |
| ADR-002 | *Documents revisited* records `04` §10's row as **removed**; it was struck in place, which is what `00` §8.5 requires. | A-23 |
| `01` §10.3 | No row for `Grid` doing two jobs. | A-10 |
| `01` §10.2 | Does not reserve `asset`. | A-26 |

### `00` §10.2's running total: fourteen → twenty

Six new instances of the counted shape — a document asserting something false about another,
verified by opening it.

| # | Site | Claim | Verified by |
| --- | --- | --- | --- |
| 15 | `00` §10.1, last row | residue against `07` §9.1 | B-1; sweep 3 |
| 16 | `00` §10.1, last row | residue against `09` Q11 | `c-editor` §1.3 |
| 17 | `00` §10.1, last row | residue against `01` §13 | A-22 and `c-editor` §1.3, independently |
| 18 | `00` §6 | on `07`'s header block | B-2 |
| 19 | `09` §9.3 | *"`02` §7.5 names only the first"* | Sweep 3 |
| 20 | ADR-002 | *"§10 row removed"* against `04` §10's struck-in-place row | A-23 |

Rows 15–17 sit in one table row, which is why the sessions read the total differently — the row
makes three separate claims about three separate documents and all three are stale, so it is three.

**Excluded, with reasons, so the omissions are visible:** B-3 (`00` §4.3 vs §10.1 — internal
inconsistency downstream of 15, not a claim about another document); B-4 and `09`'s missing
**Amended** line (an absent record, not a false claim); A-24 (`05`'s header against its own §10.2 —
same-document bookkeeping); sweep 2's five `Deferred` back-links (a one-way link, not a false
assertion). **All six were produced by passes auditing for the pattern**, which is §0.5's second
entry.

### On the timing

**Routing every amendment to a separate post-D session is this plan's answer, not a deferral.** An
amendment applied inside a consolidation pass is applied by the pass with the most context and the
least remaining review — precisely the condition that produced four of §10.2's original fourteen and
all six of the new ones. CLAUDE.md forbids amending in passing; this plan states the stronger form:
**the pass that finds a stale claim is the wrong pass to fix it**, because it is fixing against a
reading it has not had to re-establish. The consolidation's output is the list and the evidence; a
later pass opens each document again and applies one change. Recorded as a decision so it is not
rediscovered as an open question.

---

## §8. Verification

- `pnpm invariants` — reconciles to 86 against `01` §13 via the six checks in §6.
- `pnpm --filter @tileset/core vectors:check` — must pass before any commit; covers whichever set of
  artifacts A-14 settles **X10** as naming (§4).
- `pnpm -r build`, `pnpm -r test`, `pnpm -r lint`.
- **Eleven units have an empty Discharges column.** Every one is intentional and every one has a
  stated reason. A future reader finding an empty column should read the reason, not fill it — an
  empty cell and a missing acceptance criterion must not be indistinguishable, which is this file's
  own version of the rule `test/untestable.md` exists to enforce.

  | Unit | Where its reason is written |
  | --- | --- |
  | `U-B2` | its row in §1 — the unit's content is **C1** and **C5**, both postures, honoured not discharged |
  | `U-A1` | its row in §1 — substrate; the invariants it enables are asserted by the units that consume it, and its own acceptance criterion is `U-A2`'s table |
  | `U-A13` | its row in §1 — **E8**'s precondition, discharged with `U-C6`; `02` §12's engine-side criterion is agreement with `U-A7` cell-for-cell |
  | `U-C20` | its row in §3 — the unit's content is **E2**, a posture; its residue is tested there |
  | `U-C18` | its row in §3 — the unit's content is **E15**, a posture; **E15**'s assertable content *is* **E5**'s, discharged at `U-C1`, so the import screen discharges nothing under an ID of its own |
  | `U-C5` | §3, *Units carrying no invariant* — honours **S2** |
  | `U-C8` | §3, *Units carrying no invariant* — plus the pointer-conversion criterion gained by session D |
  | `U-C19` | §3, *Units carrying no invariant* |
  | `U-C9` | §3, *Units carrying no invariant* |
  | `U-C10` | §3, *Units carrying no invariant* |
  | `U-C11` | §3, *Units carrying no invariant* — plus the `O7-editor:` residue |
