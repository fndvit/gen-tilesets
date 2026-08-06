---
name: regression-vectors
description: Generate, check, or regenerate the project's exact regression vector tables — hash vectors, mixLoad vectors, geometry vectors, transform vectors, and reference config snapshots. Use this skill whenever a vector or snapshot test fails, whenever output changes unexpectedly, whenever a new registered type is added, whenever the hash or placement formula is touched, and whenever anyone proposes regenerating a table or updating a snapshot. Always use it before changing any file under test/vectors — regenerating a table to make a test pass destroys the only mechanism that detects unintended output change.
---

# Regression vectors

Four exact tables plus a set of reference configs are the deliverable that makes output stability
checkable. `05` §11 gives the reading that matters day to day: **they are regression tests.** An
unexpected diff on a patch or minor release means output changed without anyone intending it —
caught before publish. An expected diff means a deliberate breaking change, and the table is
regenerated alongside a major bump.

## The prime rule

**Never regenerate a table to make a failing test pass.**

A failing vector test is a finding, not an obstacle. Treat it as: *output moved.* The job is to
determine what moved it and whether that was intended. Report the diff, name the change that
caused it, and stop. Regeneration requires an explicit decision from the user and is always
paired with a major bump.

If a table must be regenerated, say so in exactly those terms: "this is a major bump under
**X9**" or "**R14**", and get agreement first.

## The five artifacts

| Artifact | Shape | Spec | Invariant |
|---|---|---|---|
| Hash vectors | `(seed, channel, x, y, salt) → uint32` | `02` §6.6 | **X10** |
| `mixLoad` vectors | rows in the same table | `02` §6.7 | **X10** |
| Geometry vectors | `(Layout, rows, columns, Wpx, x, y) → cellBox`, and `(…, px, py) → cellAt` | `07` §11.3 | **R15** |
| Transform vectors | `(scaleX, scaleY, rotation, cellBox) → [a b c d e f]` | `07` §11.3 | **R15** |
| Reference configs | snapshot per `(config, seed, loadSalt)` triple | `05` §11 | **X10** |

Geometry and transform require no browser and no image. Compositing — paint order, clipping,
crop, opacity — has no artifact and is `[POSTPONED]` at `07` §11.3. Do not invent one.

## Hash vectors are not sufficient

`05` §11.1. These all pass an unchanged hash table while changing every rendered background:

- `valueNoise`'s smoothstep, bilinear weighting, or per-octave salt derivation
- `gradient`'s corner projection or its degenerate-grid guard
- the weight walk's comparison, or the order it accumulates in
- bounding applied at emit rather than per write (**D5**)
- transform order (**D11**) — renderer-side, invisible to the grid, equally breaking

So a green hash table proves nothing above `02` §6.6. When triaging a suspected output change,
check the reference configs and the transform table too.

## Reference config coverage

Between them the reference configs must exercise: every registered type, both mapping kinds,
every Blend, both bounding behaviours, and at least one clipped-cell case (**G2**). At least one
must carry a `reseedOnLoad` flag — otherwise `02` §6.7's derivation is untested by the table.

Every reference config records the `loadSalt` it was snapshotted with, even where no flag makes
it live. Inert rows keep the same shape as live ones.

**A new registered type arrives with a reference config.** That is what `05` §6.3's test
obligation attaches to. Adding a Selection, Source, or Blend without one is incomplete work.

## Generating a table for the first time

`02` §6.6 specifies the hash at the constraint level — a family of functions, not one function.
The first generation of the hash table is therefore also the moment the family collapses to a
specific implementation. Make that deliberate:

1. Confirm the implementation satisfies every portability rule: all intermediate state `uint32`,
   every step ending `>>> 0`, `Math.imul` never `*`, no floating point except the single final
   division, `channelU32` derived by running Stage 1 over the channel string.
2. Confirm the returned value is in `[0, 1)` and that `1.0` is unreachable (**X6**) — the largest
   possible result is `4294967295 / 4294967296`.
3. Confirm `mixLoad(s, 0)` is *not* treated as an identity. `loadSalt = 0` is an ordinary value
   (`02` §6.7). A test asserting `mixLoad(s, 0) === s` is wrong and must be removed.
4. Generate, commit, and from that commit the table is frozen under the prime rule above.

Same discipline for geometry and transform once the placement formula exists: positive `rotation`
is clockwise (`07` §6.2), scale 1 is the cell square (**R7**), crop is centre-crop applied before
any transform (**R8**), cell boxes are half-open and share edges rather than being independently
rounded (**R6**, **R11**).

## Triage checklist for a failing vector

1. What changed in the working tree since the table last passed?
2. Is the change one `05` §11.1 lists as output-affecting?
3. Is the diff in the hash table, or above it?
4. Does the same change move the reference configs? The transform table?
5. Intended or not?

Report all five. Do not touch the table until the user has answered (5).
