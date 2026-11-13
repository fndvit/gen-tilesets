/**
 * "Your tileset is downloading" — what to do with `tileset.zip` once Export has
 * written it (batch 03, T-08, B-030). `SidebarTopBar` opens the window after a
 * zip export succeeds; this module holds what it says that may change, and the
 * "Don't show again" flag, so both are tested without a component.
 *
 * ## Shown every time until "Don't show again" (Pol, D-06 B)
 *
 * Someone exporting over and over while they iterate should not have to close
 * it each time forever, but it should not vanish before they chose to stop it.
 * Rejected: only the first export (C), which hides the steps from someone who
 * dismissed them before they were ready to use the file.
 *
 * The flag is kept the way the tour's seen flag is (`seenStore` in `tour.ts`):
 * one namespaced `localStorage` key, every access behind try/catch. A blocked
 * store reads as "not hidden", so the window keeps showing; that is the safe
 * side, since it never stops an export.
 */

/**
 * The guide the window links to. **There is no deployed docs site**, so this is
 * the page's source on GitHub, as the package README links it. One constant, so
 * a docs site changes it in one place.
 */
export const GETTING_STARTED_URL =
  "https://github.com/fndvit/gen-tilesets/blob/main/apps/docs/src/content/docs/guides/getting-started.md";

/**
 * The install command the window shows and copies. The package name, not a
 * version: consumers pin an exact version (CLAUDE.md, Versioning), and the
 * version a user should pin is the one current when they install, which npm
 * writes into their `package.json` itself.
 */
export const INSTALL_COMMAND = "npm install @vit-foundation/gen-tilesets";

/** Namespaced like `tour.ts`'s `SEEN_KEY`: a `localStorage` key is shared by the whole origin. */
export const HIDE_KEY = "gen-tilesets.editor.exportNextHidden";

export interface HideStore {
  /** True once "Don't show again" was pressed in this browser. False when storage is blocked. */
  get(): boolean;
  /** Records it. Silent when storage is blocked: the window shows again next export. */
  set(): void;
}

/**
 * The flag. `storage` is a function so that even reaching `localStorage`,
 * which itself can throw, is inside the try.
 */
export function hideStore(storage: () => Pick<Storage, "getItem" | "setItem"> = () => globalThis.localStorage): HideStore {
  return {
    get() {
      try {
        return storage().getItem(HIDE_KEY) === "1";
      } catch {
        return false;
      }
    },
    set() {
      try {
        storage().setItem(HIDE_KEY, "1");
      } catch {
        // Nothing to do: the window shows again on the next export.
      }
    },
  };
}

/** What the copy button says: before, after a copy, or after a refused one. */
export type CopyState = "idle" | "copied" | "failed";

export const COPY_LABELS: Record<CopyState, string> = {
  idle: "Copy",
  copied: "Copied",
  // The command stays on screen as selectable text, so the fallback is to select it.
  failed: "Couldn't copy",
};

/**
 * Copies `text`. Resolves to what the button should say; never rejects. The
 * Clipboard API is missing outside a secure context and rejects when the page
 * lacks permission, and neither may break the window.
 */
export async function copyText(
  text: string,
  clipboard: () => Pick<Clipboard, "writeText"> | undefined = () => globalThis.navigator?.clipboard,
): Promise<CopyState> {
  try {
    const target = clipboard();
    if (target === undefined) return "failed";
    await target.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
