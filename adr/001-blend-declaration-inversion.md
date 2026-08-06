# ADR-001 — Blend declaration inversion

> **Status:** Accepted  
> **Date:** 2026-08-02  
> **Affects:** `04-operations.md` §7.2, **O7**  
> **Raised by:** `05-extension-model.md` §4.2

---

## Context

`04` §7.2 originally declared, as **O7**:

> Every Target declares a default Blend and the set of Blends it accepts. A pair outside that
> set is invalid.

This produced a correct five-row table and was agreed at the time.

Writing `05` surfaced the problem. `04` §7.1 marks `min` and `max` as `[EXTENSION POINT]` —
the only Blends that would make `03` §5.5's lossy per-write clamp recoverable. But Targets
are closed: four of the five are attributes, and the attribute set is closed by `03` **D7**.
A Target cannot grow a new entry in its accepted list.

Under **O7** as written, a Blend registered later is therefore **accepted by nothing**. The
extension point is empty, and `03` §2's stated scope for `05` — "adding a Selection, Source,
or Blend" — describes something the model does not permit.

## Decision

Invert the direction of the declaration.

- A **Blend** declares the Target _types_ it accepts: `numeric`, `tile`.
- A **Target** declares its type, its default Blend, and any Blends it **vetoes**.
- A Target's accepted set is every Blend accepting its type, less its vetoes.
  **O7** is rewritten in place; §7.2 keeps its number per `01` §11.4.

## Consequences

**The V1 table is unchanged.** Every row derives to the same value it was previously
asserted to have:

| Target     | Type    | Vetoes     | Derived accepted set     | Previously asserted |
| ---------- | ------- | ---------- | ------------------------ | ------------------- |
| `tileId`   | tile    | —          | `set`                    | `set`               |
| `scaleX`   | numeric | —          | `set`, `add`, `multiply` | same                |
| `scaleY`   | numeric | —          | `set`, `add`, `multiply` | same                |
| `rotation` | numeric | `multiply` | `set`, `add`             | same                |
| `opacity`  | numeric | —          | `set`, `add`, `multiply` | same                |

No config becomes valid or invalid as a result. No generated output changes. Under `05`
**X9** this is not a breaking change.

**A new obligation exists.** A Blend declaring `numeric` becomes available on every numeric
Target at once. Adding one therefore requires reviewing every veto list — `05` **X2**. The
failure mode is not an error but a shipped control producing nonsense:

> `min` declares `numeric` and is immediately accepted by `rotation`. But `min(350°, 10°)`
> is `10°`, and under a wrapping domain `350°` is ten degrees _anticlockwise_ of `10°` — the
> arithmetically smaller value is the larger rotation. `rotation` must veto `min` alongside
> the `multiply` it already vetoes.

**`06` is unaffected in substance.** It still validates a `(target, blend)` pair against a
table; the table is now derived rather than literal.

**`09` is unaffected.** Show the default Blend, reveal the accepted set on request.

## Alternatives considered

**Leave `04` §7.2 as written and strike the `min`/`max` extension point.** Coherent — Blends
would be closed at V1 alongside attributes and Targets. Rejected because `03` §2 and `04` §2
both already assign Blend extension to `05`, so the closure would be a third reversal rather
than a smaller one, and it forecloses the only route by which per-write clamp loss (`03`
§5.2) becomes recoverable.

**Defer the inversion until `min` or `max` is actually built.** Rejected on the grounds that
the amendment is free now — the table does not move — and expensive later, once `06`'s
validator and `09`'s controls have been written against the literal form.

## Documents revisited

| Document                    | Outcome                                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `02-generation-contract.md` | No change. Does not reference Blend partiality.                                                                                     |
| `03-domain-model.md`        | No change. §5.4's forward reference to `04` §7.2 still resolves — that section still carries a per-Target table of accepted Blends. |
| `04-operations.md`          | §7.2 rewritten, **O7** restated in §9, §10's `min`/`max` row cross-referenced.                                                      |
| `01-glossary.md`            | §8.5 carries the pre-inversion wording and its Target table. Corrected out of band; full re-harvest pending.                        |
