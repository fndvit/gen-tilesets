// @vitest-environment happy-dom
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
// Node's `URL`: happy-dom replaces the global one, which rejects `file:`.
import { fileURLToPath, URL as NodeURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TILESET_HASH } from "./css.generated.js";
import type * as Styles from "./styles.js";

// A fresh module per test: `styles.ts` keeps per-document state (the shared
// sheet, the blocked set), and a test must not inherit an earlier test's.
let injectStyles: typeof Styles.injectStyles;
let STYLE_ATTRIBUTE: string;
let TILESET_CSS: string;
beforeEach(async () => {
  vi.resetModules();
  ({ injectStyles, STYLE_ATTRIBUTE, TILESET_CSS } = await import("./styles.js"));
});

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  document.adoptedStyleSheets = [];
  vi.restoreAllMocks();
});

const marked = (root: Document | ShadowRoot) => root.querySelectorAll(`[${STYLE_ATTRIBUTE}]`);

/** A render box as the components write it: the class and the attribute. */
function makeBox(): HTMLElement {
  const box = document.createElement("div");
  box.className = "tileset";
  box.setAttribute("data-tileset-box", "");
  return box;
}

function shadowHost(): ShadowRoot {
  const host = document.createElement("div");
  document.body.append(host);
  return host.attachShadow({ mode: "open" });
}

/** What a CSP-blocked `<style>` looks like in Chrome: connected, with no sheet. */
const blockInlineStyles = () => vi.spyOn(HTMLStyleElement.prototype, "sheet", "get").mockReturnValue(null);

describe("TILESET_CSS", () => {
  it("is generated from tileset.css and has not drifted", () => {
    const script = fileURLToPath(new NodeURL("../../scripts/gen-css.mjs", import.meta.url));
    // Throws, with the script's message, if either file is stale.
    execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" });
  });

  it("never selects on a class alone, so no rule lands on a host's own `.cell`", () => {
    const source = readFileSync(new NodeURL("./tileset.css", import.meta.url), "utf8");
    for (const css of [source.replace(/\/\*[\s\S]*?\*\//g, ""), TILESET_CSS]) {
      const selectors = [...css.matchAll(/(?:^|})\s*([^{}@]+?)\s*{/g)].map((m) => m[1]!);
      expect(selectors.length).toBeGreaterThan(5);
      for (const selector of selectors) {
        // Compounds are the runs between combinators. Bracket and paren contents
        // are masked first (same length) so a space or `>` inside them is not one.
        const masked = selector.replace(/\[[^\]]*\]|\([^)]*\)/g, (m) => "_".repeat(m.length));
        for (const run of masked.matchAll(/[^\s>+~]+/g)) {
          const compound = selector.slice(run.index, run.index + run[0].length);
          if (/\.[a-z]/i.test(run[0])) expect(compound, selector).toMatch(/\[data-tileset-/);
        }
      }
    }
  });

  it("carries the sentinel the injector compares against", () => {
    expect(TILESET_CSS).toContain(`--gen-tilesets:${TILESET_HASH}`);
  });
});

describe("injectStyles", () => {
  it("inserts one <style>, first in <head>, however many instances mount", () => {
    document.head.append(document.createElement("link"));
    for (let i = 0; i < 5; i++) {
      const box = makeBox();
      document.body.append(box);
      injectStyles(box);
    }
    const styles = marked(document);
    expect(styles).toHaveLength(1);
    expect(document.head.firstElementChild).toBe(styles[0]);
    expect(styles[0]!.getAttribute(STYLE_ATTRIBUTE)).toBe(TILESET_HASH);
    expect(styles[0]!.textContent).toBe(TILESET_CSS);
    expect(document.adoptedStyleSheets).toHaveLength(0);
  });

  it("adds nothing when these rules already reach the box (a bundled or linked copy)", () => {
    const bundled = document.createElement("style");
    bundled.textContent = TILESET_CSS;
    document.head.append(bundled);
    const box = makeBox();
    document.body.append(box);
    expect(getComputedStyle(box).getPropertyValue("--gen-tilesets").trim()).toBe(TILESET_HASH);
    injectStyles(box);
    expect(marked(document)).toHaveLength(0);
  });

  it("adds its rules when another version's are on the page", () => {
    const other = document.createElement("style");
    other.setAttribute(STYLE_ATTRIBUTE, "v12345678");
    other.textContent = TILESET_CSS.replace(TILESET_HASH, "v12345678");
    document.head.append(other);
    const box = makeBox();
    document.body.append(box);
    injectStyles(box);
    expect(marked(document)).toHaveLength(2);
    expect(document.head.firstElementChild!.getAttribute(STYLE_ATTRIBUTE)).toBe(TILESET_HASH);
  });

  it("styles a shadow root in the shadow root, not the document", () => {
    const shadow = shadowHost();
    const box = makeBox();
    shadow.append(box);
    injectStyles(box);
    injectStyles(box);
    expect(marked(shadow)).toHaveLength(1);
    expect(shadow.firstChild).toBe(marked(shadow)[0]);
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("recognises a shadow root in an engine without constructable sheets", () => {
    const shadow = shadowHost();
    Object.defineProperty(shadow, "adoptedStyleSheets", { value: undefined });
    const box = makeBox();
    shadow.append(box);
    injectStyles(box);
    expect(marked(shadow)).toHaveLength(1);
    expect(marked(document)).toHaveLength(0);
  });

  it("keeps the <style> in a shadow root that is not connected yet", () => {
    const shadow = document.createElement("div").attachShadow({ mode: "open" });
    const box = makeBox();
    shadow.append(box);
    injectStyles(box);
    expect(marked(shadow)).toHaveLength(1);
    expect(shadow.adoptedStyleSheets).toHaveLength(0);
  });

  it("styles a detached node in its ownerDocument", () => {
    const outer = document.createElement("div");
    const box = makeBox();
    outer.append(box);
    injectStyles(box);
    expect(marked(document)).toHaveLength(1);
  });

  it("adopts one constructed sheet when CSP blocks the <style>, and tries the <style> once", () => {
    const sheet = blockInlineStyles();
    const shadows = [shadowHost(), shadowHost()];
    const inDoc = makeBox();
    document.body.append(inDoc);
    const inShadows = shadows.map((s) => s.appendChild(makeBox()));

    for (let i = 0; i < 3; i++) {
      injectStyles(inDoc);
      for (const box of inShadows) injectStyles(box);
    }

    expect(marked(document)).toHaveLength(0);
    // One `<style>` was ever judged; the document is remembered as blocked.
    expect(sheet).toHaveBeenCalledTimes(1);
    expect(document.adoptedStyleSheets).toHaveLength(1);
    for (const s of shadows) {
      expect(marked(s)).toHaveLength(0);
      expect(s.adoptedStyleSheets).toEqual(document.adoptedStyleSheets);
    }
  });

  it("keeps a host's own adopted sheets when it adopts", () => {
    blockInlineStyles();
    const mine = new CSSStyleSheet();
    document.adoptedStyleSheets = [mine];
    const box = makeBox();
    document.body.append(box);
    injectStyles(box);
    expect(document.adoptedStyleSheets).toHaveLength(2);
    expect(document.adoptedStyleSheets[0]).toBe(mine);
    expect(document.adoptedStyleSheets[1]!.cssRules.length).toBeGreaterThan(0);
  });
});
