---
title: styles.ts
description: The renderer's one stylesheet, tileset.css, and injectStyles, which puts it wherever a tileset mounts unless the exact rules are already there.
sidebar:
  order: 16
---

**Written from:** `packages/tileset/src/render/styles.ts`, `packages/tileset/src/render/tileset.css`,
`packages/tileset/src/render/css.generated.ts` and `packages/tileset/scripts/gen-css.mjs`, with
`render/styles.test.ts`, and the call sites in `render/Tileset.svelte`.

## Overview

Until the framework-agnostic core, the renderer's CSS lived in the `<style>` blocks of
`<Tileset>` and `<TileDecoration>`, scoped by Svelte. It is now one global file, `tileset.css`,
so a page that does not use Svelte can still get it. A page gets it in one of three ways:

- **Linked by the host:** `@fndvit/gen-tilesets/tileset.css`.
- **Bundled:** `Tileset.svelte` imports the file, so a Svelte host's bundler puts it in `<head>`,
  server-rendered HTML included.
- **Injected:** `injectStyles(box)` runs when a renderer is built and adds the rules only where
  they are missing.

## In detail

### The stylesheet

Every selector is a class **and** a `data-tileset-*` attribute, such as `.cell[data-tileset-cell]`:

- The attribute keeps a rule on the package's own elements. A bare global `.cell` would land on
  the editor's `.cell`s.
- The class gives each rule exactly the specificity the old scoped selector had (`.cell.svelte-xyz`).
  A host's general CSS therefore wins or loses against it exactly as before.

With the attribute alone, a theme rule like `.card div { padding: 1rem }` beat the box and broke
**S9**. There is no `@layer` and no `:where()`: either would let an element reset such as
`img, canvas { max-width: 100%; height: auto }` win.

The canvas sets `max-width: none`. It is wider than its box by the bleed, and that reset used to
clamp it.

### The sentinel and the generated module

`tileset.css` declares `--gen-tilesets: v<hash>` on the box. The hash is FNV-1a over the minified
rules, with that value zeroed. `pnpm css` (`scripts/gen-css.mjs`) does two things:

- It stamps the hash into the CSS file.
- It writes `css.generated.ts`, which holds `TILESET_CSS` (the minified text) and `TILESET_HASH`.

`--check` exits 1 if either file is stale, and `styles.test.ts` runs it.

### `injectStyles(box)`

It returns early when these exact rules already reach `box`. It checks three things, cheapest
first:

1. This document's constructed sheet is already adopted in the root.
2. A `<style data-gen-tilesets="<hash>">` is already in the root.
3. `box` already computes `--gen-tilesets` equal to `TILESET_HASH`. A box not yet attached
   computes nothing, so for one headed for a document it asks a stand-in instead: a hidden
   `div.tileset[data-tileset-box][data-tileset-probe]` appended to `<body>` for one
   `getComputedStyle` and removed (0.9.0). Rejected: reading `document.styleSheets`, whose
   cross-origin sheets throw on read, and waiting until the box is attached, which made the first
   measurement that of an unstyled box. A detached box in a shadow root that is not connected
   cannot be asked, and gets the `<style>`.

Otherwise it styles the root:

- **Where:** the root is `box.getRootNode()`, which is a document, an iframe's document or a
  shadow root. A detached box uses its `ownerDocument`.
- **How:** it prepends a `<style data-gen-tilesets="<hash>">`, so a host override at equal
  specificity wins.
- **If CSP blocks that `<style>`** (it ends up with no sheet), the `<style>` is removed and the
  document is remembered as blocked. A constructed sheet is adopted instead, one per document.
  Adopted sheets cascade after the page's own, so under a strict CSP a host override needs more
  specificity than ours.

### `InstanceStyle`

One tileset instance's own stylesheet: the responsive reservation, whose selectors carry the
instance's id. `new InstanceStyle(parent)`, `.set(css)`, `.remove()`.

- **A `<style>` first in `parent`**, which is the markup `<Tileset>` has always rendered.
- **A constructed sheet if that `<style>` is blocked.** It shares `injectStyles`' memory of blocked
  documents, so a strict-CSP page is tried once in all. The sheet is per instance, its text is
  swapped with `replaceSync`, and `remove()` un-adopts it. That adopted sheets cascade late does not
  matter here, because no host writes rules against these id-scoped selectors.
- **Only a missing sheet marks the document blocked.** An empty one may be rules that did not
  parse, such as an id that breaks the selectors. That instance still falls back to a sheet, but
  `injectStyles` keeps using `<style>` elsewhere in the document.
- **It is judged once it is connected.** A detached `<style>` has no sheet whatever the policy.
  `set()` runs on every render and judges the first time it finds the `<style>` connected.

### Invariants

- **The rules are loaded once per root.** A Svelte host does not get a second, injected copy,
  because the sentinel sees the bundled one.
- **A different version is not "already there".** Its hash differs, so this version's rules are
  added.
- **A strict-CSP document triggers at most one blocked `<style>`.**

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte`, `render/TileDecoration.svelte` | `import "./tileset.css"`, so a bundler puts the rules in `<head>`. |
| `render/renderer.ts` | `injectStyles(box)` in the constructor, before `track`, attached or not. One `InstanceStyle` per wrapper, while the options have responsive rules. |

### Gotchas

- A linked file that has not loaded yet is not seen, so the rules are injected as well. That is
  harmless, because the two copies hold the same rules.
- The server placeholder's responsive reservation is an inline `{@html}` `<style>`
  (`Placeholder.svelte`), so a strict CSP blocks it until hydration. From mount on, the renderer's
  `InstanceStyle` holds it, with the constructed-sheet fallback.
