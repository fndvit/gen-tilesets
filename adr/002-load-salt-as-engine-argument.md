# ADR-002 — Load salt as an engine argument

> **Status:** Accepted  
> **Date:** 2026-08-03  
> **Affects:** `02-generation-contract.md` §4, §4.1, §6.3, §6.4, **G1**; `04-operations.md` §5.1, §8, **O4**, **O8**  
> **Raised by:** drafting `06-config-schema.md`

---

## Context

`04` §8 declared, as **O8**:

> `reseedOnLoad` is never read during generation. It instructs the caller, before
> `generate()` is invoked, to replace the Operation's `salt` with a fresh value.

The reasoning was sound and is not in dispute: the engine must not draw a random number, so
whoever varies the output on each load has to sit outside it. **G1** was preserved exactly.

What the decision did not examine is _what the caller has to do to comply_. It has to walk the
operation stack, test a flag on each Operation, and **overwrite a field in the config** — then
call `generate()` on the result. Three costs follow.

**The renderer needs structural knowledge of the operation stack.** `<Tileset {config} />` is a
drawing component. Under **O8** it must iterate `config.operations` and mutate an authoring
field before it can draw anything.

**The config the engine received is not the config on disk.** A flagged Operation's `salt` now
holds a number nobody authored. `04` §8.3 carries an `[EXTENSION POINT]` — _the renderer emits
the derived config it actually used_ — whose entire purpose is recovering the file that was
overwritten a moment earlier.

**`salt` carries two decisions in one field.** On an unflagged Operation it is an authoring
choice, pinned by the author clicking reroll until the picture is right. On a flagged one it is
a value that gets clobbered at load. Which of the two a given `salt` means is not visible from
the field; it is visible from a boolean elsewhere on the Operation.

The pre-pass exists solely to convert the first meaning into the second, at the last possible
moment, by mutation.

## Decision

Add a third argument. The engine reads `reseedOnLoad`.

```
generate(config: TilesetConfig, seed: Seed, loadSalt: uint32 = 0) -> Grid<TileState>
```

`loadSalt` is drawn **once per load** by the caller and held. It is not a config field and is
never written to one.

Each hash channel resolves an **effective seed** before mixing position:

```
seedU32       = stage1(seed)                                  // 02 §6.6, unchanged
effective(op) = op.reseedOnLoad          ? mixLoad(seedU32, loadSalt) : seedU32
effective(as) = config.reseedAssetsOnLoad ? mixLoad(seedU32, loadSalt) : seedU32
```

`mixLoad` is specified at the constraint level, in the manner of `02` §6.6: a single
multiply-xor-shift round, `uint32` throughout, `Math.imul` never `*`, no floating point. It
adds no key component to Stage 2, whose shape is untouched.

**`loadSalt = 0` is an ordinary value, not an identity.** `mixLoad(s, 0)` is not required to
equal `s`. Making it so would buy an equivalence nothing needs, at the price of a magic value
in the one place this package has been most careful to avoid one.

**`salt` is unchanged.** Per-Operation, in the config, frozen, incremented by the editor's
reroll button, never touched at runtime. `02` §6.4 stands verbatim.

### The two knobs, restated

|            | Scope                                                     | Lives in              | Set by                    |
| ---------- | --------------------------------------------------------- | --------------------- | ------------------------- |
| `salt`     | one Operation                                             | config, frozen        | author, at authoring time |
| `loadSalt` | every flagged Operation, and the asset channel if flagged | nowhere — an argument | caller, once per load     |

> `seed: "sunset-3"`. Op 1 `salt: 4`, unflagged. Op 2 `salt: 0`, flagged. Op 3 `salt: 7`,
> unflagged.
>
> Load A (`loadSalt: 82931`) and load B (`loadSalt: 15044`) differ in Op 2 and in nothing else.
> Op 1 still hashes against `salt: 4` and Op 3 against `salt: 7`, on every load, forever.

Two flagged Operations move together — one draw re-rolls both — but their values remain
uncorrelated, because they occupy channels namespaced by `operationId` (`04` **O3**). Moving
together is the intended reading of the flag: it says _vary this on every load_, and there is no
case for one flagged Operation varying while another stays put.

### **O8**, rewritten in place

> **Invariant O8** — _`reseedOnLoad` selects which seed an Operation hashes against: the run's
> `seed` when false, the `seed` mixed with `loadSalt` when true. The engine never draws
> `loadSalt`; it receives it._

### **O4**, amended

`ctx.seed` cannot survive as the seed string. `valueNoise` calls `hash()` itself (`04` §5.2), so
a Source reading the raw seed would silently ignore its own Operation's flag — a flagged
`valueNoise` that never varies, with nothing anywhere to indicate why.

The field becomes `effectiveSeed`: a `uint32`, Stage-1 hashed and load-mixed where the flag is
set.

> **Invariant O4** — _`ctx` is closed at `{rows, columns, effectiveSeed, operationId, salt}`. A
> Source receives nothing else._

Still five fields, so §5.1's closure argument holds unchanged — `ctx` remains the narrow doorway
a pixel measurement would otherwise enter through. A Source loses access to the seed string,
which it never had a use for.

## Consequences

**Purity survives, one argument wider.** **G1** becomes _output depends on
`(config, seed, loadSalt)` and nothing else_. The engine still draws nothing, consults no
ambient state, and reproduces exactly for a repeated triple. `02` §4.2's prohibited-input list
is untouched: `loadSalt` is a caller-supplied integer, not a measurement of the world.

The version of this that would break **G1** — the engine calling `Math.random()` when it sees
the flag — remains prohibited and is not what this ADR proposes. `04` §8.1's distinction was
always about _who draws_, and it still is. What moved is only _what the drawn number is applied
to_: an argument rather than a field in the caller's copy of the config.

**The caller does nothing structural.** It passes two values. `<Tileset {config} />` never
inspects an Operation, never clones, never mutates. A config with no flags anywhere is
byte-identical on every load regardless of `loadSalt`, which is the guarantee `04` §8.3 already
made and now makes without qualification.

**Reproduction is two values.** `(seed, loadSalt)` reproduces any render exactly.
`04` §8.3's `[EXTENSION POINT]` — the renderer emitting its derived config — **dissolves**;
there is no derived config. Its `roadmap.md` entry is withdrawn rather than carried forward.

**`04` §8.3's constraint on `07` survives and gets easier.** _The salt is drawn once per load and
held_ is now structurally true: there is one integer and one argument, and re-drawing per cell
would require deliberate effort rather than an oversight.

**No generated output changes.** No implementation exists and no config has been authored.
`05` **X9** binds after `1.0.0` (`05` §10.3) and we are well short of it. This is the cheapest
moment this reversal will ever be — once `07` and `08` are written against the rewrite model it
costs three documents and a component API.

**`05` **X10** widens.** A reference config is snapshotted against `(config, seed, loadSalt)`.
The hash vector table of `02` §6.6 is unaffected; `mixLoad` earns rows of its own.

**`08` inherits a decision, not a problem.** Whether `loadSalt` is an optional prop defaulted to
a fresh draw, or defaults to `0`, is `08`'s call. The engine requires only that it be drawn once
and held. Two things argue for exposing it as an optional prop rather than sealing it inside the
component: server-side rendering draws on the server and again on the client unless the host
supplies one value for both, and reproduction requires the number to be reachable. Recorded as a
constraint on `08`, not settled here.

## Alternatives considered

**Keep **O8** and specify the rewrite discipline in `07`.** The config is immutable; the caller
shallow-copies and substitutes salts; `07` owns the contract. Coherent, no reversal, no ADR.

Rejected. It documents the problem rather than removing it: the renderer still parses the
operation stack, `salt` still means two things, and `04` §8.3's extension point still exists
only to undo damage the model inflicts a moment earlier.

**Add `loadSalt` to `ctx` rather than deriving an effective seed.** Rejected. **O4** is closed
and defended, and a Source would then have to remember to mix it — an omission that produces a
flag that silently does nothing, which is the failure mode `05` §6.1 rejects for the stochastic
declaration. Deriving the effective seed once, outside the Source, makes the flag work whether
or not the Source's author was thinking about it.

**Give flagged Operations independent load salts.** Rejected. It reintroduces per-Operation
runtime state — a map from `operationId` to a drawn number — which is the config-mutation
problem in a different container, and answers a question nobody asked.

**Defer until a renderer exists.** Rejected on ADR-001's grounds: the amendment is cheap now and
expensive later.

## Documents revisited

| Document                    | Outcome                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `01-glossary.md`            | §5, §8.6, §9 carry the pre-reversal wording. `loadSalt`, `effectiveSeed`, and `mixLoad` are new terms. Full re-harvest pending. |
| `02-generation-contract.md` | §4 signature, §4.1 seed model and table, §6.3 channel table, §6.4 salt/reroll, **G1**; new §6.7 for the effective seed.         |
| `03-domain-model.md`        | No change. The asset channel's key gains an effective seed, which `03` §4.3 cites rather than specifies.                        |
| `04-operations.md`          | §5.1 and **O4** amended; §8 rewritten; §8.3's extension point withdrawn; §10 row removed.                                       |
| `05-extension-model.md`     | **X10** widens to the triple. §4.3's channel-set closure is unaffected — no channel is added.                                   |
| `06-config-schema.md`       | Not yet written. `loadSalt` is not a config field; `reseedOnLoad` and `reseedAssetsOnLoad` remain and are now engine inputs.    |
