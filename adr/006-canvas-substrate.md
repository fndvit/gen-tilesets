# ADR-006 — A canvas substrate, and the renderer measures

> **Status:** Accepted
> **Date:** 2026-08-12
> **Affects:** `07-render-contract.md` §5.3, §5.6, §6.4, **R5**; `08-renderer-svelte.md` §4.2,
> §6.3, §10 (**S5**), §12
> **Raised by:** seams between adjacent tiles that survived two fixes

---

## Context

Adjacent tiles showed hairline gaps of the backdrop. `07` §5.6 (**R6**) names this failure and
its cause exactly — compute each cell's `left` and `size` independently, round both, and the seam
opens — and the pure geometry never did that: `cellBox` derives both sides of every seam from one
expression, and has a test asserting it.

Two fixes shipped before this one.

1. `08` §12 moved placement off `transform: translate()` onto percentage margins and removed
   `will-change: transform` from the cell. Both were real causes; a transformed or
   compositor-promoted element is rasterized at sub-pixel precision, and adjacent antialiased
   edges never sum to full coverage. The seams got much fainter.
2. Nothing else in the geometry was wrong. They were still there.

What remained were two causes that no amount of correct geometry reaches.

**The asset antialiases its own outer edge.** All five demo tiles are `viewBox="0 0 100 100"`
with a background `<rect width="100" height="100">` — the rect *is* the viewBox. Rasterized into a
box that is not a whole number of device pixels, that outer edge antialiases into transparency: a
semi-transparent border baked into the picture. Two neighbours then each contribute partial
coverage to the shared boundary pixel and the backdrop survives between them. The renderer cannot
legislate this away, because in the editor the assets are whatever the author uploaded.

**Any ancestor transform re-rasterizes the subtree and defeats every snap below it.** The editor
does this to itself — `PreviewFrame`'s `transform: scale({zoom})` on the frame. On a page we do
not own it arrives as a parent's `transform`, `filter`, `zoom`, or animation, and the component
has no say in it whatsoever.

The requirement given was that white gaps **cannot** appear on sites we do not control. A grid of
separate elements cannot promise that. Its correctness is always conditional on the host page.

## Decision

**Two changes, and the second is what the first is for.**

### 1. The renderer measures

`edges.ts` computes one array of **integer device-pixel** edges per axis:

```
xEdges[k] = Math.round((originX + s * k * cellSize) * dpr)
```

Cell `x`'s right edge and cell `x+1`'s left edge are **the same array element** — not two
expressions that agree, one value. A gap between them is not unlikely, it is unrepresentable.
This is what `07` §5.6 licenses in the one sentence that anticipated exactly this position:

> Any snapping — if a substrate needs it — is applied to the shared edge, so that both cells move
> together and the seam cannot open.

Snapping in **device** pixels rather than CSS pixels is also what disposes of the asset's own
edge: land the box on the device grid and the asset's boundary lands on it too, fully covered.
Integers rather than a snapped CSS-px float because `Math.round(v * dpr) / dpr` is not exactly
representable at a DPR of 3, and the identity degrades from *identical* to *very close* — which
is the entire guarantee.

That needs `Wpx` and `devicePixelRatio`, so **the renderer now measures**. This contradicts `07`
**R5** and §5.3's flat "no measurement is required".

### 2. A canvas substrate, and it is the default

`<Tileset>` takes `substrate?: "canvas" | "dom"`, defaulting to `"canvas"`. In canvas mode the
render box **is** the `<canvas>`: one element, no per-cell nodes, and adjacent tiles are
neighbouring pixels of one bitmap. No host-page CSS can open a gap between them, because there is
no boundary to open; a parent transform re-rasterizes a picture that is already seamless and the
worst it does is soften it.

`"dom"` keeps the previous substrate — one `<img>` per cell — now placed from the same snapped
edges. It is correct on its own and it is what SSR emits, which is why it survives rather than
being deleted.

## What this costs

| Given up | Where it was stated | Note |
| --- | --- | --- |
| **S5** — a `Drawable` is drawn as an `<img>` | `08` §10 | True of `"dom"` only. `Drawable` is unchanged; the canvas path decodes the same `src`. |
| **R5** / §5.3 — the renderer never measures | `07` §5.2, §5.3 | The letter. The substance survives: `cellBox` is still a pure function of `(Layout, rows, columns, Wpx)`, geometry is still committed before any asset is consulted, and no asset is measured to compute a rect. |
| §4.2 — SSR emits complete geometry | `08` §5 | On the default path only. `substrate="dom"` still does, which is what it is for. |
| §6.4 — the renderer never learns an aspect ratio | `07` §6.4 | **R8**'s centre-crop was `object-fit: cover`; a canvas has no such property, so `coverRect` reads `naturalWidth`/`naturalHeight`. The purpose behind the rule — that no *geometry* depends on an asset — holds: the destination rect is fixed before this is called. |
| `loading="lazy"` | `08` §4 | Assets are keyed on `(tileId, assetId)`, so the distinct set is a handful however large the grid, and nearly all of it is on screen. |

`08` §10 already carried "Canvas or WebGL substrate" as an `[EXTENSION POINT]`, noting it
forecloses SSR. This is that door, opened for a reason §10 did not anticipate: it listed node
count as the gate, and what actually forced it was seams.

**Not given up:** `cellBox`, `cellAt`, `originX`, `originY`, `scaleFactor` and `naturalRatio` are
untouched. `07` §5.4's worked example still holds and **R15**'s two vector tables are unaffected —
the ideal mapping did not move, and a substrate that snaps to the device grid stays within half a
device pixel of it. **R10**'s paint order, **R9**'s single clipping boundary, **R7** and **D11**'s
transform-about-the-centre, **R3**'s draw-nothing-on-failure and **S6**'s error channel all hold
in both substrates.

## Alternatives rejected

**Snap in CSS pixels and keep the DOM.** Shipped as `08` §12 and improved further here. It cannot
promise anything about a host page that re-rasterizes it, and that is the requirement.

**Overlap each cell by a fraction of a pixel.** No measurement, tiny change, and gaps become
impossible because neighbours butt-join under row-major paint order. But the overlap is visible
wherever `opacity < 1` — the artifact originally reported alongside the gaps — so it would have to
be disabled for exactly the cells it was needed on.

**Fix the assets only.** Bleeding each background rect past its viewBox is correct and has been
done to the demo tiles as belt and braces. It cannot be the fix: the editor renders whatever an
author uploads.
