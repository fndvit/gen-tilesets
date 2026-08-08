# Untestable invariants

`01` §13 declares 86 invariants. This file records the **20 that are postures** rather than
assertions, and — separately — the **4 assertions whose artifact is narrower than the invariant**.
*Absent and untestable must never be indistinguishable*, which is what both sections exist to
prevent.

Units are named by ID (`U-A*`, `U-B*`, `U-C*`); `PLAN.md` §1–§3 carry the build ordinals. Checked by
`pnpm invariants` — see `PLAN.md` §6 for the six assertions that script makes.

## §1 — Postures (20 of 86)

An invariant that constrains how decisions get made rather than what the code does. A posture may
still be **honoured** by a unit, and may have an assertable **residue** tested there under a name
that is not the bare invariant ID. Neither makes it an assertion. **No ID in this section appears in
any unit's Discharges column** — `pnpm invariants` check C2.

| ID | Doc | Honoured at | Reason |
| --- | --- | --- | --- |
| **G5** | `02` | `U-A11` | *"The engine never touches a graphical resource"* is a claim about what may be written, not a value to assert. Residue: no import edge from engine code to any asset type — which checks the boundary, not the invariant. |
| **D7** | `03` | `U-A3` | Closure of the attribute set is a rule about future changes; a length assertion on `03` §5.4's table restates the count, it does not bind the next author. No residue. |
| **X0** | `05` | — | A release-classification rule. Nothing in a running program can violate it. |
| **X1** | `05` | `U-A6` | The extensible/closed table is a rule about what may be added; there is no registry for attributes, Targets, channels or mapping kinds to reject a registration *into*. No residue. |
| **X2** | `05` | `U-A10` | *"Adding a Blend obliges a review of every Target's veto list"* is an obligation on a person. `05` §4.2 says so: *"Forgetting the review does not error. It ships a control that produces nonsense."* No residue. |
| **X3** | `05` | — | *"never by constructing a channel string"* binds a future Source's author. A test can assert the channel set is three today; it cannot assert the next Source obeyed the rule. |
| **X8** | `05` | `U-A6` | A naming discipline across releases. Violating it requires two builds and a reader comparing them. No residue. |
| **X9** | `05` | — | A versioning rule, enforced by `05` §11's tables in CI and by nothing in the engine. |
| **C1** | `06` | `U-B2` | A property of the file's shape, not of a running function. Residue: `generate(file)` does not type-check, and no member of `TilesetConfig` at any depth is a `Layout` field. |
| **C5** | `06` | `U-B2` | *"Behaviour on an unvalidated config is undefined"* cannot be asserted. Residue: `generate` never imports or calls `validate`. |
| **R1** | `07` | `U-B3` | *One implementation* is a structural claim about imports, not an output — and B-5 leaves what counts as one implementation unsettled. Residue: one module exports the mapping and no other module computes it. |
| **R2** | `07` | `U-B8` | Binds any provider the host supplies, which the component cannot check (`08` §4.3) — B-14. Residue: the default provider is asserted pure; a host's cannot be. |
| **R4** | `07` | `U-B8` | `meta` additive-only across releases; there is no published key set to diff a release against. No residue. |
| **R14** | `07` | — | A release-process rule about version numbers, discharged by no build artifact. |
| **S2** | `08` | `U-C5` | *Reassigned by session D — `b-render` §5 and `c-editor` §5.2 each assigned it to the other and it landed nowhere.* Its negative half — no preview mode, no simplified path, no second component — is a negative existential over the editor's implementation. Residue: the preview imports `<Tileset>` and no other renderer. |
| **S3** | `08` | `U-B7` | *"Undefined behaviour on a file `validate()` would reject"*, as **C5**. Residue: the component imports no validator. |
| **E2** | `09` | `U-C20` | Constrains the build graph, not runtime behaviour. No observation of a running editor distinguishes a compliant build from one that happens to agree today. Residue: the written `engineVersion` equals the version of the package module the preview imports, obtained through the same import. |
| **E3** | `09` | `U-C1` | A negative existential — *"There is no second document model."* Nothing observable distinguishes state-is-the-file from an equivalent projection kept in sync; the failure it prevents is a projection drifting later. No residue. |
| **E7** | `09` | `U-C6` | *"exactly one kind of overlay"* is a V1 scope statement. A test can confirm the overlay that exists is correct; it cannot confirm no second kind was added. Residue: overlay geometry equals `cellBox`. |
| **E15** | `09` | `U-C18` | Classifies a failure rather than specifying behaviour — it assigns blame, and the behaviour it implies is **E5**'s, discharged at `U-C1`. No residue of its own. |

**Breakdown.** 9 have a residue test — **G5**, **C1**, **C5**, **R1**, **R2**, **S2**, **S3**,
**E2**, **E7**. 7 are honoured by a unit with no residue — **D7**, **X1**, **X2**, **X8**, **R4**,
**E3**, **E15**. 4 are honoured by no unit at all — **X0**, **X3**, **X9**, **R14**. 9 + 7 + 4 = 20.

## §2 — Assertions with no contract-level artifact (4)

**Not postures.** Each has a unit and a test named for its ID; each test observes something narrower
than the invariant. Listed because a green test would otherwise read as full discharge.

| ID | Unit | What is tested | What is not |
| --- | --- | --- | --- |
| **R8** — crop | `U-B10` | `object-fit: cover` is declared and no measurement occurs. `07` §6.4's load-bearing half — crop **before** transform — is structural, because `object-fit` applies to the element the transform is then applied to (`08` §4.2). | That the picture is cropped correctly. `07` §11.3's compositing row is empty **by decision**, carried to `07` §13 as `[POSTPONED]` and `07` Q1 as the open half of an otherwise-resolved question. |
| **R9** — clipping | `U-B10` | The render box element carries the clip and no cell does (**S9**, `08` §6.2). | That the resulting picture clips correctly. Both **R15** tables are blind: `cellBox` still returns a negative `originX`/`originY` and the matrix is unchanged. |
| **R10** — paint order | `U-B10` | DOM document order is row-major. `07` §7.4: row-major *"is what document order gives a naive DOM implementation, so the correct behaviour is the free one and any deviation costs effort."* | The contract. `07` §11.3 anticipates this exact test and declines it in the same breath: *"that is a test of one implementation and not of the contract."* |
| **R13** — applier dispatch | `U-B5` | That `07` §10.1's dispatch table exists and is keyed by attribute name rather than by four hardcoded fields. | The failure it prevents. Unreachable from a valid file in V1 — `03` **D7** closes the set and `06` §7 validates target names (`07` §10.2). Exercisable only against a hand-built `TileState` the engine cannot emit, which **S3** and **C5** place in undefined-behaviour territory. **B-16 is unresolved**: hand-built state, or the dispatch table's existence, or this file. |

**Why these are here and not in §1.** They are assertions by every audit session's classification and
they carry tests named `R8:`, `R9:`, `R10:`, `R13:`. Filing them as postures would assert that the
contract cannot be asserted, which is false. What is true is narrower: `07` declined the artifact
that would assert them, knowingly, and carried it to §13. When `07` §13's postponed compositing
artifact arrives, these four move to full discharge — **nothing in §1 ever will.** That is the whole
difference, and it is why the sections are separate rather than one list with a note.

## §3 — Arithmetic

86 declared (`01` §13). **66 assertions, 20 postures.** Of the 66, four appear in §2 with a narrowed
artifact — §2 narrows an artifact, it does not exclude an invariant, so those four remain in the 66.

**The sweep behind the two-column split.** Any ID in both a Discharges column and §1 is a defect, not
a rounding difference. Sweeping the unit tables as the three findings files wrote them found
**fourteen postures in Discharges columns across eleven units**: **C1**, **C5** (`U-B2`); **X1**,
**X8** (`U-A6`); **D7** (`U-A3`); **X2** (`U-A10`); **G5** (`U-A11`); **R1** (`U-B3`); **S3**
(`U-B7`); **R2**, **R4** (`U-B8`); **E2** (`U-C20`); **S2** (`U-C5`); **E7** (`U-C6`).

**D7 was not an isolated slip; it was the visible instance of a systematic one.** Every case is
inherited verbatim from the findings files, which used *discharges* for two relations — *a test
discharges this ID*, and *this unit is where the posture is kept*. `a-engine` §5 flagged four of its
own inline (`X1 (posture)`, `X8 (posture)`, `X2 as a posture`, `G5 (posture)`), which is how the
ambiguity survived three sessions of review: it was visible and looked deliberate. `b-render` §5's
coverage check assigned units to **C1**, **C5**, **R1**, **R2** and **S3** without flagging them.

The fix is two columns in `PLAN.md` §1–§3 and check C2 in `pnpm invariants`, so the disjointness is
mechanical rather than checked by eye.
