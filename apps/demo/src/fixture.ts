import type { TilesetFile } from "@tileset/core";

/**
 * A hand-written `TilesetFile` — `06-config-schema.md` §3.
 *
 * **This is not a reference config** in the `05` §11.1 sense. Those are
 * snapshotted against a `(config, seed, loadSalt)` triple, must between them
 * exercise every registered type, both mapping kinds, every Blend, both bounding
 * behaviours, and at least one clipped-cell case — and they are deliberately not
 * built yet.
 *
 * This is a demo fixture whose job is to put something on screen that exercises
 * all four attributes, so the engine's work is visible rather than merely tested.
 *
 * ## The Layout, derived per `02` §7.1
 *
 *     n = ceil(referenceWidth / cellSize) = ceil(1000 / 120) = 9
 *     9 is odd, matching horizontalAlignment "column", so no parity correction
 *     columns = 9, referenceWidth = 1000
 *
 * Grid design width is `9 * 120 = 1080`, which exceeds `referenceWidth` by **80
 * design px of intentional bleed** — 40 off each side (`02` §7.2). That bleed is
 * the reason `referenceWidth` is stored rather than derived, and it is visible in
 * the demo: the first and last columns run off the edges of the render box.
 */
export const fixture: TilesetFile = {
  // Required, and `1` in V1. Absent or unknown is a load failure (`06` **C2**).
  schemaVersion: 1,
  // Required, advisory, never validated against anything (`06` **C3**).
  engineVersion: "0.0.0",

  config: {
    rows: 6,
    columns: 9,
    // Required, so a config renders standalone. The engine never applies it —
    // the caller does (`02` §4.1, `07` §9.2).
    defaultSeed: "sunset-3",
    assetSalt: 0,
    reseedAssetsOnLoad: false,

    tiles: [
      {
        id: "water",
        name: "water",
        assets: [
          { id: "a1", weight: 2, meta: { src: "/tiles/water-a.svg", width: 100, height: 100 } },
          { id: "a2", weight: 1, meta: { src: "/tiles/water-b.svg", width: 100, height: 100 } },
        ],
      },
      {
        id: "sand",
        name: "sand",
        // A single TileAsset is a fully determined drawable (`03` §6.1).
        assets: [
          { id: "a1", weight: 1, meta: { src: "/tiles/sand-a.svg", width: 100, height: 100 } },
        ],
      },
      {
        id: "grass",
        name: "grass",
        assets: [
          { id: "a1", weight: 3, meta: { src: "/tiles/grass-a.svg", width: 100, height: 100 } },
          { id: "a2", weight: 1, meta: { src: "/tiles/grass-b.svg", width: 100, height: 100 } },
          // weight 0 — listed but never chosen, "temporarily off" without
          // deleting it (`03` §4.1). It must never appear on screen.
          { id: "a3", weight: 0, meta: { src: "/tiles/sand-a.svg", width: 100, height: 100 } },
        ],
      },
    ],

    // An array, and its order is the stack order of `02` §9.
    operations: [
      /**
       * A noise field banded through a palette — `04` §6.3's worked case.
       *
       * "With `valueNoise` the field is smooth, so cells below 0.2 are
       * *contiguous*. Lakes, then shorelines, then grass." Swapping this Source
       * for `random` scatters the same three tiles at the same proportions;
       * swapping it for `gradient` gives horizontal strata. One Operation, one
       * palette, three completely different structures.
       */
      {
        id: "terrain",
        salt: 0,
        selection: { type: "all" },
        // One octave, not two. `valueNoise`'s output is bell-shaped and gets
        // sharper with every octave, so at two octaves almost nothing falls below
        // the water threshold and 04 §6.3's promised lakes never appear.
        source: { type: "valueNoise", cellsPerFeature: 4.5, octaves: 1 },
        target: "tileId",
        mapping: {
          // Order is authored and load-bearing (**O6**): water must sit next to
          // sand and not next to grass, and order is the only way to say so.
          //
          // These weights are NOT the 1/1/3 of `04` §6.3's example. That section
          // claims a weight is "proportion of area" under `valueNoise` as well as
          // under `random`, and it is not — see the discrepancy pinned in
          // `packages/tileset/src/mapping.test.ts`. Authoring 1/1/3 here yields
          // about 10% water rather than 20%, so the weights are compensated to
          // put visible water on screen.
          palette: [
            { tileId: "water", weight: 2 },
            { tileId: "sand", weight: 1 },
            { tileId: "grass", weight: 4 },
          ],
        },
        blend: "set",
      },

      /**
       * Barely-there jitter on a third of the cells — `04` §6.1's own example.
       *
       * `random` Selection is what makes "rotate 30% of tiles, leave the rest
       * alone" expressible: there is no numeric range meaning "do not write"
       * (`04` §4.3). It draws from the selection channel, so the chosen cells are
       * uncorrelated with the values they receive.
       */
      {
        id: "jitter",
        salt: 3,
        selection: { type: "random", density: 0.3 },
        source: { type: "random" },
        target: "rotation",
        mapping: { range: [-12, 12] },
        blend: "add",
      },

      /**
       * Flip every third column — `04` §6.2's flip case.
       *
       * `steps: 2` over `[-1, 1]` gives exactly two values, each on half the
       * cells, both attained exactly. Continuous `[-1, 1]` would produce values
       * near 0 — tiles scaled to invisibility — which is never what "flip half of
       * them" meant. A negative `scaleX` mirrors about the centre axis (**D11**).
       */
      {
        id: "flip",
        salt: 0,
        selection: { type: "everyNth", axis: "column", n: 3, offset: 0 },
        source: { type: "random" },
        target: "scaleX",
        mapping: { range: [-1, 1], steps: 2 },
        blend: "set",
      },

      /**
       * A vertical fade — `gradient` at 90deg sweeps top to bottom, because `y`
       * increases downward (`02` §5).
       *
       * Reversal needs no parameter: `range: [1, 0.35]` has `min > max`, which is
       * how every Source is inverted without a flag (`04` §6.2).
       */
      {
        id: "fade",
        salt: 0,
        selection: { type: "all" },
        source: { type: "gradient", angle: 90 },
        target: "opacity",
        mapping: { range: [1, 0.35] },
        blend: "set",
      },

      /**
       * Gentle vertical scale variation, flagged to vary on every load.
       *
       * **`reseedOnLoad: true`** means this Operation hashes against a seed that
       * moves each time the caller draws a fresh `loadSalt` (`02` §6.7). Every
       * other Operation above is unflagged and stays pinned forever, whatever
       * `loadSalt` happens to be — which is the whole point of the flag, and what
       * the demo's "New load salt" button demonstrates.
       */
      {
        id: "breathe",
        salt: 0,
        reseedOnLoad: true,
        selection: { type: "all" },
        source: { type: "valueNoise", cellsPerFeature: 6, octaves: 1 },
        target: "scaleY",
        mapping: { range: [0.94, 1.07] },
        blend: "set",
      },
    ],
  },

  layout: {
    cellSize: 120,
    referenceWidth: 1000,
    // Shifts the grid up by a quarter cell, clipping the top of row 0 (`02` §7.4).
    yOffset: 0.25,
    // Authoring metadata. Read by neither engine nor renderer (`02` §7.3).
    horizontalAlignment: "column",
  },
};
