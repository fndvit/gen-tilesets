/**
 * The nouns. Key names are `06-config-schema.md` §3, §5, §6, §7, §8 verbatim;
 * `TileState` is `03-domain-model.md` §6.
 *
 * Terminology is fixed (`CONVENTIONS.md` §10.1): `TileState` not `CellState`, `Tile` not
 * `TileType`, `TileAsset` not `Variant`.
 */

/** An integer in `[0, 2^32)`. Narrowed from `number` by `06` §5.2, **C9**. */
export type Uint32 = number;

/** `[A-Za-z0-9_-]+`, unique within its scope — `06` §5.3, **C10**. */
export type Identifier = string;

// ---------------------------------------------------------------------------
// Attributes and Targets
// ---------------------------------------------------------------------------

/**
 * The attribute set. Closed by `03` **D7** — an addition is a schema change, not
 * a registration.
 *
 * `scale` arrived by that route in ADR-005 and carried `schemaVersion` to 2. It
 * is uniform and **composes with** the two axes rather than replacing them:
 * `S(scaleX · scale, scaleY · scale)`.
 */
export type AttributeName = "scale" | "scaleX" | "scaleY" | "rotation" | "opacity";

/** `06` §7. The attributes plus the structural `tileId`. Closed by `05` §4.2. */
export type TargetName = "tileId" | AttributeName;

/** `04` §7.2. Two Target types, and only two — see `03` §5.4's note. */
export type TargetType = "numeric" | "tile";

// ---------------------------------------------------------------------------
// TileState — `02` §8, `03` §6
// ---------------------------------------------------------------------------

/**
 * The resolved state occupying a Cell. Plain serializable data: no DOM nodes,
 * no asset references, no functions (`02` §8).
 *
 * `assetId` is written only by the resolution step of `02` §9 — no Operation
 * can target it (`03` **D9**).
 */
export interface TileState {
  tileId: string | null;
  assetId: string | null;
  /** Uniform, multiplied into both axes at render — ADR-005, `07` §10.1. */
  scale: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
}

/**
 * `rows × columns` of `TileState`, flat and row-major.
 *
 * Row-major matches `07` **R10**'s paint order, so drawing is one pass. Kept as
 * plain data rather than a class because `02` §8 requires the engine's output to
 * be serializable — read it with {@link tileStateAt}.
 *
 * `02` §9's "cells may be evaluated in any order or in parallel" is unaffected:
 * the container fixes storage, not evaluation order.
 */
export interface Grid<T = TileState> {
  rows: number;
  columns: number;
  /** Length `rows * columns`. Index `y * columns + x`. */
  cells: T[];
}

/**
 * Grid-absolute lookup. Coordinates are never viewport-relative (`02` §5).
 * Out-of-range coordinates return `undefined` rather than wrapping.
 */
export function tileStateAt<T>(grid: Grid<T>, x: number, y: number): T | undefined {
  if (x < 0 || y < 0 || x >= grid.columns || y >= grid.rows) return undefined;
  return grid.cells[y * grid.columns + x];
}

// ---------------------------------------------------------------------------
// Tiles — `03` §3, §4; `06` §6
// ---------------------------------------------------------------------------

/**
 * One concrete drawable within a Tile family, plus the weight deciding how often
 * it is chosen.
 *
 * Carries no sprite data of any kind (`03` **D2**, `02` **G5**). Whatever it
 * needs to become a drawable lives in `meta`, which the engine never inspects.
 */
export interface TileAsset {
  id: Identifier;
  /** `>= 0`, finite. Zero means listed but never chosen (`03` §4.1). */
  weight: number;
  /** Renderer-facing, opaque to the engine. `06` **C4**'s sole strictness exception. */
  meta?: Record<string, unknown>;
}

/** A tile identifier / family. The unit the engine reasons about (`02` §3). */
export interface Tile {
  id: Identifier;
  /** Authoring only. Never affects generation output (`03` **D1**). */
  name: string;
  /** At least one (`03` §4.1). */
  assets: TileAsset[];
}

// ---------------------------------------------------------------------------
// Operations — `04` §3; `06` §7
// ---------------------------------------------------------------------------

/**
 * The recursive tagged shape of `04` §4.5. Parameters are spread siblings of
 * `type` because the registry knows the keys (`06` §7.1); `type` is reserved in
 * the parameter namespace.
 */
export interface Selection {
  type: string;
  [param: string]: unknown;
}

/** Same shape, same reasoning — `06` §7.1. */
export interface Source {
  type: string;
  [param: string]: unknown;
}

/** A bare string, never a tagged object — `06` §7.2. No V1 Blend takes parameters. */
export type BlendName = string;

/** `04` §6.2. `min > max` is legal and reverses the map. */
export interface NumericMapping {
  range: [min: number, max: number];
  /** Absent means continuous, which is a meaning rather than a default (`06` §5.1). */
  steps?: number;
}

/** `04` §6.3. `tileId: null` is legal and means clear this cell. */
export interface PaletteEntry {
  tileId: Identifier | null;
  weight: number;
}

/** `04` §6.3. Entry order is authored and semantically significant (**O6**). */
export interface TileMapping {
  palette: PaletteEntry[];
}

/**
 * One slot, two shapes, no kind tag — the shape is discriminated by the
 * Operation's `target` (`06` §7.3, **C8**).
 */
export type Mapping = NumericMapping | TileMapping;

/**
 * One `(Selection, Source, Blend, Target)` unit plus the mapping `04` §6 adds.
 *
 * Read as a sentence: for the cells in `selection`, take a number from `source`,
 * interpret it through `mapping`, and combine it into `target` with `blend`.
 */
export interface Operation {
  /** Stable, generated. Never derived from stack position (`02` §6.3). */
  id: Identifier;
  /** `02` §6.4. Incrementing re-rolls this Operation's randomness and nothing else. */
  salt?: Uint32;
  /** `04` §8. Selects which seed this Operation hashes against (**O8**). */
  reseedOnLoad?: boolean;
  selection: Selection;
  source: Source;
  target: TargetName;
  mapping: Mapping;
  blend: BlendName;
}

// ---------------------------------------------------------------------------
// The file — `06` §3, §5, §8
// ---------------------------------------------------------------------------

/**
 * The engine's first argument. Nothing in here, at any depth, is a pixel
 * measurement or any other input `02` §4.2 prohibits — the engine boundary is a
 * property of this shape, not of the caller's discipline (`06` **C1**).
 */
export interface TilesetConfig {
  rows: number;
  columns: number;
  /**
   * A caller instruction, and the only field the engine carries and never reads
   * (`02` §4.1). Required so a config renders standalone.
   */
  defaultSeed: string;
  /** `02` §6.4. Re-rolls variant distribution without disturbing any Operation. */
  assetSalt?: Uint32;
  /** `02` §6.7. Read by the engine to resolve the asset channel's effective seed. */
  reseedAssetsOnLoad?: boolean;
  /** May be empty — a fresh editor document (`06` §5). */
  tiles: Tile[];
  /** An array, and its order is the stack order of `02` §9. Never canonicalized. */
  operations: Operation[];
}

/** Design-space measurements, used only by the renderer. Never an engine input (`02` §7). */
export interface Layout {
  /** Design px. Cells are square. */
  cellSize: number;
  /** Design px. NOT `columns * cellSize` — the difference is the intentional bleed (`02` §7.2). */
  referenceWidth: number;
  /** Fraction of cell height, `[0, 1)`. Shifts the grid up, clipping row 0's top. */
  yOffset: number;
  /** Authoring metadata. Read by neither engine nor renderer (`02` §7.3, `06` §3.3). */
  horizontalAlignment: "column" | "gutter";
}

/** The only name in the package for the thing on disk (`06` §3). */
export interface TilesetFile {
  /**
   * Required. Absent or unknown is a load failure (`06` **C2**).
   *
   * **2 since ADR-005**, which added the `scale` attribute and so changed the
   * shape of `TileState`. There is no v1 compatibility path: `validate()`
   * rejects a v1 file with `SCHEMA_VERSION_UNKNOWN`, which is what **C2** says
   * an unknown version is.
   */
  schemaVersion: 2;
  /** Required, advisory, never validated against anything (`06` **C3**). */
  engineVersion: string;
  config: TilesetConfig;
  layout: Layout;
}
