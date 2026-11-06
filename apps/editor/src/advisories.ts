/**
 * The notices the editor raises — `09` §12.2's advisories and §12.3's asset
 * failures, written as `Notice`s (`notices.ts`).
 *
 * Every detection here is a pure function of what it is given. **E16** for each
 * advisory: it never blocks, never modifies the file, and is never styled as an
 * error. The package has no diagnostics helper, so the detections are the
 * editor's.
 *
 * Three advisories are not here, because they are about one control and are
 * shown inline at it (`ui/Advisory.svelte`): 6 (two tiles share a name), 8 (a
 * palette reordered under `random`) and 9 (rotation ends that coincide).
 *
 * ## Conditions and events
 *
 * `documentNotices` derives the conditions from the document, so they go away
 * by themselves. `exportedEmpty` and `importNotices` follow an event that
 * leaves no trace in the document, and are pushed.
 */

import type { TilesetFile } from "@vit-foundation/gen-tilesets";
import type { Notice } from "./notices.js";
import type { Orphan } from "./orphans.js";
import { inertFlags } from "./reseed.js";

/** "1 picture", "3 pictures". */
function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Advisory 1 — `columns`' parity does not match `horizontalAlignment` (`06`
 * §10.4). `"column"` needs an odd count, `"gutter"` an even one
 * (`derive.ts`). Unreachable by editing: every Grid & size edit derives
 * `columns` again. Import only.
 */
export function parityMismatch(file: TilesetFile): Notice | null {
  const { columns } = file.config;
  const alignment = file.layout.horizontalAlignment;
  if ((columns % 2 === 1) === (alignment === "column")) return null;
  return {
    key: "parity",
    signature: `${columns}:${alignment}`,
    kind: "advisory",
    title: "The column count doesn't match the alignment",
    data: [`${columns} columns, aligned on a ${alignment}`],
    body:
      `Aligning on a ${alignment} needs an ${alignment === "column" ? "odd" : "even"} count, so ` +
      "the picture isn't centred. Any change in Grid & size counts the columns again.",
  };
}

/**
 * Advisory 4 — `columns × cellSize < referenceWidth` (`06` §10.4). The grid
 * leaves gaps at the edges, which `derive.ts` exists to prevent. Import only.
 */
export function narrowGrid(file: TilesetFile): Notice | null {
  const { columns } = file.config;
  const { cellSize, referenceWidth } = file.layout;
  const width = columns * cellSize;
  if (width >= referenceWidth) return null;
  return {
    key: "narrow-grid",
    signature: `${columns}:${cellSize}:${referenceWidth}`,
    kind: "advisory",
    title: "The grid is narrower than the design width",
    data: [`${columns} × ${cellSize} px = ${width} px, under ${referenceWidth} px`],
    body: "Gaps show at the sides of the picture. Any change in Grid & size counts the columns again.",
  };
}

/**
 * Advisory 2 — `reseedOnLoad` on an Operation whose Source is not stochastic
 * (`06` §10.4). Reported, never cleared: the flag still moves the Operation's
 * `random` Selection (`04` §8.2), so clearing it would change the picture.
 */
export function inertReseed(file: TilesetFile): Notice | null {
  const ops = inertFlags(file.config);
  if (ops.length === 0) return null;
  const ids = ops.map((op) => op.id);
  return {
    key: "inert-reseed",
    signature: ids.join(","),
    kind: "advisory",
    title: "Reseed on load over a source that isn't random",
    data: ids.map((id) => `${id} · ${ops.find((op) => op.id === id)!.source.type}`),
    body: "On a fresh load only their random selection moves.",
  };
}

/**
 * Advisory 7 — a non-square asset is centre-cropped (`07` **R8**). The only
 * reader of the `meta.width` / `meta.height` that **E13** writes at attach. An
 * asset without both numbers is skipped, never guessed.
 */
export function nonSquare(file: TilesetFile): Notice | null {
  const lines: string[] = [];
  for (const tile of file.config.tiles) {
    for (const asset of tile.assets) {
      const { width, height } = asset.meta ?? {};
      if (typeof width !== "number" || typeof height !== "number") continue;
      if (width !== height) lines.push(`${tile.name} · ${asset.id} · ${width} × ${height}`);
    }
  }
  if (lines.length === 0) return null;
  const one = lines.length === 1;
  return {
    key: "non-square",
    signature: lines.join("\n"),
    kind: "advisory",
    title: one ? "A picture isn't square" : `${lines.length} pictures aren't square`,
    data: lines,
    body: one ? "It is cropped to its centre square." : "They are cropped to their centre square.",
  };
}

/** More than three "Open" buttons would crowd a 360px notice; the rest are in its data. */
export const MAX_OPEN_ACTIONS = 3;

/**
 * Advisory 3, widened by §9.4 — Operations a resize left reaching fewer cells.
 * `04` §4.4's distinction survives in the wording: a `cellList` is told how
 * many entries are unreachable, a Selection that matches nothing is told so.
 *
 * With `onOpen`, the notice carries "Open op-2", one action per orphaned
 * Operation up to `MAX_OPEN_ACTIONS` (Pol, W4). The caller routes it through
 * the unsaved-changes guard (`opening.svelte.ts`).
 */
export function orphanedNotice(
  orphans: readonly Orphan[],
  onOpen?: (operationId: string) => void,
): Notice | null {
  if (orphans.length === 0) return null;
  return {
    key: "orphaned",
    signature: JSON.stringify(orphans),
    kind: "advisory",
    title: orphans.length === 1 ? "An operation lost cells in a resize" : "Operations lost cells in a resize",
    data: orphans.map((o) => {
      const lost = o.authored === undefined ? 0 : o.authored - o.reachable;
      const what =
        o.authored !== undefined
          ? `${lost} of ${count(o.authored, "painted cell", "painted cells")} outside the grid`
          : o.empty
            ? "wholly outside the grid, selects nothing"
            : "reaches fewer cells than it did";
      return `${o.operationId} · ${o.selectionType}: ${what}`;
    }),
    body: "Nothing was moved for you. Undo puts the grid back, or edit the selection.",
    ...(onOpen
      ? {
          actions: orphans.slice(0, MAX_OPEN_ACTIONS).map((o) => ({
            label: `Open ${o.operationId}`,
            run: () => onOpen(o.operationId),
          })),
        }
      : {}),
  };
}

/**
 * §12.3 — pictures that did not resolve or load, collapsed into one notice. A
 * failure, so it is announced assertively and drawn with the alert icon.
 */
export function assetFailures(failures: readonly string[]): Notice | null {
  if (failures.length === 0) return null;
  const one = failures.length === 1;
  return {
    key: "asset-failures",
    signature: failures.join("\n"),
    kind: "failure",
    title: one ? "A picture didn't load" : `${failures.length} pictures didn't load`,
    data: failures,
    body: one ? "Its cells draw nothing. Attach the file again in Tiles." : "Their cells draw nothing. Attach the files again in Tiles.",
  };
}

/** Every condition the document holds now, in the order they show (failures first). */
export function documentNotices(
  file: TilesetFile,
  orphans: readonly Orphan[],
  failures: readonly string[],
  onOpen?: (operationId: string) => void,
): Notice[] {
  return [
    assetFailures(failures),
    orphanedNotice(orphans, onOpen),
    nonSquare(file),
    inertReseed(file),
    parityMismatch(file),
    narrowGrid(file),
  ].filter((n): n is Notice => n !== null);
}

/** Advisory 5, after an export (`08` §3.4): it never blocks the export. */
export const exportedEmpty: Notice = {
  key: "exported-empty",
  kind: "advisory",
  title: "Exported, but it draws nothing",
  body: "The document has no tiles, no operations, or only empty palette entries.",
};

/** What an import that opened leaves to say (§12.4). */
export interface ImportNotes {
  /** `migrate()`'s steps, when an older file was upgraded. */
  upgrades: readonly { from: number; note: string }[];
  /** Assets the archive carried that could not be attached. */
  failed: readonly { tileId: string; assetId: string; reason: string }[];
}

/**
 * The notices an import that opened pushes. The upgrade is an advisory
 * (**E16**).
 *
 * A picture the archive did not carry is **not** here: its asset has no file,
 * so it fails to draw and §12.3's `assetFailures` reports it ("no file
 * attached"). Reporting it here too showed the same picture twice.
 */
export function importNotices(notes: ImportNotes): Notice[] {
  const out: Notice[] = [];
  if (notes.failed.length > 0) {
    out.push({
      key: "import-failed",
      signature: notes.failed.map((f) => `${f.tileId}/${f.assetId}`).join("\n"),
      kind: "failure",
      title:
        notes.failed.length === 1 ? "A picture couldn't be read" : `${notes.failed.length} pictures couldn't be read`,
      data: notes.failed.map((f) => `${f.tileId}/${f.assetId}: ${f.reason}`),
    });
  }
  if (notes.upgrades.length > 0) {
    out.push({
      key: "import-upgraded",
      signature: notes.upgrades.map((s) => s.from).join(","),
      kind: "advisory",
      title: "Upgraded from an older version",
      data: notes.upgrades.map((s) => `schemaVersion ${s.from}: ${s.note}`),
      body: "Export to save the new form. Older builds won't read it.",
    });
  }
  return out;
}
