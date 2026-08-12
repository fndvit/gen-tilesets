/**
 * The document — `09-editor.md` §4.
 *
 * **Invariant E3** — *the editor's document state **is** a `TilesetFile`, plus
 * transient UI state held beside it. There is no second document model that
 * projects to a file on export.*
 *
 * The rejected alternative is a richer internal model carrying collapsed panels,
 * an Operation's muted flag, an asset's pre-optimization original, emitting a
 * `TilesetFile` when asked. It is the obvious architecture and it loses for the
 * reason `08` §3.1 rejected split `config`/`layout` props: it makes a mismatched
 * pair expressible. `08` **S2** requires the preview to be `<Tileset>` mounted on
 * the editor's file, so a file must exist and be live at every instant
 * regardless. A second model does not remove that requirement; it adds a
 * projection alongside it, and a projection can differ from what previews.
 *
 * **Invariant E5** — *every editor action that touches the file is a function
 * `TilesetFile -> TilesetFile` that is defined on every legal file and produces a
 * legal file. In-flight input lives in the input control and reaches the file
 * only when it parses.*
 *
 * That is what this module is: `Transition` and the functions returning one.
 * Nothing else may write to the document. `08` §3.4 states the obligation from
 * the other side — *"a host must never hold an invalid file, not even between
 * keystrokes"* — and assigns the mechanism here.
 *
 * **Invariant E4** — *the editor writes nothing into any `meta` block beyond the
 * keys `07` §4.4 declares.* `meta` is not a place to park editor state. It is
 * tempting precisely because `06` **C4** exempts it from strictness, and that is
 * the reason to refuse it: `07` **R4** makes `meta` additive-only, so a key
 * published there is never removed and never retyped. An editor concern parked
 * there becomes permanent and reaches the asset provider of every host.
 *
 * Transient UI state lives **beside** the file, keyed by the identifiers the file
 * already carries — `Operation.id`, `Tile.id`, `TileAsset.id` (§4.1). It is
 * session-scoped and does not survive a reload.
 */

import type { Layout, Operation, Tile, TileAsset, TilesetFile } from "@tileset/core";
import { deriveColumns } from "./derive.js";
import {
  parseCellSize,
  parseReferenceWidth,
  parseRows,
  parseWeight,
  parseYOffset,
} from "./fields.js";
import { nextSalt } from "./reseed.js";
import { memorableSeed } from "./seed.js";

/**
 * The only shape allowed to change the document.
 *
 * **Total on legal input.** A transition is defined on every legal file and
 * produces a legal file — it never returns `null`, never throws to signal
 * refusal, and never lands a half-change. A refusal is expressed by returning
 * the file unchanged, which §4.2 requires for the two cases it names: a deletion
 * that would dangle a reference "either removes those entries in the same
 * transition or is refused with the references named", and §10.2's last non-zero
 * weight, which "the editor does not permit to be zeroed".
 *
 * Whole-value rather than in-place mutation, because **E6**'s undo is a stack of
 * files: "`TilesetFile` is plain serializable data, edits are whole transitions,
 * and the engine is pure, so a restored file is a restored picture with nothing
 * else to reset."
 */
export type Transition = (file: TilesetFile) => TilesetFile;

/**
 * The engine and renderer package that both previews this document and stamps
 * its `engineVersion` — **E2**, one pinned version.
 *
 * `engineVersion` is truthful only if these are the same package. "An editor
 * previewing with engine 1.5 while stamping 1.4 shows the author a picture no
 * consumer of that file will get." Supplied by Vite from
 * `packages/tileset/package.json` at config time, so there is one number and no
 * way to write it down twice.
 */
declare const __ENGINE_VERSION__: string;
export const ENGINE_VERSION: string = __ENGINE_VERSION__;

/**
 * A fresh document — `08` §3.4's *"valid skeleton"*.
 *
 * `06` §5 makes `tiles` and `operations` both legal when **empty**: "an empty
 * file is the state a fresh editor document is in, and it generates a grid of
 * `tileId: null` — legal, and renders nothing (**G4**). Rejecting it would mean
 * the editor cannot save a document until it is finished."
 *
 * So there is no moment in the editor's lifecycle at which the host has
 * something other than a file to draw, which is what **S3** requires.
 *
 * ## The starting numbers
 *
 * **UI constants with no authority anywhere**, recorded in `DECISIONS.md`. No
 * spec section supplies them; `08` §3.4 only requires that the skeleton be valid.
 *
 * `02` §7.1 derives `ceil(1000 / 100) = 10`, which is already even and so takes
 * no parity correction against `"gutter"`. The result is `columns: 10`, a grid
 * design width of exactly 1000, and **no bleed** — a grid that fills its box
 * exactly. The bleed of `02` §7.2 appears the moment the author touches the
 * design width, which is where it is legible as a consequence rather than as a
 * mysterious starting condition.
 *
 * `yOffset: 0` is the identity — no offset, row 0 unclipped — rather than a
 * chosen number.
 */
const NEW_CELL_SIZE = 100;
const NEW_REFERENCE_WIDTH = 1000;
const NEW_ROWS = 5;
const NEW_ALIGNMENT = "gutter" as const;

export function newDocument(): TilesetFile {
  return {
    // Required. Absent or unknown is a load failure (`06` **C2**). 2 since
    // ADR-005 added the `scale` attribute.
    schemaVersion: 2,
    // Required, advisory, never validated against anything (`06` **C3**). E2
    // makes it truthful by construction.
    engineVersion: ENGINE_VERSION,

    config: {
      rows: NEW_ROWS,
      // Derived, never authored (`02` §7.1, `09` §9.1). Written here rather than
      // hardcoded so E1's guarantee holds from the first document rather than
      // from the first edit.
      columns: deriveColumns(NEW_REFERENCE_WIDTH, NEW_CELL_SIZE, NEW_ALIGNMENT),
      // Required, so a config renders standalone (`02` §4.1). §8.2: the editor
      // offers a generated memorable seed, because a seed's value is that it can
      // be written down and returned to.
      defaultSeed: memorableSeed(),
      // `06` §5.1 makes both optional, and §11.3 makes the editor write every
      // field explicitly regardless: "the defaults exist so hand-written
      // fixtures stay short, not so saved files can be sparse."
      assetSalt: 0,
      reseedAssetsOnLoad: false,
      tiles: [],
      operations: [],
    },

    layout: {
      cellSize: NEW_CELL_SIZE,
      // NOT `columns * cellSize` — the difference is the intentional bleed, and
      // it is stored rather than derived because a renderer that recomputed it
      // would produce the layout the design marks as wrong (`02` §7.2).
      referenceWidth: NEW_REFERENCE_WIDTH,
      yOffset: 0,
      // Authoring metadata. Its only function is constraining parity during
      // derivation; the renderer never reads it (`02` §7.3).
      horizontalAlignment: NEW_ALIGNMENT,
    },
  };
}

// ---------------------------------------------------------------------------
// Layout transitions — `09` §9.1, §9.3; `02` §7.1
// ---------------------------------------------------------------------------

/**
 * `09` §9.1 divides the *controls*, which is not `02` §7.3's division of the
 * fields:
 *
 * | Field                 | Control                          | Writes  |
 * | --------------------- | -------------------------------- | ------- |
 * | `cellSize`            | numeric                          | yes     |
 * | `rows`                | numeric                          | yes     |
 * | `referenceWidth`      | **design width**, numeric (§9.3) | yes     |
 * | `horizontalAlignment` | toggle, beside design width      | yes     |
 * | `columns`             | **displayed, never edited**      | derived |
 * | —                     | **preview width**, draggable     | none    |
 *
 * `yOffset` is not in that table and has a control here anyway — it is a
 * required `Layout` field (`06` §8) that nothing else reaches. Recorded in
 * `DECISIONS.md`.
 *
 * ## Three of them re-derive `columns`, and that is destructive
 *
 * **Invariant E12** — *changing `referenceWidth`, `cellSize`, or
 * `horizontalAlignment` re-derives `columns` and requires explicit confirmation
 * whenever the config holds a coordinate-bound Selection. The confirmation names
 * the Operations that will be affected.*
 *
 * Three fields rather than `02` §7.5's one, because `columns` derives from all
 * three: a `cellSize` change re-derives it just as surely, and a
 * `horizontalAlignment` toggle can move it by one through the parity correction
 * alone.
 *
 * **The confirmation is Step 10 and is not implemented here.** These transitions
 * are the thing being confirmed, not the confirming; a transition that opened a
 * dialogue would not be the total `TilesetFile -> TilesetFile` **E5** requires.
 * Confirmation belongs to the caller, and until Step 10 there are no Operations
 * for it to warn about — §9.3: "confirmation is required only where something is
 * at risk", and procedural Selections survive a resize unharmed.
 *
 * **Nothing is migrated, ever** (§9.4). Migration has to guess, and there is no
 * non-arbitrary answer: a `rect` spanning columns 0–7 in a grid that becomes 10
 * columns is 0–9 proportionally and 0–7 absolutely, both defensible. Undo is the
 * repair (**E6**).
 */

/** Re-derives `columns` from the three fields it depends on — `02` §7.1. */
function withLayout(file: TilesetFile, layout: Layout): TilesetFile {
  return {
    ...file,
    config: {
      ...file.config,
      columns: deriveColumns(layout.referenceWidth, layout.cellSize, layout.horizontalAlignment),
    },
    layout,
  };
}

/**
 * Each of these takes **text**, not a number.
 *
 * That is E5's boundary placed where the invariant puts it: "in-flight input
 * lives in the input control and reaches the file only when it parses". A
 * transition taking a `number` would push the parse to the call site and give
 * every future caller a way to land a value `06` rejects.
 *
 * **A transition that cannot parse returns its input unchanged.** It is total on
 * every legal file and produces a legal file either way, so a refusal needs no
 * second channel and cannot leave a half-change behind.
 */
export function setRows(text: string): Transition {
  return (file) => {
    const rows = parseRows(text);
    if (rows === null) return file;
    // `rows` does not touch the derivation -- `02` §7.1 derives `columns` from
    // the width fields alone, and §7.4 makes the grid top-anchored with no
    // vertical counterpart to `horizontalAlignment`.
    return { ...file, config: { ...file.config, rows } };
  };
}

/** Destructive under E12: re-derives `columns`. */
export function setCellSize(text: string): Transition {
  return (file) => {
    const cellSize = parseCellSize(text);
    if (cellSize === null) return file;
    return withLayout(file, { ...file.layout, cellSize });
  };
}

/** The **design width** of §9.3. Destructive under E12: re-derives `columns`. */
export function setReferenceWidth(text: string): Transition {
  return (file) => {
    const referenceWidth = parseReferenceWidth(text);
    if (referenceWidth === null) return file;
    return withLayout(file, { ...file.layout, referenceWidth });
  };
}

/**
 * Destructive under E12: a toggle can move `columns` by one through the parity
 * correction alone, which is why §9.3 names three fields where `02` §7.5 named
 * one.
 */
export function setHorizontalAlignment(horizontalAlignment: Layout["horizontalAlignment"]): Transition {
  return (file) => withLayout(file, { ...file.layout, horizontalAlignment });
}

/**
 * Not destructive: `yOffset` shifts the grid up within the render box and
 * touches no derivation (`02` §7.4).
 */
export function setYOffset(text: string): Transition {
  return (file) => {
    const yOffset = parseYOffset(text);
    if (yOffset === null) return file;
    return { ...file, layout: { ...file.layout, yOffset } };
  };
}

// ---------------------------------------------------------------------------
// The seed — `09` §8.2; `02` §4.1, §6.6; `06` §5
// ---------------------------------------------------------------------------

/**
 * `config.defaultSeed`, the file's **only caller instruction** (`06` §5).
 *
 * §8.2: "the author never sees a hash. They type a string — `"sunset-3"`,
 * `"draft-b"` — and that is the whole interface." There is no separate preview
 * seed: the component falls back to this field (`07` §9.2), so what the author
 * judges is what a visitor with no host seed gets.
 *
 * **Refused when empty**, which is E5's boundary rather than a validation: `06`
 * §5 requires length ≥ 1 and `02` §4.1 requires a config to render standalone,
 * so an empty field is in-flight input that has not parsed yet and stays in the
 * control.
 *
 * **Trimmed**, and that is a real decision rather than tidying — recorded in
 * `DECISIONS.md`. `02` §6.6 hashes the string, so `"sunset "` and `"sunset"` are
 * two different pictures separated by an invisible character.
 */
export function setDefaultSeed(text: string): Transition {
  return (file) => {
    const defaultSeed = text.trim();
    if (defaultSeed.length === 0) return file;
    return { ...file, config: { ...file.config, defaultSeed } };
  };
}

/**
 * A fresh generated seed — §8.2's "generated memorable seed in word-word-number
 * form", beside the field rather than instead of it.
 *
 * `02` §6.6's reasoning: "the value of a seed is that it can be written down and
 * returned to, and random hex defeats that."
 */
export function rerollSeed(): Transition {
  return (file) => ({ ...file, config: { ...file.config, defaultSeed: memorableSeed() } });
}

// ---------------------------------------------------------------------------
// Salts and the load flags — `09` §8.3, §8.4; `02` §6.4; `04` §8
// ---------------------------------------------------------------------------

/**
 * **The Operation reroll** — §8.3. Increments `Operation.salt`, wrapping at 2³².
 *
 * `02` §6.4 and `04` §4.3: **both** of the Operation's hash channels take its
 * salt, so one click moves the Operation's `random` Selection and its Source
 * together. That is the intended behaviour of a reroll attached to one
 * Operation, not a side effect of sharing a field.
 *
 * **Offered on every Operation**, not only stochastic ones (§8.3): a `random`
 * Selection consumes the salt even where the Source does not, so an Operation
 * with a `constant` Source and a `random` Selection rerolls meaningfully.
 */
export function rerollOperation(operationId: string): Transition {
  return (file) => ({
    ...file,
    config: {
      ...file.config,
      operations: file.config.operations.map((op) =>
        op.id === operationId ? { ...op, salt: nextSalt(op.salt) } : op,
      ),
    },
  });
}

/**
 * **The asset reroll** — §8.4. Increments `config.assetSalt`.
 *
 * `02` §6.4: re-rolls which variant each cell shows **without disturbing any
 * Operation**. The asset channel is separate, so every `tileId` stays exactly
 * where it was and only the variant within each Tile moves.
 */
export function rerollAssets(): Transition {
  return (file) => ({
    ...file,
    config: { ...file.config, assetSalt: nextSalt(file.config.assetSalt) },
  });
}

/**
 * The per-Operation `reseedOnLoad` flag — §8.4.
 *
 * The transition is total and sets whatever it is asked to. **Whether the
 * control is offered** is `offersReseedOnLoad`'s question and belongs to the
 * view: §8.4 hides it where the Source is not stochastic, and explicitly
 * requires an imported file carrying the flag anyway to be "left alone and
 * reported as an advisory — not silently cleared". A transition that refused the
 * write would be that silent clearing wearing a different hat.
 */
export function setReseedOnLoad(operationId: string, on: boolean): Transition {
  return (file) => ({
    ...file,
    config: {
      ...file.config,
      operations: file.config.operations.map((op) =>
        op.id === operationId ? { ...op, reseedOnLoad: on } : op,
      ),
    },
  });
}

/** `reseedOnLoad`'s config-level counterpart, for assets — §8.4, `04` §8. */
export function setReseedAssetsOnLoad(on: boolean): Transition {
  return (file) => ({ ...file, config: { ...file.config, reseedAssetsOnLoad: on } });
}

// ---------------------------------------------------------------------------
// The tile library — `09` §10; `06` §6; `03` §4
// ---------------------------------------------------------------------------

/**
 * A Tile is `{ id, name, assets }` with **at least one asset** (`06` §6,
 * `03` §4.1) whose weights sum `> 0`.
 *
 * **E5 makes both an editing rule rather than a validation one.** §10.2: "the
 * editor does not permit the last non-zero weight to be zeroed, in the same
 * manner as a refused deletion". `ZERO_WEIGHT_SUM` and `EMPTY_ASSET_LIST` are
 * import-time codes, and if E5 holds no sequence of editor actions can reach
 * either.
 */

/** The Operations whose palettes name this Tile — §4.2's "references named". */
export interface TileReference {
  operationId: string;
  /** Index into `mapping.palette`, so the citation can be exact. */
  entry: number;
}

export function tileReferences(file: TilesetFile, tileId: string): TileReference[] {
  const out: TileReference[] = [];
  for (const op of file.config.operations) {
    // C8: a Mapping's kind is determined by its Operation's `target`. Only a
    // tile Target carries a palette, so only `tileId` can reference a Tile.
    if (op.target !== "tileId") continue;
    const mapping = op.mapping as { palette?: { tileId: string | null }[] };
    mapping.palette?.forEach((entry, index) => {
      if (entry.tileId === tileId) out.push({ operationId: op.id, entry: index });
    });
  }
  return out;
}

function mapTile(file: TilesetFile, tileId: string, f: (tile: Tile) => Tile): TilesetFile {
  return {
    ...file,
    config: {
      ...file.config,
      tiles: file.config.tiles.map((tile) => (tile.id === tileId ? f(tile) : tile)),
    },
  };
}

/** Appends whole Tiles. Ids are allocated by the caller, which already measured. */
export function addTiles(tiles: Tile[]): Transition {
  return (file) =>
    tiles.length === 0
      ? file
      : { ...file, config: { ...file.config, tiles: [...file.config.tiles, ...tiles] } };
}

/** Adds further variants to one Tile — §10.1's "assets are one family". */
export function addAssets(tileId: string, assets: TileAsset[]): Transition {
  return (file) =>
    assets.length === 0
      ? file
      : mapTile(file, tileId, (tile) => ({ ...tile, assets: [...tile.assets, ...assets] }));
}

/**
 * **The editor never blocks a rename** (§10.1).
 *
 * `Tile.name` is deliberately unconstrained — not unique, not charset-limited,
 * possibly empty (`06` §5.3, **C10**) — because **D1** guarantees a name
 * collision cannot reach output, "so the only cost is authoring clarity".
 * Disambiguation is display behaviour and touches no field.
 */
export function renameTile(tileId: string, name: string): Transition {
  return (file) => mapTile(file, tileId, (tile) => ({ ...tile, name }));
}

/**
 * **Refused where a palette references the Tile** (§4.2, and `DECISIONS.md`).
 *
 * §4.2 permits a cascade instead; what it forbids is the deletion landing "as a
 * dangling `tileId` and waiting for validation to notice — `06` §7.3's
 * `DANGLING_TILE_REF` is an import-time code, not an editing-time one".
 *
 * The caller checks `tileReferences()` first so it can name them; this refuses
 * again rather than trusting it to, because a transition is total on its own
 * terms and must not depend on a check made elsewhere.
 */
export function deleteTile(tileId: string): Transition {
  return (file) => {
    if (tileReferences(file, tileId).length > 0) return file;
    return {
      ...file,
      config: { ...file.config, tiles: file.config.tiles.filter((t) => t.id !== tileId) },
    };
  };
}

/**
 * **Refused when it would empty the Tile** — `03` §4.1: "a Tile with no assets
 * cannot resolve". Deleting the Tile itself is the way to remove the last one.
 */
export function deleteAsset(tileId: string, assetId: string): Transition {
  return (file) => {
    const tile = file.config.tiles.find((t) => t.id === tileId);
    if (tile === undefined || tile.assets.length <= 1) return file;
    return mapTile(file, tileId, (t) => ({
      ...t,
      assets: t.assets.filter((a) => a.id !== assetId),
    }));
  };
}

/**
 * **Refused when it would zero the last non-zero weight** (§10.2, `06` §6).
 *
 * A Tile whose weights sum to zero has no selectable asset — `04` §6.3's walk
 * uses a strict comparison, so nothing can ever win it. Zero on an individual
 * asset stays perfectly legal and means *listed but never chosen*, which is how
 * an author turns a variant off without deleting it (`03` §4.1).
 */
export function setAssetWeight(tileId: string, assetId: string, text: string): Transition {
  return (file) => {
    const weight = parseWeight(text);
    if (weight === null) return file;

    const tile = file.config.tiles.find((t) => t.id === tileId);
    if (tile === undefined) return file;

    const sum = tile.assets.reduce((n, a) => n + (a.id === assetId ? weight : a.weight), 0);
    if (sum <= 0) return file;

    return mapTile(file, tileId, (t) => ({
      ...t,
      assets: t.assets.map((a) => (a.id === assetId ? { ...a, weight } : a)),
    }));
  };
}

// ---------------------------------------------------------------------------
// The operation stack — `09` §4.1; `02` §9; `06` §7
// ---------------------------------------------------------------------------

/**
 * `config.operations` is **an array, and its order is the stack order** of
 * `02` §9. Order is semantically significant and is never canonicalized — the
 * opposite rule to a Tile's asset list (**D3**), and the same rule as a palette
 * (**O6**), for the same reason: reordering changes output for a reason the
 * author can see (`02` §6.3).
 *
 * ## Two things this deliberately does not have
 *
 * **No `disabled` flag on an Operation** (§4.1). "There is no disabled flag,
 * because there is no field for one and adding one is a bump. An operation is
 * muted by removing it from `config.operations` and holding it aside in UI
 * state; unmuting re-inserts it at its index."
 *
 * That is correct for free, because **G3** attaches an Operation's randomness to
 * its `operationId` and `salt` rather than to its stack position — a
 * muted-then-unmuted Operation draws exactly what it drew before. Muting is not
 * in this version at all; only its absence is, which is a field that does not
 * exist rather than a feature that is missing.
 *
 * **No reordering in this version.** The shape already permits it: an array is
 * reorderable, and a `moveOperation(id, index)` transition drops in beside these
 * with nothing else to change.
 */

/** Appends to the end of the stack, which is where a new Operation runs last. */
export function addOperation(operation: Operation): Transition {
  return (file) => ({
    ...file,
    config: { ...file.config, operations: [...file.config.operations, operation] },
  });
}

/**
 * Removes by id, never by index (`02` §6.3: an Operation's identity is its id,
 * never its stack position).
 *
 * Nothing cascades. An Operation references Tiles, but no Tile or Operation
 * references an Operation, so there is no dangling anything to leave behind —
 * which is why this has no refusal branch where `deleteTile` does.
 */
export function removeOperation(operationId: string): Transition {
  return (file) => {
    const operations = file.config.operations.filter((op) => op.id !== operationId);
    if (operations.length === file.config.operations.length) return file;
    return { ...file, config: { ...file.config, operations } };
  };
}

/**
 * Replaces one Operation in place, preserving its index and therefore its place
 * in the stack order.
 *
 * The id is **not** reassigned (§4.3), so an edit to an Operation's parameters
 * keeps its hash channels and the picture moves only as much as the edit
 * implies.
 */
export function replaceOperation(operation: Operation): Transition {
  return (file) => ({
    ...file,
    config: {
      ...file.config,
      operations: file.config.operations.map((op) => (op.id === operation.id ? operation : op)),
    },
  });
}
