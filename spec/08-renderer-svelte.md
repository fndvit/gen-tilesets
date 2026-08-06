# 08 — Svelte Renderer

> **Status:** Draft, agreed  
> **Depends on:** `02-generation-contract.md`, `03-domain-model.md`, `06-config-schema.md`, `07-render-contract.md`, `/adr/002-load-salt-as-engine-argument.md`  
> **Constrains:** `09-editor.md`

---

## 1. Purpose

This document defines **the component**: what `<Tileset>` receives, what it emits, what it does
on the server, and what surface `09` calls into.

`07` fixed the renderer's behaviour completely and deliberately left every question of interface
open — props, events, lifecycle, the SSR mechanism, the concrete type of a `Drawable`, and the
sizing default are all routed here by `07` §2. This is where they are settled.

It also answers the question `07` could not: **who calls `generate()`**. `07` §9 constrains the
caller without naming it, because at the time of writing the caller could have been the component
or its host. §3 names it, and the rest of the document follows from that.

---

## 2. Not in this document

The following belong elsewhere and must not be specified here:

- Geometry, transforms, crop, clipping, and paint order → `07-render-contract.md` §5–§7
- The asset provider's signature and purity requirement → `07-render-contract.md` §4.1, §4.2
- The applier contract and attribute dispatch → `07-render-contract.md` §10
- File shape, key names, and validation → `06-config-schema.md`
- Engine behaviour, the hash, and the effective seed → `02-generation-contract.md`, `04-operations.md`
- Overlay design, repair affordances, and the advisory diagnostics of `06` §10.4 → `09-editor.md`
- How the editor keeps its file continuously valid (§3.4 states the obligation; `09` specifies the mechanism) → `09-editor.md`
- Seed UX, reroll controls, and every authoring affordance → `09-editor.md`
- Asset authoring: file formats, optimization, sprite sheets, export pipeline → `09-editor.md` / `roadmap.md`
- Package versioning and output stability → `05-extension-model.md` §10, `07-render-contract.md` §11

---

## 3. The operating assumption

**`<Tileset>` is the caller.** It receives a parsed `TilesetFile`, invokes `generate()` itself,
and draws the result.

```
<Tileset file={TilesetFile} seed?={string} loadSalt?={uint32} provider={AssetProvider} />
```

Prop names and the full input set are §4's; what this section fixes is the _shape_ of the first
one, because `07` left two readings live and they are not compatible.

**Invariant S1** — _There is one entry point. `<Tileset>` accepts a `TilesetFile` and calls
`generate()`. No component in this package accepts a `Grid<TileState>` as an input._

### 3.1 Why not a pre-generated grid

The rejected alternative is a component taking `(grid, layout)` — a pure drawing surface, with
generation done by whoever mounts it. It is a coherent design and was argued at length before
being rejected. Three things decide it.

**Nothing in the system produces a grid that did not come from a file.** The editor shows the
complete operation stack at all times: editing operation 2 of 5 draws the result of 1 through 5,
because the preview is what the visitor will see and there is no reason for it to be anything
else. There are no isolation previews and no sliced stacks. A component accepting a bare grid
would be accepting a shape nothing ever constructs.

**The pairing cannot be broken.** `07` §5 needs `Layout`, `rows`, `columns`, and `Wpx`. Under S1
the first three arrive inside one object and provably describe one another: `columns` was frozen
against `referenceWidth` by `02` §7.1's derivation, and a file is the unit that guarantee travels
in. A component taking a grid and a `Layout` separately makes a mismatched pair expressible and
undetectable — a grid generated against one `referenceWidth` drawn under another produces a
plausible picture at the wrong scale, which is `07` §3's stated worst outcome arriving through
the front door.

**`defaultSeed`'s justification is cashed here or nowhere.** `02` §4.1 makes the field required
"so that a config renders standalone," and `07` §9.2 reduces seed selection to
`seed = hostSeed ?? file.config.defaultSeed`. Under S1 that policy has exactly one
implementation. Under the alternative it is prose, reimplemented by every host, and `07` §9.3's
warning about `Math.random() * 2**32 | 0` sits in code the package does not own.

**Accepted, not a defect:** S1 is the less reversible choice. Adding a grid-accepting entry point
later means splitting this component into a caller and a drawing surface, which changes what
`<Tileset>` is; the reverse — wrapping a drawing surface in a caller — would have been additive.
The trade was made knowingly: reversibility is a hedge against uncertainty about the consumers,
and the consumers are known. Recorded in the manner of `02` §10.1, and carried to §10 as the
shape any future bare-grid surface would have to take.

### 3.2 Caller and host

`01` §5 defines the **caller** as whatever invokes `generate()`. Under S1 that is the component,
permanently. The package therefore needs a word for what mounts it, and `07` already uses one:
the **host** — the page, the layout, the editor, whatever supplies `Wpx` (§7.3), owns the
provider's error channel (§4.3), and decides the seed.

|            | Is                  | Obligations                                                                                 |
| ---------- | ------------------- | ------------------------------------------------------------------------------------------- |
| **Caller** | `<Tileset>`, always | `07` §9 in full: seed fallback, `loadSalt` held for the session, `file.config` never `file` |
| **Host**   | Whatever mounts it  | Supply a valid file and a provider; own the render box's width and the error channel        |

`07` §9's aside that _"`09` also calls `generate()`, with a completely different seed story"_ no
longer describes what happens. The _policies_ it was protecting remain distinct — the editor
passes a fixed seed and reroll is deliberate; a live page may vary per load — but both express
that policy by choosing props, not by calling the engine. `07` §9 remains correct as a constraint
on the caller; the caller is now a known object rather than an open role.

### 3.3 The editor is a host

`07` §3 says the editor's preview is the renderer with overlays. S1 makes that literal.

**Invariant S2** — _The editor's preview is `<Tileset>` mounted on the file the editor holds,
drawing the complete operation stack. Overlays are drawn over that output and never in place of
it. There is no preview mode, no simplified path, and no second component._

An overlay showing which cells an Operation will act on is drawn from `cellBox` (`07` §8.1,
**R1**) on top of the ordinary picture. It changes what is drawn _over_ the grid, never what the
grid is.

The guarantee this buys: for one `(file, seed, loadSalt)` triple the editor and a production page
produce the same picture, because they run the same code on the same input. Not by convention,
and with no second implementation to drift.

### 3.4 The component trusts its file completely

**Invariant S3** — _`<Tileset>` performs no validation. It reads `file.schemaVersion` and
`file.engineVersion` for nothing, inspects no member of `config` for legality, and has undefined
behaviour on a file that `06`'s `validate()` would reject._

This is `06` **C5** and `07` §9.4 inherited without softening. `06` §10 makes validation a
separate function precisely so the draw path need not carry it, and a component that validated
would be doing at sixty frames per second what belongs at load, once.

The obligation this pushes onto the host is sharper than it first reads. **A host must never hold
an invalid file, not even between keystrokes.** In the editor, in-flight input lives in the input
control, not in the file: a half-typed value commits on parse or on blur, and until it does, the
file retains its last legal value and the preview keeps drawing. Deleting a Tile that operations
reference cascades or is refused; it never lands as a dangling reference. `09` specifies that
discipline, but `08` depends on it, so it is stated here as a constraint on the host rather than
left to be discovered.

**Legal and exportable are different tests.** A new tileset with `rows`, `columns`, and
`defaultSeed` set and empty `tiles` and `operations` is a legal `TilesetFile`. It generates a grid
of `tileId: null` and draws nothing (`02` **G4**) — a blank preview, correctly. Whether it is
worth exporting is an editor judgement in the family of `06` §10.4's advisory diagnostics, and it
is not this component's business. A document therefore begins life as a valid skeleton, and there
is no moment in the editor's lifecycle at which the host has something other than a file to draw.

---

## 4. Inputs

```
<Tileset
  file={TilesetFile}          required
  seed?={string}
  loadSalt?={uint32}
  provider?={AssetProvider}
  onAssetError?={(ref: AssetRef, cause: unknown) => void}
/>
```

Names are settled here but are not load-bearing; nothing in another document cites them.

| Prop           | Required | Default                     | Owned by                                  |
| -------------- | -------- | --------------------------- | ----------------------------------------- |
| `file`         | ✅       | —                           | Host. Parsed, valid, held stable (**S3**) |
| `seed`         |          | `file.config.defaultSeed`   | Host, per `07` §9.2                       |
| `loadSalt`     |          | `0`                         | Host, per `07` §9.3 and §5.1              |
| `provider`     |          | the default provider (§4.2) | Host                                      |
| `onAssetError` |          | none                        | Host, per §4.3                            |

**There is no width prop.** `07` §5.3 makes every quantity a fixed fraction of `Wpx`, so the
component expresses placement in relative units and `Wpx` is whatever width the host's CSS gives
the element. Measuring it would reintroduce exactly what §5.3 exists to remove. Which box's width
that is — border or content — is `07` **Q7** and is answered in §6.2.

**There is no `config` prop and no `layout` prop.** `06` **C1** makes `file.config` safe to pass
and `file` a type error at the engine boundary; splitting the file across two props would hand
the host a way to pair mismatched halves, which §3.1 rejected.

### 4.1 The defaults are deterministic

**Invariant S4** — _`<Tileset {file} />` with no optional props renders one fixed picture:
`seed = file.config.defaultSeed`, `loadSalt = 0`. Variation between loads is always an explicit
act by the host._

Both defaults are already specified elsewhere and are adopted rather than invented. `07` §9.2 is
the whole seed policy and has no null branch because `02` §4.1 makes `defaultSeed` required.
`loadSalt = 0` is `02` §4's signature default, and ADR-002 makes it an ordinary value rather than
an identity — `mixLoad(s, 0) ≠ s`, deliberately, so nothing about `0` is magic and a flagged
Operation at `loadSalt: 0` is simply pinned to one arbitrary arrangement.

S4 is what makes the file self-sufficient: drop it on a page and the picture is the picture the
author approved. A host that wants per-load variation draws a number and passes it, which is one
line and visible in the host's source. The reverse default — a fresh draw unless suppressed —
would make every page nondeterministic by accident, including under SSR, and would put the trap
in `07` §9.3 inside our own component.

### 4.2 The substrate, and what a `Drawable` is

**Invariant S5** — _`Drawable` is `{ src: string }`, drawn as an `<img>` in the DOM. A raster
image and an SVG file are the same thing to the renderer: a sealed picture at a URL._

This answers `07` **Q4**. It is an object rather than a bare string so that the DPR-aware
extension point (`07` §13) can arrive as an additional key rather than as a breaking change to
every provider — the same additive discipline `07` **R4** applies to `meta`, in a runtime type
rather than a file key.

DOM is the substrate, and `07` reads throughout as though it expected one: §6.4 names
`object-fit: cover` first, §7.4 observes that row-major paint order "is what document order gives
a naive DOM implementation, so the correct behaviour is the free one," and §6.3 carries a note
for whoever writes the CSS. SSR settles what remained: `07` §5.3's entire payoff is complete
geometry in the initial HTML, and a canvas server-renders to nothing.

Three `07` invariants become free rather than implemented:

| `07`                                  | In this substrate                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| **R8** — centre-crop before transform | `object-fit: cover`; no measurement, no aspect ratio ever learned                  |
| **R7** — scale 1 is the cell square   | the `<img>` sized to the cell box                                                  |
| **R5** — geometry consults no asset   | geometry is CSS on the cell; the image is asked for afterwards and revises nothing |

Lazy loading is `loading="lazy"`, which is `07` §4.2's "lazily loadable, in any order" obtained
from the platform.

**Tiles are sealed pictures.** An SVG loaded through `<img>` cannot be styled from the host page:
no `currentColor`, no theming, no recolouring. Recolourable tiles would require inlining SVG
markup, which is a different `Drawable` shape and a different draw path — carried to §10 as an
`[EXTENSION POINT]`. Its arrival moves no picture already drawn, so **R14** is untouched by it.

### 4.3 The default provider

`07` §4.4 already names a default provider as `src`'s reader. It is trivial:

```
defaultProvider = (ref) => ({ src: ref.meta.src })
```

It fetches nothing, measures nothing, and caches nothing — it renames one field. `07` **R2**
holds vacuously.

A custom provider exists for hosts that resolve differently: a CDN transform, a bundler-hashed
import map, DPR selection (`07` §13). The signature is `07` §4.1's and this document does not
restate it. **R2**'s purity requirement binds any provider a host supplies, and it is a
requirement the component cannot currently enforce — a provider returning a fresh drawable per
call reintroduces `Math.random()` one layer out, and nothing here detects it (§11 Q1).

**`meta.src` missing or misspelled is a resolution failure, not an empty `<img>`.** `06` **C4**
validates `meta` as an object and inspects nothing inside it, so `"scr"` loads cleanly — `07`
§4.4 records this as the one place a typo is silent. The default provider therefore throws on an
absent or non-string `src` rather than passing `undefined` to the substrate, where it would
render as a broken image and read as a missing file rather than a malformed one.

### 4.4 The error channel

`07` §4.3 routes production failures "through the provider's own error channel, which the host
owns," and leaves the shape here. It needs a different one than `07` imagined, for a reason `07`
could not see from where it stood.

**With a URL-valued `Drawable`, resolution succeeds and loading fails later.** The default
provider hands back a `src` without touching the network. If that URL 404s, the failure happens
in the DOM, later, and the provider never learns of it. `07` §4.3's mechanism covers a provider
that throws; it does not cover the commonest failure in this substrate, which is a file that is
not there.

Worse, the substrate substitutes on its own: a broken `<img>` renders the browser's placeholder
glyph. That is a drawable the renderer did not choose, in a cell **R3** says must draw nothing.

Two failures, one channel:

| Failure        | Detected by                    | Cause                                               |
| -------------- | ------------------------------ | --------------------------------------------------- |
| **Resolution** | the provider throws or rejects | missing `meta.src`; a custom provider's lookup miss |
| **Load**       | the `<img>`'s error event      | 404, network, corrupt or undecodable file           |

**Invariant S6** — _Both failures produce an empty cell and one call to `onAssetError` carrying
the `AssetRef`. Neither leaves a substrate-supplied placeholder on screen. `07` **R3** binds the
load failure exactly as it binds the resolution failure._

`07` §4.3's dev/prod split is inherited unchanged: development throws, production draws a hole
and reports. `onAssetError` fires in both.

**A single channel on the component, rather than leaving it to the provider.** A provider already
knows when _it_ threw, so a callback is redundant for that half — but it cannot know about the
other half, and the default provider is our code, so a host using it has no channel of its own to
report through. One prop covers both, carries the `AssetRef` identifying which tile, and gives
**R3** an enforcement point it otherwise has nowhere.

**Accepted, not a defect:** `07` §4.3's acceptance stands and widens. Whether anyone hears about
a hole depends on the host wiring the prop, and a host that ignores `onAssetError` gets a
silently incomplete background in production. The alternative — failing the whole render over one
missing tile — remains plainly worse.

### 4.5 What is not a prop

**No alt text, and no accessible name.** The output is decorative: the render box is
`aria-hidden`, every image carries `alt=""`. Meaningful content is never a tile. Stated so that
`AssetRef` and `meta` are never asked to grow a description field, and so a host does not go
looking for the prop.

**No callback for the generated grid.** The component holds one and the host has no use for it —
`07` §8's coordinate mapping is what the editor needs (§7), and the grid itself is an internal.
`06` §3.4's "pinning a load is `(seed, loadSalt)` written down" is already satisfied by both being
props the host chose.

---

## 5. SSR and hydration

`07` §5.3 does the work here in advance: every geometric quantity is a fixed fraction of `Wpx`,
so the server emits complete geometry without knowing the viewport, and every `<img>` carries its
`src` in the initial HTML. The browser begins fetching tiles before hydration runs. There is no
layout shift on hydration, as assets arrive, or on resize, because no rect was ever provisional.

What remains is agreement. The server and the client must produce the same grid, and `generate()`
is pure, so this reduces entirely to whether both sides see the same
`(file.config, seed, loadSalt)` triple.

**Invariant S7** — _`<Tileset>` never draws a random number and never reads ambient state. Every
source of variation enters as a prop. `Math.random()` does not appear in the component._

S7 is `02` §4.2's prohibition applied one layer out, and it makes **R12** structural rather than
disciplinary: the component cannot redraw `loadSalt` on a regeneration because it has no draw to
repeat. `07` §9.3's failure — a value redrawn per `generate()`, reshuffling every flagged
Operation on an unrelated config edit — is unreachable from inside.

Under **S4**'s defaults, agreement is automatic: same file, `defaultSeed`, `loadSalt: 0`, both
sides. A host that never opts into per-load variation cannot produce a hydration mismatch.

### 5.1 `07` **Q2**, answered: `loadSalt` is a prop

`07` §9.3 requires server and client to use one value and leaves the mechanism here. Sealing the
draw inside the component would require the component to serialize a number into the page and
recover it on hydration — building a payload channel the framework already owns, in a component
that would then need to know whether it is server-rendering. Exposing it makes the number the
host's, which is where the framework's own data-passing already lives.

In SvelteKit terms, a host wanting per-load variation draws in a `load` function and passes the
result through page data. One draw, serialized by the mechanism built for exactly this, arriving
as an ordinary prop on both sides.

**Drawing it in component initialization, or in a module-level constant, is the mistake.** Both
run twice — once per environment — and produce two pictures for one page. The symptom is a
hydration warning if the substrate checks, and a visible flicker if it does not. Worth stating
plainly because the wrong version is shorter than the right one.

`07` §9.3's draw is inherited verbatim, including its warning:
`Math.floor(Math.random() * 2**32)`, never `| 0`.

### 5.2 What regenerates

`generate()` is invoked when the component mounts and whenever `file.config`, `seed`, or
`loadSalt` changes. Nothing else regenerates — not a `provider` change, not a viewport resize,
not hydration. This is `07` §9.1 with the caller named.

The editor is the case that matters. A designer dragging a weight slider changes `file` on every
frame, so the grid recomputes on every frame, which is correct and cheap. `loadSalt` is unchanged
throughout, so flagged Operations hold still while the designer judges something unrelated — the
outcome `07` §9.3 asks for, obtained without the editor doing anything to preserve it.

Whether the host debounces its own updates before they reach `file` is the host's, and it is the
ordinary way to control this: the component regenerates when the prop changes, so the host
controls regeneration by controlling when the prop changes.

---

## 6. Sizing and the render box

### 6.1 `07` **Q3**, answered: natural height, overridable by CSS

`07` §5.3 gives the render box a natural aspect ratio that is a constant of `Layout` and `rows`:

```
naturalRatio = referenceWidth : (rows − yOffset) * cellSize
```

**Invariant S8** — _The render box declares this ratio and no explicit height. Its height
therefore follows its width, at every width, with no measurement and no script._

This is `07` §5.3's fourth bullet cashed: correct space is reserved before anything is drawn, on
the server, in the initial HTML.

`07` §7.3 notes that vertical bleed requires giving the box _less_ height than natural, and warns
that a component always adopting its natural height forecloses it. Declaring a ratio rather than
a height is what avoids that: an explicit `height` from the host's own CSS wins over the ratio,
the rows beyond it are cut by **R9**, and vertical bleed costs the host one line and no prop. A
host that gives it more height gets empty space below the last row, which `07` §7.3 already calls
well-defined and almost certainly unintended.

Sizing is CSS, not props, for the same reason there is no width prop.

### 6.2 `07` **Q7**, dissolved: the render box has no padding

`07` §5 needs one number and is indifferent to which box it is; §7.2 makes the render box the
only clipping boundary. Picking border-box or content-box would leave a padded host producing two
defensible pictures.

**Invariant S9** — _The component owns the render box element and styles it with no padding and
no border. Its content box and border box coincide, and `Wpx` is unambiguously its width._

Host styling applies to that element from the outside, and padding or a border applied to it is
unsupported rather than interpreted — it is not a way to inset the grid. A host wanting an inset
wraps the component; the wrapper's content width becomes `Wpx` and every rule above holds
unchanged.

The element also establishes the positioning context for cells and carries the clip **R9**
requires.

### 6.3 Placement without measurement, concretely

An illustration in the manner of `07` §3.1 — the mathematics is `07` §5's and the CSS is one way
to express it.

Every quantity in `07` §5.2 is a multiple of the cell's own side, and a cell is square:

```
side / Wpx      = cellSize / referenceWidth                              // a constant
left  in sides  = (referenceWidth − columns * cellSize) / (2 * cellSize) + x
top   in sides  = y − yOffset
```

A cell is therefore given its width as a percentage of the render box, `aspect-ratio: 1` for its
height, and a translation in percentages of its own size — which resolve against the cell, not
the box, and so carry the vertical offset a percentage `top` could not.

```
width: calc(100% * cellSize / referenceWidth);
aspect-ratio: 1;
transform: translate(calc(<left> * 100%), calc(<top> * 100%));
```

Nothing observes the element, and the result is correct at every width.

**A note for whoever writes this.** `07` §6.3 warns that a CSS transform list applies right to
left. The placement translation above composes with the cell's own `scaleX`/`scaleY`/`rotation`,
and the whole list must still read `translate(...) rotate(...) scale(...)` for **D11** to hold.
Placing the translation last inverts the order and produces a picture that looks deliberate.

---

## 7. The exposed surface

`07` **R1** requires one implementation of the coordinate mapping, used by the renderer and by
every overlay. This section gives it a shape.

**Invariant S10** — _`cellBox` and `cellAt` are exported as pure functions of
`(layout, rows, columns, Wpx, …)`, independent of the component. The component computes placement
from them, and `09` draws every overlay from them. Neither reimplements the arithmetic._

Pure functions rather than component methods or context, for three reasons: they are what `07`
**R15**'s geometry vector table tests, with no component mounted; they are callable from a
pointer handler that has no component reference; and a method would tie the mapping's
availability to a mounted instance when the editor may want a rect before anything is drawn.

**The host measures; the renderer does not.** `07` **R5** forbids the _renderer_ consulting or
measuring anything to compute a cell box, and §6.3 shows it never needs to. Converting a pointer
event into render space is `07` §8.2's explicitly-assigned caller work, and it requires the render
box's position on screen. The component therefore exposes its render box element, and an editor
calling `getBoundingClientRect()` on it is doing something **R5** does not touch.

Beyond the element and the two functions, `09` needs nothing from the component. In particular
there is no exported grid: overlays show which cells an Operation _selects_, which `09` derives
from the Operation it is editing, not from the drawn output.

---

## 8. Layers

`03` §8 assigns layer compositing to `07`/`08`; `07` §13 carries it as an `[EXTENSION POINT]` and
fixes only that a layer supplies the paint order **R10** leaves no room for within one grid.

**Layers are not in V1, and V1 needs no feature for them.** `06` §3 gives `TilesetFile` one
`config` and one `layout`, so N grids is a file-shape question and therefore a `schemaVersion`
bump — outside anything `08` can settle.

Meanwhile the host can already stack two `<Tileset>` components with CSS, and the result is
well-defined: each draws its own file, document order supplies the z-order, and the upper one's
empty cells (`02` **G4**) show the lower through. That is `07` §13's "the layer supplies the paint
order," obtained by the host.

**The gap, recorded so it is not mistaken for support:** nothing checks that two stacked files
agree on `rows`, `columns`, `cellSize`, and `referenceWidth`, and two that disagree produce
misaligned grids that look like a rendering fault. A real layer feature exists mainly to enforce
that agreement, and that is what `08` defers — not the drawing, which already works.

---

## 9. Invariants summary

| ID      | Invariant                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------- |
| **S1**  | One entry point. `<Tileset>` accepts a `TilesetFile` and calls `generate()`. Nothing accepts a `Grid<TileState>`.   |
| **S2**  | The editor's preview is `<Tileset>` on the editor's file, full stack. Overlays draw over it, never instead of it.   |
| **S3**  | The component validates nothing and trusts its file. An invalid file is undefined behaviour.                        |
| **S4**  | With no optional props the picture is fixed: `defaultSeed`, `loadSalt: 0`. Variation is always explicit.            |
| **S5**  | `Drawable` is `{ src: string }`, drawn as an `<img>`. Raster and SVG are both sealed pictures.                      |
| **S6**  | Resolution failure and load failure both empty the cell and call `onAssetError`. No substrate placeholder survives. |
| **S7**  | The component draws no random number and reads no ambient state. `Math.random()` does not appear in it.             |
| **S8**  | The render box declares an aspect ratio and no explicit height. Host CSS may override.                              |
| **S9**  | The render box has no padding and no border; `Wpx` is unambiguous.                                                  |
| **S10** | `cellBox` and `cellAt` are exported pure functions. The renderer and every overlay use them.                        |

---

## 10. Extension points

| Point                                                                                       | Status                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recolourable tiles — inlined SVG markup, stylable from the host page                        | `[EXTENSION POINT]` — a second `Drawable` shape and a second draw path; moves no picture already drawn, so **R14** is untouched. Brings a sanitisation obligation and loses image caching.    |
| DPR-aware `Drawable` — `srcset` or a resolution-keyed set                                   | `[EXTENSION POINT]` — an additive key on `Drawable` (**S5**); `07` §13 already places the selection inside the provider                                                                       |
| A bare-grid drawing surface                                                                 | `[EXTENSION POINT]` — would split `<Tileset>` into a caller and a surface, per §3.1. `07` §9's caller policy would move to the caller half; **S1** would be restated rather than removed.     |
| Canvas or WebGL substrate                                                                   | `[EXTENSION POINT]` — `02` **G5** and `07` §3.1 keep it live; gated on node count actually biting, and it forecloses SSR (§4.2)                                                               |
| Layers — N grids with enforced agreement on `rows`, `columns`, `cellSize`, `referenceWidth` | `[EXTENSION POINT]` — §8; a `schemaVersion` bump, so not `08`'s to settle. Owned by `roadmap.md` §4.3, which reconciles this against `03` §8 and `07` §13. Unenforced stacking already works. |
| Non-decorative output — accessible names on tiles                                           | `[POSTPONED]` — §4.5; would require `AssetRef` or `meta` to carry a description, and a reason for a background to be content                                                                  |

---

## 11. Open questions

| #   | Question                                                                           | Status                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Should the component memoize resolution per session, keyed on `(tileId, assetId)`? | **Open.** It would make `07` **R2** structural rather than a provider obligation the component cannot check (§4.3), and it costs one map. Against: it silently repairs an impure provider instead of surfacing it, and a lazy provider's rejection would then be cached too. Leaning yes; recorded rather than decided. |
| 2   | Does **S6** belong in `07` rather than here?                                       | **Resolved — taken.** `07` **R3** now binds resolution failure and load failure alike and cites **S6**. The general statement lives in `07`; the error channel and the substrate-placeholder clause stay here.                                                                                                          |
| 3   | How does the component know whether it is a development or a production build?     | **Open.** `07` §4.3 splits behaviour on it and no document says who decides. A bundler flag ties the package to one toolchain; a prop makes it a host lie waiting to happen; always throwing loses `07` §4.3's deliberate production posture. Resolve during implementation.                                            |
| 4   | Is `Wpx` ever needed before first paint?                                           | **Open.** §6.3 needs no measurement, and §7 hands measurement to the host — but `cellAt` requires a `Wpx` value, and an editor converting a pointer event gets it from the exposed element. If any host needs it earlier, this becomes a real question. Nothing in V1 does.                                             |
| 5   | Should `meta` be validated at all?                                                 | **Open**, unchanged — `07` **Q5**. §4.3's throw on a missing `src` narrows the blast radius to one tile but is not validation.                                                                                                                                                                                          |
| 6   | Does the editor ever want `cellAt` bounded?                                        | **Deferred** → `09-editor.md` (`07` **Q6**). Unaffected by **S10**: bounding is one comparison at the call site either way.                                                                                                                                                                                             |
