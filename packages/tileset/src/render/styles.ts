/**
 * The renderer's stylesheet, delivered at runtime.
 *
 * `tileset.css` is the source and ships as `@fndvit/gen-tilesets/tileset.css`
 * for a host that links it; `TILESET_CSS` is the same text, generated, for
 * `injectStyles` to put wherever the renderer mounts. A Svelte host gets the file
 * through the bundler too (`Tileset.svelte` imports it, which is what styles
 * server-rendered HTML), and then injection finds it and adds nothing.
 *
 * Plain and rune-free, in a `.ts` file, because `.svelte` cannot be unit-tested
 * here.
 */

import { DEV } from "../dev.js";
import { TILESET_CSS, TILESET_HASH } from "./css.generated.js";

export { TILESET_CSS };

/** Marks the `<style>` `injectStyles` writes; its value is `TILESET_HASH`. */
export const STYLE_ATTRIBUTE = "data-gen-tilesets";

/**
 * One constructed sheet per document, shared by every shadow root in it.
 *
 * Per *document* rather than one per module, because a constructed sheet can
 * only be adopted by the document it was built for: adopting this realm's sheet
 * into an iframe throws `NotAllowedError` (measured, Chrome 156). So the sheet
 * is built with the target document's own `CSSStyleSheet`.
 */
const sheets = new WeakMap<Document, CSSStyleSheet>();

/**
 * Documents whose policy blocked an inline `<style>`. Remembered so a page with a
 * strict CSP is tried once, not once per shadow root, each try being a logged
 * violation and, with a `report-uri`, a report.
 */
const blocked = new WeakSet<Document>();

/** Documents already warned that neither route works. */
const warned = new WeakSet<Document>();

const DOCUMENT_NODE = 9;
const DOCUMENT_FRAGMENT_NODE = 11;

/**
 * Where a stylesheet for `el` has to go: its shadow root, its document, or —
 * for a node not yet attached anywhere — its `ownerDocument`.
 */
function rootOf(el: Element): Document | ShadowRoot | null {
  const top = el.getRootNode();
  return top.nodeType === DOCUMENT_NODE
    ? (top as Document)
    : top.nodeType === DOCUMENT_FRAGMENT_NODE && "host" in top
      ? (top as ShadowRoot)
      : el.ownerDocument;
}

function docOf(root: Document | ShadowRoot): Document {
  return root.nodeType === DOCUMENT_NODE ? (root as Document) : root.ownerDocument!;
}

/**
 * Whether a connected `<style>` with non-empty rules was refused by the page's
 * policy. Chrome leaves a blocked element with no sheet. Firefox and Safari were
 * not measured, so an empty sheet counts as blocked too; the caller only asks
 * about non-empty rules, so an empty sheet cannot be a successful parse of them.
 */
function isBlocked(style: HTMLStyleElement): boolean {
  return style.sheet === null || style.sheet.cssRules.length === 0;
}

/**
 * Makes sure the renderer's rules reach `box`, the tileset's render box. Every
 * instance calls it; all but the first in a root find the rules and return.
 *
 * **Already there?** Checked three ways, cheapest first: our sheet is adopted in
 * the root; our own `<style>` of this exact version is in it; or `box` already
 * computes `--gen-tilesets` equal to `TILESET_HASH` — the sentinel in
 * `tileset.css`, which a bundled or linked copy carries too. The sentinel is
 * what makes a Svelte host load the rules once instead of twice. Twice was
 * harmless between the two copies but not against the host: the later copy
 * decided ties, and in `pnpm dev` a stale injected copy sat beside the
 * hot-reloaded file. Because the value names the exact rules, a copy from
 * another package version does not count, and this version's rules are added.
 *
 * Rejected: a marker attribute alone (the first version). It could not see a
 * bundled copy, and two package versions on one page each saw the other's
 * marker and skipped.
 *
 * A linked file that has not loaded yet is not seen, and the rules are injected
 * as well. That is rare, since a `<link>` in `<head>` holds back the scripts
 * after it, and harmless: the two copies are the same rules.
 *
 * **Where.** `box.getRootNode()`, so a tileset inside a shadow root is styled in
 * that root — a document-level sheet does not reach it — and one inside an
 * iframe in the iframe's document. A node not yet attached anywhere
 * (`getRootNode()` is its own detached ancestor) is styled in its
 * `ownerDocument`: that is the Observable Framework case, where a cell builds
 * `html\`<div>\`` and only then displays it.
 *
 * **How: a `<style>` first, and a constructed sheet only if the `<style>` is
 * blocked.** The order is decided by the cascade, not by preference. Adopted
 * sheets cascade *after* every stylesheet in the document (measured), so a host
 * override at equal specificity would lose to ours. A `<style>` prepended to
 * `<head>` behaves like any library stylesheet: it comes first, and a host's tie
 * goes to the host.
 *
 * A strict CSP (`style-src` without `'unsafe-inline'`) blocks that `<style>`,
 * and the browser leaves it with no sheet (measured, Chrome). In that case it is
 * removed and a constructed sheet is adopted instead, which CSP does not govern.
 * The cost: under such a policy a host override needs more specificity than
 * ours, not equal.
 *
 * Rejected: a constructed sheet first (the original plan) — CSP-proof
 * everywhere, but it makes equal-specificity overrides lose on every page, to
 * help only pages with a strict policy.
 */
export function injectStyles(box: Element): void {
  const root = rootOf(box);
  if (root === null) return;
  const doc = docOf(root);

  const adopted = sheets.get(doc);
  if (adopted !== undefined && root.adoptedStyleSheets?.includes(adopted)) return;
  if (root.querySelector(`style[${STYLE_ATTRIBUTE}="${TILESET_HASH}"]`) !== null) return;
  const view = doc.defaultView;
  if (box.isConnected && view?.getComputedStyle(box).getPropertyValue("--gen-tilesets").trim() === TILESET_HASH) {
    return;
  }

  if (!blocked.has(doc)) {
    const style = doc.createElement("style");
    style.setAttribute(STYLE_ATTRIBUTE, TILESET_HASH);
    style.textContent = TILESET_CSS;
    const parent = root === doc ? (doc.head ?? doc.documentElement) : root;
    parent.prepend(style);
    // A shadow root not yet in the document gives no `<style>` a sheet, policy
    // or none, so there is nothing to judge yet. The element stays and applies
    // once the root is connected.
    if (!style.isConnected) return;
    if (!isBlocked(style)) return;
    style.remove();
    blocked.add(doc);
  }

  const Sheet = view?.CSSStyleSheet;
  if (Sheet === undefined || root.adoptedStyleSheets === undefined) {
    // Neither route works: a strict CSP in an engine without constructable
    // sheets (Safari before 16.4). Linking `tileset.css` fixes it, so this is a
    // development warning rather than a throw in front of a visitor, once per
    // document.
    if (DEV && !warned.has(doc)) {
      warned.add(doc);
      console.warn("gen-tilesets: styles were blocked by CSP; link `@fndvit/gen-tilesets/tileset.css` instead.");
    }
    return;
  }
  let sheet = adopted;
  if (sheet === undefined) {
    sheet = new Sheet();
    sheet.replaceSync(TILESET_CSS);
    sheets.set(doc, sheet);
  }
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
}

/**
 * One tileset instance's own stylesheet: the responsive reservation, whose
 * selectors carry the instance's id (`reservationCss`). It lives exactly as long
 * as the instance has rules.
 *
 * **A `<style>` first in `parent`, and a constructed sheet only if that is
 * blocked** — the same order as {@link injectStyles}, and it shares that
 * function's memory of which documents block inline styles, so a page with a
 * strict CSP is tried once in all. The `<style>` is the default because it is
 * exactly the markup `<Tileset>` has always rendered, so the server-rendered
 * HTML question (Block 5) is unchanged by this.
 *
 * The fallback differs from `injectStyles`' in one way: the sheet is **per
 * instance**, not shared, because its text is this instance's alone and is
 * swapped with `replaceSync` when the rules change. That adopted sheets cascade
 * after the document's does not matter here, as it does for the shared rules:
 * these selectors are scoped to one wrapper's id, and no host writes a rule
 * against them to be overridden.
 *
 * **When it is judged.** A `<style>` in a node that is not connected has no sheet
 * whatever the policy, so nothing can be concluded until it is — the Observable
 * case, where a cell builds its element and only then displays it. {@link set}
 * is called on every render and judges the first time it finds the `<style>`
 * connected.
 *
 * Before 0.9.0 this was inline `{@html}` only, and under a strict CSP the
 * reservation silently did nothing: no reserved height before measurement.
 *
 * Rejected: the shared sheet `injectStyles` adopts, with every instance's rules
 * appended. Removing one instance's rules would mean finding them again by
 * text, and the sheet would outlive every instance that wrote to it.
 */
export class InstanceStyle {
  #style: HTMLStyleElement | null = null;
  #sheet: CSSStyleSheet | null = null;
  #root: Document | ShadowRoot | null = null;
  #text = "";
  #judged = false;

  constructor(parent: Element) {
    const root = rootOf(parent);
    if (root !== null && blocked.has(docOf(root))) {
      this.#adopt(root);
    } else {
      const style = parent.ownerDocument.createElement("style");
      parent.prepend(style);
      this.#style = style;
    }
  }

  /** Sets the rules. Cheap when `css` is unchanged and the verdict is in. */
  set(css: string): void {
    const changed = css !== this.#text;
    this.#text = css;
    if (this.#sheet !== null) {
      if (changed) this.#sheet.replaceSync(css);
      return;
    }
    const style = this.#style;
    if (style === null) return;
    if (changed) style.textContent = css;
    if (this.#judged || css === "" || !style.isConnected) return;
    this.#judged = true;
    if (!isBlocked(style)) return;
    const root = rootOf(style);
    // Only a missing sheet is evidence about the page's policy. An empty one may
    // be rules that did not parse — an id that breaks its selectors — and must
    // not mark the document blocked for every `injectStyles` after it.
    const policy = style.sheet === null;
    style.remove();
    this.#style = null;
    if (root === null) return;
    if (policy) blocked.add(docOf(root));
    this.#adopt(root);
  }

  /** Removes the rules from wherever they went. Idempotent. */
  remove(): void {
    this.#style?.remove();
    this.#style = null;
    const root = this.#root;
    const sheet = this.#sheet;
    if (root !== null && sheet !== null && root.adoptedStyleSheets !== undefined) {
      root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== sheet);
    }
    this.#sheet = null;
    this.#root = null;
  }

  #adopt(root: Document | ShadowRoot): void {
    const Sheet = docOf(root).defaultView?.CSSStyleSheet;
    // Neither route works; `injectStyles` has already warned about this
    // document, and a missing reservation costs a reflow, not a wrong picture.
    if (Sheet === undefined || root.adoptedStyleSheets === undefined) return;
    const sheet = new Sheet();
    sheet.replaceSync(this.#text);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    this.#sheet = sheet;
    this.#root = root;
    this.#judged = true;
  }
}
