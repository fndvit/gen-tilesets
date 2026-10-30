/**
 * `TilesetModel` — everything `<Tileset>` derives, as a plain class.
 *
 * **This is the renderer's pipeline with no DOM in it.** Inputs go in — the
 * file, the options, what `measure.ts` measured, the DPR — and out come the
 * grid, the geometry, the keep-out mask, the canvas draw list and the DOM cell
 * list. It was a chain of `$derived`s inside `Tileset.svelte`, which could not be
 * unit-tested and could not be used without Svelte; it lives here so that both
 * stop being true. A renderer — the Svelte component, or a framework-free one —
 * owns the elements and the side effects and reads this.
 *
 * ## How it recomputes, and why it is shaped like `$derived`
 *
 * Each stage is a {@link Memo}: it recomputes only when one of its inputs
 * changed by `Object.is`, which is the equality `$derived` uses, and it is read
 * lazily, so a stage nobody reads — the draw list under `"dom"` — never runs.
 * The port from runes is therefore one-to-one, and **R12** survives it for the
 * same reason it held before: `resolved` recomputes on every new `options`
 * object, but each field is its own stage holding a primitive or a stable
 * reference, so an inline `options={{ ... }}` rebuilt with equal values stops at
 * the unpacking and never reaches `generate()`.
 *
 * Rejected: one `recompute()` with hand-written change checks (a missed check is
 * a stale picture and nothing reports it, and it cannot be tested stage by
 * stage); and a signals library (a dependency doing what `Memo` does in twenty
 * lines).
 *
 * **There are no dirty flags.** Every output keeps its identity until its inputs
 * change, so a consumer keeps what it last applied and compares — which is
 * exactly how a Svelte `$effect` decides to re-run, and so needs no translation.
 * A flag per output would have to be wired by hand for every output added later.
 *
 * ## What is not here
 *
 * Anything asynchronous or element-bound: the settled drawables, failed loads,
 * the image bank, the measurement subscription, painting. Those belong to
 * whoever owns the elements. `drawables` *is* here although it calls the
 * provider: it is a memo whose only side effect is a failure report, exactly
 * as it was as a `$derived`.
 */
import { DEV } from "../dev.js";
import { assertValidFile } from "../load.js";
import { activeKey, ruleOverride, rulesReshapeErrors } from "../responsive.js";
import { reshape } from "../shape.js";
import type { Grid, TileState, TilesetFile } from "../types.js";
import { GridCache, reservationCss } from "./breakpoints.js";
import {
  cellPlacementAffine,
  cssLength,
  naturalHeight,
  naturalRatio,
  originX,
  scaleFactor,
  visibleColumns,
  type GridGeometry,
  type Lattice,
} from "./geometry.js";
import { drawnTiles, occlusionMask, stableMask, type OcclusionMask } from "./occlusion.js";
import {
  effectiveRules,
  optionErrors,
  renderOverride,
  resolveOptions,
  sameRules,
  sameTargets,
  type NormalizedTargets,
  type ResolvedOptions,
  type TilesetOptions,
} from "./options.js";
import { assetKey, DrawableCache, type AssetRef, type Drawable } from "./provider.js";
import type { RenderRect } from "./space.js";
import { cssTransform, isIdentityTransform, maxSpill, translationDev } from "./transform.js";
import {
  canvasPresentation,
  domGeometry,
  domLattice,
  uniformDrawList,
  uniformGeometry,
  type CanvasPresentation,
  type DomGeometry,
} from "./uniform.js";

// ------------------------------------------------------------------ memo ---

/**
 * One derived value: recomputed when any dependency changed by `Object.is`,
 * otherwise the previous value by identity.
 *
 * A throw leaves the memo empty, so the next read retries — what a `$derived`
 * that threw does, and what a development-build assertion needs: a host that
 * fixes its file gets a picture, not the cached error.
 *
 * **`clock` is what makes it cheap, and it was measured.** Without it a read
 * re-validates every ancestor — each `get()` calls its upstream `get()`s — so a
 * renderer reading twenty outputs after one push walked the same chain twenty
 * times. On the demo that put 20% (canvas) to 30% (dom) on the script time of
 * every resize over the `$derived` chain this replaced, which tracks dirtiness and
 * does not walk. With a clock that moves only when an input changed, a memo
 * already validated at the current tick returns at once, so each stage is checked
 * at most once per push, as a `$derived` is. Without a clock it validates on every
 * read, which is what a standalone memo in a test wants.
 */
export class Memo<D extends unknown[], T> {
  #deps: D | null = null;
  #value: T | undefined;
  #checkedAt = -1;
  /** How many times `fn` has run. Read by tests, and by nothing else. */
  runs = 0;

  constructor(
    private readonly deps: () => [...D],
    private readonly fn: (...deps: D) => T,
    private readonly clock?: () => number,
  ) {}

  get(): T {
    const now = this.clock?.() ?? -1;
    if (now !== -1 && now === this.#checkedAt) return this.#value as T;
    const next = this.deps();
    const prev = this.#deps;
    if (prev === null || prev.length !== next.length || next.some((d, i) => !Object.is(d, prev[i]))) {
      this.#value = this.fn(...next);
      this.#deps = next;
      this.runs++;
    }
    // After `fn`, so a throw leaves the tick unmarked and the next read retries.
    this.#checkedAt = now;
    return this.#value as T;
  }
}


// ---------------------------------------------------------------- inputs ---

/** What a renderer pushes in. Everything else is derived. */
export interface ModelInputs {
  /** Parsed, valid, and held stable by the host (**S3**). */
  file: TilesetFile;
  /** `undefined` and absence mean the same: every default. */
  options: TilesetOptions | undefined;
  /**
   * What `measure.ts` reports, and nothing else about the page is read.
   *
   * Width and DPR are ADR-006's two numbers. Height is read so a non-top `alignY`
   * has something to align against. `rects` is the rects of `options.avoid`'s
   * targets in render space, and stays `null` without it — in which case nothing
   * outside the box is measured at all. `0` width means "not measured yet".
   */
  width: number;
  height: number;
  rects: readonly RenderRect[] | null;
  dpr: number;
}

/** A shown DOM cell: the cell, its flat index, and its column and row. */
export interface ShownCell {
  cell: TileState;
  i: number;
  x: number;
  y: number;
}

/** What `cellStyle` needs, as one identity-stable object (see {@link TilesetModel.placement}). */
export interface Placement {
  domCell: DomGeometry | null;
  dpr: number;
  layout: TilesetFile["layout"];
  rows: number;
  columns: number;
  sizing: ResolvedOptions["sizing"];
  alignX: ResolvedOptions["alignX"];
  alignY: ResolvedOptions["alignY"];
}

// One shared empty `meta`, so an asset without one keeps the same identity
// across derivations and `DrawableCache` does not resolve it again.
const NO_META: Record<string, unknown> = Object.freeze({});

// ----------------------------------------------------------------- model ---

export class TilesetModel {
  #in: ModelInputs;

  /**
   * @param uid this instance's id, for the reservation stylesheet's selectors.
   *   SSR-stable when the host can make it so (`$props.id()`), so the server's
   *   reservation CSS and the client's agree.
   * @param init the first inputs.
   */
  constructor(
    readonly uid: string,
    init: ModelInputs,
  ) {
    this.#in = init;
  }

  /** Moves only when an input changed — see {@link Memo}'s `clock`. */
  #tick = 0;

  /**
   * A stage on this model's clock. `[...D]` makes TypeScript infer each `deps`
   * array as a tuple, so every stage's `fn` sees its dependencies' own types with
   * no `as const` at the call site.
   */
  #memo<D extends unknown[], T>(deps: () => [...D], fn: (...deps: D) => T): Memo<D, T> {
    return new Memo<D, T>(deps, fn, () => this.#tick);
  }

  /**
   * Replace some inputs. Nothing is computed until an output is read, and a push
   * that changes nothing by `Object.is` does not move the clock, so it costs
   * nothing to read after either.
   */
  set(next: Partial<ModelInputs>): void {
    let changed = false;
    for (const k in next) {
      const key = k as keyof ModelInputs;
      if (!Object.is(next[key], this.#in[key])) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.#in = { ...this.#in, ...next };
    this.#tick++;
  }

  get inputs(): Readonly<ModelInputs> {
    return this.#in;
  }

  /**
   * `onAssetError`, read at call time from the options as they are *now*.
   *
   * It is called from inside `drawables`' resolution, and, by a renderer, from
   * image load and decode handlers long after. Reading it at call time is what
   * `untrack` did in the component: a new identity of a host's inline callback
   * must not re-resolve every asset, and a report must reach the callback the host
   * holds now, not the one it held when the asset was resolved.
   */
  readonly report = (ref: AssetRef, cause: unknown): void => {
    this.#in.options?.onAssetError?.(ref, cause);
  };

  // ------------------------------------------------------------ options ---

  /**
   * The options, checked in a development build and resolved to their defaults.
   *
   * Checked here and not in `resolveOptions` for **C5**'s reason: resolving trusts
   * its input, and the check is what earns the trust. Production skips it, as it
   * skips `assertValidFile`.
   *
   * The Svelte component checks the props that moved into `options` in 0.6.0
   * itself (`legacyPropErrors`); that is a question about Svelte props and has no
   * meaning here.
   */
  readonly #resolved = this.#memo(
    () => [this.#in.options],
    (options) => {
      if (DEV) {
        const errors = optionErrors(options);
        if (errors.length > 0) {
          throw new Error(
            "`<Tileset>`'s options are not valid:\n" + errors.map((e) => `  - ${e}`).join("\n"),
          );
        }
      }
      return resolveOptions(options);
    },
  );

  // **One stage per field, and that is what keeps R12 true.** A host writing
  // `options={{ ... }}` inline hands over a new object whenever any field in it
  // changes. A stage propagates only when its *value* changes, so unpacking here
  // means a change to `avoid.padding` reaches the mask and stops there, instead of
  // re-running `generate()` through a dependency on `options` itself. Nothing
  // below this block reads `#resolved` again.
  readonly #seedOption = this.#memo(() => [this.#resolved.get().seed], (v) => v);
  readonly #loadSalt = this.#memo(() => [this.#resolved.get().loadSalt], (v) => v);
  readonly #substrate = this.#memo(() => [this.#resolved.get().substrate], (v) => v);
  readonly #overflow = this.#memo(() => [this.#resolved.get().overflow], (v) => v);
  // By content, like the targets below: `sameRules` says why.
  #lastHostRules: ResolvedOptions["responsive"] | undefined;
  readonly #hostRules = this.#memo(
    () => [this.#resolved.get().responsive],
    (next) => {
      if (!sameRules(this.#lastHostRules, next)) this.#lastHostRules = next;
      return this.#lastHostRules;
    },
  );
  readonly #provider = this.#memo(() => [this.#resolved.get().provider], (v) => v);
  readonly #padding = this.#memo(() => [this.#resolved.get().avoid?.padding ?? 0], (v) => v);

  /** The base sizing and alignment, before any responsive rule — one stable object. */
  readonly #base = this.#memo(
    () => {
      const r = this.#resolved.get();
      return [r.sizing, r.alignX, r.alignY];
    },
    (sizing, alignX, alignY) => ({ sizing, alignX, alignY }),
  );

  // The targets are compared by content (`sameTargets`), because an inline
  // `targets: [a, b]` is a new array every time and each new identity would tear
  // down and re-register the tracker's observers. `#lastTargets` is a plain field
  // on purpose: it is a memo, not state.
  #lastTargets: NormalizedTargets | null = null;
  readonly #targets = this.#memo(
    () => [this.#resolved.get().avoid?.targets ?? null],
    (next) => {
      if (!sameTargets(this.#lastTargets, next)) this.#lastTargets = next;
      return this.#lastTargets;
    },
  );

  // ---------------------------------------------------------------- file ---

  // **S3's development assertion.** Keyed on `file` alone: a `seed` or
  // `loadSalt` change moves no config, so re-validating on one would be work
  // with no question attached. In a production build this is `file` itself, by
  // identity, and costs a boolean test.
  //
  // Every stage below reads `#checked`, never the `file` input, and that is
  // deliberate — it makes "assert before generating" structural. A stage that
  // existed only for its throw would have to be read back for its side effect,
  // and a read whose value is discarded is the line a later refactor deletes as
  // dead. Here the assertion cannot be dropped without also dropping the data.
  readonly #checked = this.#memo(
    () => [this.#in.file],
    (file) =>
      DEV
        ? assertValidFile(
            file,
            "`<Tileset>`'s `file` prop",
            "Pass the file through `loadTilesetFile()` before handing it to `<Tileset>`. " +
              "This check runs in development builds only; in production the same file is " +
              "undefined behaviour (S3).",
          )
        : file,
  );

  // **Invariant S4** — with no optional props the picture is fixed:
  // seed = defaultSeed, loadSalt = 0. Variation between loads is always an
  // explicit act by the host. The reverse default would make every page
  // nondeterministic by accident, including under SSR.
  readonly #effectiveSeed = this.#memo(
    () => [this.#seedOption.get(), this.#checked.get().config.defaultSeed],
    (seed, defaultSeed) => seed ?? defaultSeed,
  );

  // ---------------------------------------------------- responsive rules ---

  /**
   * The rules in force — the host's if it passed any, else the file's
   * (`effectiveRules`). A file's own rules were checked by `assertValidFile`
   * above; a host's are checked here, against the file they will reshape, for the
   * same development-loud / production-trusting reason. What only the file can
   * answer — a `rect` pinning `rows`, a cascade whose bleed leaves no box — is
   * `rulesReshapeErrors`'.
   */
  readonly #rules = this.#memo(
    () => [this.#checked.get(), this.#hostRules.get()],
    (checked, hostRules) => {
      const r = effectiveRules(checked, hostRules);
      if (DEV && hostRules !== undefined) {
        const errors = rulesReshapeErrors(checked, r);
        if (errors.length > 0) {
          throw new Error(
            "`<Tileset>`'s `options.responsive` cannot be applied to this file:\n" +
              errors.map((e) => `  - ${e}`).join("\n"),
          );
        }
      }
      return r;
    },
  );

  /**
   * Which rules hold at the measured width, as `activeKey`'s string. **This is
   * the line that makes a resize inside a band cost nothing**: the width moves on
   * every frame, the key only when a rule starts or stops matching, and every
   * stage below keys on it rather than on the width.
   *
   * Before measurement — on the server, and on the first client frame — it is
   * `""`, the base shape. That is not a guess shown to anyone: the box reserves
   * the right height by container query (`reservationCss`) and draws nothing until
   * the key is real (`pending`).
   */
  readonly #ruleKey = this.#memo(
    () => [this.#rules.get(), this.#in.width],
    (rules, width) => (rules.length > 0 && width > 0 ? activeKey(rules, width) : ""),
  );

  /**
   * The file at this width — `reshape(file, cascade)`, and the active rules for
   * the render half of the cascade. With no rule active the override is `{}`,
   * and `reshape` keeps the file's `config` by reference, so a density-only rule
   * never reaches `generate()`.
   */
  readonly #shaped = this.#memo(
    () => [this.#checked.get(), this.#rules.get(), this.#ruleKey.get()],
    (checked, rules, key) => {
      const active = key === "" ? [] : key.split(",").map((i) => rules[Number(i)]!);
      return { file: reshape(checked, ruleOverride(active)), active };
    },
  );

  readonly #rendered = this.#memo(
    () => [this.#base.get(), this.#shaped.get().active],
    (base, active) => renderOverride(base, active),
  );
  readonly #sizing = this.#memo(() => [this.#rendered.get().sizing], (v) => v);
  readonly #alignX = this.#memo(() => [this.#rendered.get().alignX], (v) => v);
  readonly #alignY = this.#memo(() => [this.#rendered.get().alignY], (v) => v);

  /** The reservation stylesheet. Empty without rules, when there is no wrapper to hold it. */
  readonly #reservation = this.#memo(
    () => [this.#checked.get(), this.#rules.get(), this.#base.get()],
    (checked, rules, base) => (rules.length > 0 ? reservationCss(this.uid, checked, rules, base) : ""),
  );

  // ---------------------------------------------------------------- grid ---

  // Regenerates when `file.config`, `seed`, or `loadSalt` changes, or a rule
  // changes `rows` or `columns` to a size this instance has not generated yet —
  // and on nothing else: not a `provider` change, not a viewport resize, not
  // hydration (`08` §5.2, `07` §9.1), and **not a keep-out change**: the mask is
  // applied at paint, downstream of this. A viewport resize inside a band changes
  // `s` and nothing else, so every cell keeps its TileState and moves to a new
  // rect. `GridCache` says why `(rows, columns)` is a sufficient key.
  readonly gridCache = new GridCache();
  readonly #config = this.#memo(() => [this.#shaped.get().file.config], (v) => v);
  readonly #layout = this.#memo(() => [this.#shaped.get().file.layout], (v) => v);
  readonly #grid = this.#memo(
    () =>
      [
        this.#checked.get().config,
        this.#config.get(),
        this.#effectiveSeed.get(),
        this.#loadSalt.get(),
      ],
    (base, config, seed, loadSalt) => this.gridCache.get(base, config, seed, loadSalt),
  );

  readonly #ratio = this.#memo(
    () => [this.#layout.get(), this.#config.get().rows],
    (layout, rows) => naturalRatio(layout, rows),
  );

  /**
   * The box's height under `"fixed"`, in CSS px: the design box at `s = 1`.
   * Constant, so it is known before anything is measured — which is what lets a
   * fixed-size tileset reserve exact space in the server HTML the way a fluid one
   * reserves its ratio.
   */
  readonly #fixedHeight = this.#memo(
    () => [this.#layout.get(), this.#config.get().rows, this.#config.get().columns],
    (layout, rows, columns) => naturalHeight({ layout, rows, columns, Wpx: 0, sizing: "fixed" }),
  );

  /**
   * How far, in whole cells, any drawable in this grid spills past its own cell.
   * Culling widens by this so a scaled or rotated neighbour just outside the box
   * still paints the part of it that reaches in. Per grid, not per resize.
   */
  readonly #spill = this.#memo(() => [this.#grid.get()], (grid) => maxSpill(grid));

  // `meta` lookup, keyed by the (tileId, assetId) pair per `07` §4.1.
  readonly #metaByKey = this.#memo(
    () => [this.#checked.get()],
    (checked) => {
      const map = new Map<string, Record<string, unknown>>();
      for (const tile of checked.config.tiles) {
        for (const asset of tile.assets) {
          map.set(assetKey(tile.id, asset.id), asset.meta ?? NO_META);
        }
      }
      return map;
    },
  );

  // Resolution is memoized per session on the (tileId, assetId) pair — `08` open
  // question 1, which leans yes: it makes `07` **R2** structural rather than a
  // provider obligation the renderer cannot check, and it costs one map. It is
  // also load-bearing, because an unmemoized call from a template would re-invoke
  // the provider on every re-render.
  //
  // The memo outlives this stage (`provider.ts` `DrawableCache`): a reseed
  // re-derives `drawables` without changing any asset, and resolving afresh then
  // reported a failing provider again on every reseed.
  //
  // Q1's recorded objection stands: this silently repairs an impure provider
  // instead of surfacing it, and a lazy provider's rejection is cached too.
  readonly #resolutions = new DrawableCache();
  readonly #drawables = this.#memo(
    () => [this.#grid.get(), this.#metaByKey.get(), this.#provider.get()],
    (grid, metaByKey, provider) => {
      const map = new Map<string, Drawable | Promise<Drawable>>();
      this.#resolutions.retain(metaByKey);
      for (const cell of grid.cells) {
        if (cell.tileId === null || cell.assetId === null) continue;
        const key = assetKey(cell.tileId, cell.assetId);
        if (map.has(key)) continue;
        const ref: AssetRef = {
          tileId: cell.tileId,
          assetId: cell.assetId,
          meta: metaByKey.get(key) ?? NO_META,
        };
        // R3: a failure to obtain a drawable never substitutes one. The cell
        // draws nothing and the failure is reported, thrown or rejected alike.
        map.set(key, this.#resolutions.resolve(provider, ref, this.report));
      }
      return map;
    },
  );

  // ------------------------------------------------------------ geometry ---

  readonly #geometry = this.#memo(
    () => {
      const config = this.#config.get();
      const alignY = this.#alignY.get();
      return [
        this.#layout.get(),
        config.rows,
        config.columns,
        this.#in.width,
        this.#sizing.get(),
        this.#alignX.get(),
        alignY,
        // Read only when it can matter, so a top-aligned grid does not re-derive
        // everything when its own extent changes the box's height.
        alignY === "top" ? undefined : this.#in.height,
      ];
    },
    (layout, rows, columns, Wpx, sizing, alignX, alignY, Hpx): GridGeometry => ({
      layout,
      rows,
      columns,
      Wpx,
      sizing,
      alignX,
      alignY,
      Hpx,
    }),
  );

  /**
   * The uniform square cell, and where the residual went — `uniform.ts`, and the
   * substance of the whole fix.
   *
   * `null` until the box has been measured, and **`null` under `"dom"`**. The gate
   * is on the substrate as well as on the measurement for `domCell`'s reason: the
   * width is measured whichever substrate draws, so the measurement alone would
   * leave this non-null under `"dom"`, computing a quantisation it does not draw
   * from.
   */
  readonly #uniform = this.#memo(
    () => [this.#substrate.get(), this.#geometry.get(), this.#in.dpr],
    (substrate, geometry, dpr) =>
      substrate === "canvas" && geometry.Wpx > 0 ? uniformGeometry(geometry, dpr) : null,
  );

  /**
   * The **DOM** substrate's cell — `domGeometry`, and the one thing it does not
   * share with the canvas.
   *
   * `uniformGeometry`'s `round` leaves the residual's sign free, so at about half
   * of all widths the grid came out *narrower* than its box and the page backdrop
   * showed through a band down each side. This substrate has no presentation to
   * undo the quantisation with, so it rounds the cell up instead: the grid always
   * covers its box and **R9** clips the overhang. It cuts at the sides, and it never
   * gutters.
   *
   * Its `gridHeightDev` is the other half of the same problem: the box's height is
   * taken from it rather than declared independently, so the vertical residual has
   * nowhere to land as a shaved bottom row.
   *
   * Gated on the substrate as well as on the measurement so the canvas never
   * computes it, and so `null` still selects the affine placement that makes this
   * the SSR-complete substrate.
   */
  readonly #domCell = this.#memo(
    () => [this.#substrate.get(), this.#geometry.get(), this.#in.dpr],
    (substrate, geometry, dpr) =>
      substrate === "dom" && geometry.Wpx > 0 ? domGeometry(geometry, dpr) : null,
  );

  /**
   * Which columns the canvas rasterises — those that meet the box, widened by
   * `spill`. Computed on the **ideal** lattice, which is where the canvas presents
   * its cells (the presentation cancels the quantisation).
   *
   * Under `"fluid"` this is every column for any ordinary design, and then the
   * presentation below is 0.5.0's exactly. Under `"fixed"` in a narrow box it is a
   * handful, and the canvas stays the size of what can be seen instead of the size
   * of the grid — see `canvasPresentation`.
   */
  readonly #canvasColumns = this.#memo(
    () =>
      [this.#uniform.get(), this.#geometry.get(), this.#layout.get(), this.#spill.get()],
    (uniform, geometry, layout, spill) =>
      uniform === null
        ? null
        : visibleColumns(
            { originX: originX(geometry), originY: 0, pitch: scaleFactor(geometry) * layout.cellSize },
            geometry.columns,
            geometry.Wpx,
            spill,
          ),
  );

  readonly #presentation = this.#memo(
    () =>
      [this.#geometry.get(), this.#uniform.get(), this.#in.dpr, this.#canvasColumns.get()],
    (geometry, uniform, dpr, columns) =>
      uniform !== null && columns !== null ? canvasPresentation(geometry, uniform, dpr, columns) : null,
  );

  /**
   * The DOM substrate's columns, culled the same way on its own lattice. Before
   * measurement — and so on the server — every column, since nothing is known
   * about the box yet and the affine placement is correct at every width.
   *
   * Culled cells are **unmounted**, not hidden: under `"fixed"` a 76-column grid on
   * a phone mounts about a tenth of its nodes. Keyed by cell position, so a resize
   * mounts and unmounts only the columns at the edges.
   */
  readonly #domColumns = this.#memo(
    () =>
      [this.#domCell.get(), this.#config.get().columns, this.#in.width, this.#in.dpr, this.#spill.get()],
    (domCell, columns, width, dpr, spill) =>
      domCell === null
        ? { x0: 0, x1: columns }
        : visibleColumns(domLattice(domCell, dpr), columns, width, spill),
  );

  /**
   * `#domColumns` by value. It is a new object on every resize frame, and the
   * range inside a band is almost always the same one — so without this, every
   * frame rebuilt `shownCells` and handed the keyed list hundreds of fresh entries
   * to reconcile for a range that had not moved.
   */
  readonly #domRange = this.#memo(
    () => [this.#domColumns.get().x0, this.#domColumns.get().x1],
    (x0, x1) => ({ x0, x1 }),
  );

  /** The cells the DOM substrate mounts, in row-major order (**R10**). */
  readonly #shownCells = this.#memo(
    () => [this.#grid.get(), this.#domRange.get()],
    (grid, { x0, x1 }) => {
      const out: ShownCell[] = [];
      for (let i = 0; i < grid.cells.length; i++) {
        const cell = grid.cells[i]!;
        if (cell.tileId === null || cell.assetId === null) continue;
        const x = i % grid.columns;
        if (x < x0 || x >= x1) continue;
        out.push({ cell, i, x, y: Math.floor(i / grid.columns) });
      }
      return out;
    },
  );

  readonly #placement = this.#memo(
    () =>
      [
        this.#domCell.get(),
        this.#in.dpr,
        this.#layout.get(),
        this.#config.get().rows,
        this.#config.get().columns,
        this.#sizing.get(),
        this.#alignX.get(),
        this.#alignY.get(),
      ],
    // `rows` and `columns`, not the config: an Operation edit is a new config with
    // the same size, and a new placement would restyle every mounted cell.
    (domCell, dpr, layout, rows, columns, sizing, alignX, alignY): Placement => ({
      domCell,
      dpr,
      layout,
      rows,
      columns,
      sizing,
      alignX,
      alignY,
    }),
  );

  // ------------------------------------------------------------ keep-out ---

  /**
   * The lattice each substrate actually paints on — the mask must agree with the
   * picture to the pixel, so it asks for this rather than recomputing the ideal
   * mapping. See `Lattice` in `geometry.ts`.
   */
  readonly #lattice = this.#memo(
    () =>
      [this.#substrate.get(), this.#presentation.get(), this.#domCell.get(), this.#in.dpr],
    (substrate, presentation, domCell, dpr): Lattice | null =>
      substrate === "canvas"
        ? (presentation?.lattice ?? null)
        : domCell !== null
          ? domLattice(domCell, dpr)
          : null,
  );

  /**
   * Each cell's drawn tile at rest, for the mask — per grid, like `spill`, because
   * the mask tests the tile and not the lattice square since 0.8.0 (see
   * `occlusion.ts`'s header). The rest pose only: no animation ever reaches it.
   */
  readonly #drawn = this.#memo(() => [this.#grid.get()], (grid) => drawnTiles(grid));

  /** The device-px cell the lattice was painted with — what the mask rounds a translation by. */
  readonly #paintedCellDev = this.#memo(
    () => [this.#substrate.get(), this.#uniform.get(), this.#domCell.get()],
    (substrate, uniform, domCell) =>
      substrate === "canvas" ? (uniform?.cellDev ?? null) : (domCell?.cellDev ?? null),
  );

  /**
   * The keep-out mask — `occlusion.ts`. `null` without `options.avoid`, and until
   * there is both a measurement and a lattice.
   *
   * `stableMask` hands back the previous object when the cells hidden did not
   * change. The rects move on every frame of a resize, the mask only when a rect
   * crosses a cell edge, and that identity is what stops the DOM substrate touching
   * an attribute and the canvas repainting for a mask that did not move.
   * `#lastMask` is a plain field for `#lastTargets`' reason: a memo, not state.
   */
  #lastMask: OcclusionMask | null = null;
  readonly #mask = this.#memo(
    () => {
      // Without `avoid` there are no rects, and nothing else is read: the lattice,
      // and `drawnTiles`' four buffers per grid, are work only a mask needs.
      const rects = this.#in.rects;
      const on = rects !== null;
      return [
        rects,
        on ? this.#lattice.get() : null,
        on ? this.#paintedCellDev.get() : null,
        this.#config.get().columns,
        this.#config.get().rows,
        this.#padding.get(),
        on ? this.#drawn.get() : null,
      ];
    },
    (rects, lattice, cellDev, columns, rows, padding, drawn): OcclusionMask | null => {
      if (rects === null || lattice === null || cellDev === null || drawn === null) return null;
      this.#lastMask = stableMask(
        this.#lastMask,
        occlusionMask(lattice, columns, rows, rects, padding, { tiles: drawn, cellDev }),
      );
      return this.#lastMask;
    },
  );

  /**
   * **Nothing is shown over the page until the mask exists.** With `avoid` set,
   * tiles drawn before the first measurement would sit on top of the text for a
   * frame — and under SSR for the whole of hydration — which is exactly the
   * failure the option exists to prevent. The canvas already draws nothing before
   * it is measured; the DOM substrate hides its box. Without `avoid`, this is
   * always `false`.
   *
   * **Responsive rules hold it too, until the first measurement.** Nothing can
   * know which rule applies before the box is measured, so the cells it could
   * show are the base shape's — the wrong picture on a phone, swapped a frame
   * later. The height is already right by container query (`reservationCss`), so
   * hiding the cells until the key is real costs no layout shift.
   */
  readonly #pending = this.#memo(
    () => {
      const targets = this.#targets.get();
      // The mask only when it can matter, for `#mask`'s reason.
      return [targets, targets === null ? null : this.#mask.get(), this.#rules.get().length > 0, this.#in.width];
    },
    (targets, mask, hasRules, width) => (targets !== null && mask === null) || (hasRules && width === 0),
  );

  /**
   * The draw list, in device px on the raster's own pixel grid.
   *
   * `0` for the x origin, not `uniform.originXDev`: under `"canvas"` the canvas
   * *is* the grid — its visible columns — so there is no box to centre in. The
   * centring moved to the presentation, where it happens at the ideal fractional
   * `leftCss` and so reproduces the author's designed bleed to the pixel rather
   * than to the nearest device pixel.
   *
   * Recomputed when the grid, the width, or the DPR changes, and on nothing else
   * — in particular not when an image finishes decoding. Geometry is committed
   * before resolution is attempted and never revised as a result of it, which is
   * `07` **R5**'s substance and the reason a missing asset leaves a hole in a
   * laid-out grid rather than collapsing it.
   *
   * Gated on `presentation`, so it is the empty list under `"dom"`. Only the paint
   * reads it, and this is one object per non-empty visible cell — 760 of them on
   * the demo's 76x10 preset — rebuilt on every resize tick, which is not work to do
   * for a substrate that discards it.
   *
   * The mask is **not** applied here. It changes independently of geometry, and
   * filtering at paint keeps a mask change from rebuilding the list.
   */
  readonly #items = this.#memo(
    () => [this.#presentation.get(), this.#geometry.get(), this.#grid.get(), this.#in.dpr],
    (presentation, geometry, grid, dpr) =>
      presentation !== null ? uniformDrawList(geometry, grid, dpr, 0, assetKey, presentation) : [],
  );

  // ------------------------------------------------------------- outputs ---
  //
  // Each a stable identity until its inputs change; see the header.

  get substrate() { return this.#substrate.get(); }
  get overflow() { return this.#overflow.get(); }
  get targets() { return this.#targets.get(); }
  /** The base sizing and alignment, before responsive rules. */
  get base() { return this.#base.get(); }
  get checked(): TilesetFile { return this.#checked.get(); }
  get rules() { return this.#rules.get(); }
  get hasRules(): boolean { return this.#rules.get().length > 0; }
  get ruleKey(): string { return this.#ruleKey.get(); }
  get reservation(): string { return this.#reservation.get(); }
  get sizing() { return this.#sizing.get(); }
  get grid(): Grid<TileState> { return this.#grid.get(); }
  get ratio(): number { return this.#ratio.get(); }
  get fixedHeight(): number { return this.#fixedHeight.get(); }
  get metaByKey(): ReadonlyMap<string, Record<string, unknown>> { return this.#metaByKey.get(); }
  get drawables(): ReadonlyMap<string, Drawable | Promise<Drawable>> { return this.#drawables.get(); }
  get uniform() { return this.#uniform.get(); }
  get domCell() { return this.#domCell.get(); }
  get presentation() { return this.#presentation.get(); }
  get shownCells(): readonly ShownCell[] { return this.#shownCells.get(); }
  get placement(): Placement { return this.#placement.get(); }
  get mask(): OcclusionMask | null { return this.#mask.get(); }
  get pending(): boolean { return this.#pending.get(); }
  get items() { return this.#items.get(); }

  /** Run counts per stage, for tests. */
  get runs(): Readonly<Record<"resolved" | "grid" | "drawables" | "geometry" | "mask" | "drawn" | "items", number>> {
    return {
      drawn: this.#drawn.runs,
      resolved: this.#resolved.runs,
      grid: this.#grid.runs,
      drawables: this.#drawables.runs,
      geometry: this.#geometry.runs,
      mask: this.#mask.runs,
      items: this.#items.runs,
    };
  }
}

// ----------------------------------------------------------- cell style ---

/**
 * The DOM cell's whole inline style: placement, then its own transform, then its
 * opacity.
 *
 * **Placement is by percentage margin, not by `transform: translate()`**
 * (`08` §12). §6.3 illustrated the translate, and it drew seams: a transformed
 * element is rasterized at sub-pixel precision — the substrate is not permitted
 * to snap it — so at any width where `s * cellSize` is fractional, every cell
 * edge landed mid-pixel and was antialiased. Two adjacent antialiased edges each
 * contribute *partial* coverage to the shared boundary pixel, and source-over of
 * two partial coverages never sums to one, so a sliver of the backdrop survived
 * at every seam. That is `07` §5.6's "faint grid of seams across the whole
 * background… invisible at some widths and obvious at others", reached through
 * the substrate rather than through the arithmetic.
 *
 * A **percentage margin resolves against the containing block's width** — this
 * is true of `margin-top` as well as `margin-left`, and it is why the vertical
 * offset a percentage `top` could not carry (§6.3's objection) is carried here
 * anyway. So placement stays a fixed fraction of `Wpx` per `07` §5.3, nothing
 * is measured, and **S8** is untouched: a host overriding the box height still
 * gets square cells clipped by **R9**, never stretched ones.
 *
 * **The `transform` property is omitted entirely for an identity cell.** That is
 * what earns the snap: an untransformed border box is pixel-snapped, and
 * **R6**'s shared edge survives the snap because cell `x`'s right edge and cell
 * `x+1`'s left edge are one number, and `round()` of one number is one number.
 * Neither a gap nor an overlap can open, at any `Wpx`.
 *
 * **`opacity` is omitted at 1** for the same reason: a value below 1 forces a
 * stacking context, and emitting it unconditionally imposed one on every cell in
 * the grid for no gain.
 *
 * `07` §6.3 and `08` §6.3's ordering warning still binds what `cssTransform`
 * emits — **a CSS transform list applies right to left**, so it must read
 * `rotate(...) scale(...)` for **D11**'s scale-before-rotation to hold. The list
 * is `cssTransform`'s and not a second copy of it: the component used to spell
 * it out inline, which meant the pure function and the only renderer that ships
 * could disagree — and they would have, the moment ADR-005 added `scale` to one
 * of them.
 */
export function cellStyle(p: Placement, cell: TileState, x: number, y: number): string {
  let style = p.domCell !== null ? measuredCellStyle(p.domCell, p.dpr, cell, x, y) : affineCellStyle(p, cell, x, y);
  if (!isIdentityTransform(cell)) style += ` transform: ${cssTransform(cell)};`;
  if (cell.opacity < 1) style += ` opacity: ${cell.opacity};`;
  return style;
}

/**
 * The DOM box's inline style. It declares the natural ratio only until there is
 * a grid to measure: a declared ratio is the *ideal* height and the grid inside
 * it is quantised, and because the grid is top-anchored the disagreement would
 * land on the bottom edge as a shaved bottom row. After measurement `.extent`
 * carries the height ({@link extentStyle}). Under `"fixed"` the extent carries it
 * from the start, and with rules the reservation stylesheet declares it.
 *
 * `visibility: hidden` while `pending`: with `avoid` set, nothing is shown over
 * the page until the mask exists. Space is still reserved, so nothing reflows
 * when it appears.
 *
 * One function for both renderers, so their boxes cannot drift apart.
 */
export function domBoxStyle(m: {
  domCell: DomGeometry | null;
  sizing: ResolvedOptions["sizing"];
  hasRules: boolean;
  ratio: number;
  pending: boolean;
}): string {
  const ratio = m.domCell === null && m.sizing !== "fixed" && !m.hasRules ? `aspect-ratio: ${m.ratio};` : "";
  return ratio + (m.pending ? " visibility: hidden;" : "");
}

/**
 * The canvas box's inline style. It declares a ratio only until it has a canvas
 * to measure, then takes its height from the canvas, the way an ordinary block
 * takes it from its only child: `naturalRatio` and the canvas's intrinsic ratio
 * differ by up to half a CSS px at a fractional `yOffset` (`originYDev` is
 * rounded), so a permanent ratio would leave the canvas a fraction short and a
 * hairline of backdrop under the bottom row. Clamping with `min-height` instead
 * would stretch the picture by that half pixel, and this substrate exists to
 * keep cells square. Under `"fixed"` the natural height is a constant, reserved
 * as one; with rules the reservation stylesheet declares it.
 *
 * One function for the renderer and the server placeholder, so they agree.
 */
export function canvasBoxStyle(m: {
  presentation: CanvasPresentation | null;
  sizing: ResolvedOptions["sizing"];
  hasRules: boolean;
  ratio: number;
  fixedHeight: number;
}): string {
  if (m.presentation !== null || m.hasRules) return "";
  return m.sizing === "fixed" ? `height: ${m.fixedHeight}px;` : `aspect-ratio: ${m.ratio};`;
}

/**
 * `.extent`'s inline style, or `null` when the box has no extent. After
 * measurement it is `gridHeightDev`, the last horizontal edge — the same
 * expression the cells are placed by, so it cannot disagree with them. Before
 * it, under `"fixed"`, the constant natural height.
 */
export function extentStyle(
  domCell: DomGeometry | null,
  dpr: number,
  sizing: ResolvedOptions["sizing"],
  fixedHeight: number,
): string | null {
  if (domCell !== null) return `height: ${domCell.gridHeightDev / dpr}px`;
  return sizing === "fixed" ? `height: ${fixedHeight}px` : null;
}

/**
 * The DOM substrate's placement **before measurement**: affine CSS lengths,
 * `cellPlacementAffine`, correct at every width with nothing measured, per
 * `07` §5.3. Under `"fluid"` with top alignment that is bare percentages,
 * byte-identical to what 0.5.0 emitted; `"fixed"` adds a px term and a pinned
 * percentage (`calc(50% + 12px)`), and a non-top `alignY` a percentage `top`.
 *
 * This is the placement that can be written into HTML before any script runs —
 * the seam a server-side `renderHtml()` would be built on, and why it is its own
 * exported function rather than a branch inside {@link cellStyle}.
 */
export function affineCellStyle(
  p: Pick<Placement, "layout" | "rows" | "columns" | "sizing" | "alignX" | "alignY">,
  cell: TileState,
  x: number,
  y: number,
): string {
  const a = cellPlacementAffine(
    { layout: p.layout, rows: p.rows, columns: p.columns, sizing: p.sizing, alignX: p.alignX, alignY: p.alignY },
    x,
    y,
    cell,
  );
  return (
    `width: ${cssLength(a.side)}; ` +
    `margin-left: ${cssLength(a.left)}; ` +
    `margin-top: ${cssLength(a.marginTop)};` +
    (a.topPct === 0 ? "" : ` top: ${a.topPct}%;`)
  );
}

/**
 * The DOM substrate's placement **after measurement**: px from `domGeometry`'s
 * square cell, pinned in the box at an integer origin. Neighbours share an edge
 * here too — cell `x`'s right edge is `originXDev + (x+1) * cellDev`, which is
 * identically cell `x+1`'s left edge (**R6**) — and the widths are equal as well
 * as adjacent, so `object-fit: cover` crops a square asset by nothing.
 *
 * **`domGeometry` and not `uniformGeometry`**, which is the one place this
 * substrate's geometry parts company with the canvas's: its cell is rounded
 * **up**, so the grid always covers its box and the residual can only ever be a
 * cut. `uniformGeometry`'s `round` left the residual's sign free, and at about
 * half of all widths that showed as a band of page backdrop down each side.
 * Under `"fixed"` at an integer DPR the ideal cell is already whole and the two
 * roundings agree — the residual this paragraph is about is then zero.
 *
 * The **vertical** residual is not answered by any of that. It is answered by the
 * box taking its height from `gridHeightDev` — see the `.extent` element, which is
 * why the bottom row is no longer shaved.
 *
 * **`blitRect` is gone and needs no successor.** It transposed the fill rect
 * under a quarter turn because per-edge snapping made the device rect 133 x 132,
 * and rotating *that* left a hairline down each side. A square rect quarter-turned
 * **is** the same rect, so the uniform cell removes the special case rather than
 * needing it — predicted before it was read, and confirmed.
 *
 * The swap from the affine placement happens on the first measurement, and it is
 * no longer the sub-pixel nudge it was under `round`: `ceil` grows the cell by up
 * to a whole device pixel, so the grid widens by up to `columns` device px and its
 * edges move outward by half of that. The picture stays put — the shift is
 * symmetric about the box's centre and lands outside it, in the region **R9**
 * clips — and `08` **S8**'s reserved space is the box's, not the cells', so
 * nothing reflows around it either.
 */
export function measuredCellStyle(u: DomGeometry, dpr: number, cell: TileState, x: number, y: number): string {
  const side = u.cellDev / dpr;
  // 0.8.0's translation rides on the margin, in whole device px, for the
  // reason `translationDev` gives: a cell that is only translated keeps its
  // snapped box. Moving the border box is also what moves the hit area, so a
  // translated tile is hit where it is drawn, by the browser, for nothing.
  const { tx, ty } = translationDev(cell, u.cellDev);
  return (
    `width: ${side}px; ` +
    `height: ${side}px; ` +
    `margin-left: ${(u.originXDev + x * u.cellDev + tx) / dpr}px; ` +
    `margin-top: ${(u.originYDev + y * u.cellDev + ty) / dpr}px;`
  );
}
