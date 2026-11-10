import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SEEN_KEY } from "./tour.js";
import { COPY_LABELS, GETTING_STARTED_URL, HIDE_KEY, INSTALL_COMMAND, copyText, hideStore } from "./export-next.js";

function memoryStorage(): Pick<Storage, "getItem" | "setItem"> & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return { items, getItem: (k) => items.get(k) ?? null, setItem: (k, v) => void items.set(k, v) };
}

describe("hideStore", () => {
  it("is not hidden until set, then stays hidden (D-06 B)", () => {
    const storage = memoryStorage();
    const hide = hideStore(() => storage);
    expect(hide.get()).toBe(false);
    hide.set();
    expect(hide.get()).toBe(true);
    expect(storage.items.get(HIDE_KEY)).toBe("1");
    // A second store on the same storage is a reload.
    expect(hideStore(() => storage).get()).toBe(true);
  });

  it("has its own key, apart from the tour's", () => {
    expect(HIDE_KEY).not.toBe(SEEN_KEY);
    expect(HIDE_KEY.startsWith("gen-tilesets.editor.")).toBe(true);
  });

  it("reads a blocked store as not hidden, and never throws", () => {
    const blocked = hideStore(() => {
      throw new Error("SecurityError");
    });
    expect(blocked.get()).toBe(false);
    expect(() => blocked.set()).not.toThrow();
    const failing = hideStore(() => ({
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
    }));
    expect(failing.get()).toBe(false);
    expect(() => failing.set()).not.toThrow();
  });
});

describe("copyText", () => {
  it("writes the text and says Copied", async () => {
    let written = "";
    const state = await copyText("abc", () => ({ writeText: async (t: string) => void (written = t) }));
    expect(state).toBe("copied");
    expect(written).toBe("abc");
    expect(COPY_LABELS[state]).toBe("Copied");
  });

  it("says it couldn't when there is no clipboard or it refuses, and never rejects", async () => {
    expect(await copyText("abc", () => undefined)).toBe("failed");
    expect(await copyText("abc", () => ({ writeText: () => Promise.reject(new Error("NotAllowedError")) }))).toBe("failed");
    expect(
      await copyText("abc", () => {
        throw new Error("no navigator");
      }),
    ).toBe("failed");
  });
});

describe("what the window names", () => {
  it("installs the package this repository publishes", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../../packages/tileset/package.json", import.meta.url), "utf8"));
    expect(INSTALL_COMMAND).toBe(`npm install ${pkg.name}`);
  });

  it("links to a guide that exists in the repository", () => {
    const path = GETTING_STARTED_URL.split("/blob/main/")[1]!;
    expect(() => readFileSync(new URL(`../../../${path}`, import.meta.url))).not.toThrow();
  });
});
