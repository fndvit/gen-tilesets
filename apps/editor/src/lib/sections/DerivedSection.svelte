<!--
  What the file implies but the author does not type. Not in Figma; read-only
  rows in the field-row shape: the muted label in the label column, the value
  in `.t-console` right after it.

  `columns` is **displayed, never edited** (§9.1). The author needs to know it,
  because a `rect` is authored in column indices, and editing it would break
  `columns * cellSize >= referenceWidth` and produce `06` §10.4's fourth
  diagnostic from inside the editor, which **E1** forbids.
-->
<script lang="ts">
  import { naturalHeight } from "@vit-foundation/gen-tilesets/render";
  import { bleed } from "../../derive.js";
  import { ENGINE_VERSION } from "../../document.js";
  import { session } from "../../session.svelte.js";
  import Section from "../Section.svelte";

  const file = $derived(session.file);
  const config = $derived(file.config);
  const layout = $derived(file.layout);

  const currentBleed = $derived(bleed(layout.referenceWidth, layout.cellSize, config.columns));

  /**
   * The **visible** grid height, in design px.
   *
   * `07` §5.3 defines the render box's natural height as
   * `s * (rows - yOffset) * cellSize`: "the box that exactly contains the
   * visible grid, clipping row 0's top by `yOffset` and ending flush with the
   * last row's bottom edge". Evaluating it at `Wpx = referenceWidth` makes
   * `s = 1`, so the same function returns design px.
   *
   * Taken from the package rather than multiplied out here. `07` **R1**
   * requires one implementation of the coordinate mapping, and `08` **S10**
   * exports it for exactly this.
   */
  const visibleHeight = $derived(
    naturalHeight({ layout, rows: config.rows, columns: config.columns, Wpx: layout.referenceWidth }),
  );

  /** What `yOffset` clips off the top of row 0, in design px (`02` §7.4). */
  const clipped = $derived(layout.yOffset * layout.cellSize);

  const round = (n: number): number => Math.round(n * 1000) / 1000;

  /*
    `02` §7.4: the grid is **top-anchored**, its height is `rows * cellSize` in
    design px, and only `rows` makes it taller or shorter. There is no vertical
    counterpart to `horizontalAlignment`, and no vertical bleed here: `07` §7.3
    makes that the host's, through the box's height.
  */
  const rows = $derived<[string, string][]>([
    ["Columns", String(config.columns)],
    ["Grid width", `${config.columns * layout.cellSize} px`],
    ["Grid height", `${config.rows * layout.cellSize} px`],
    [
      "Visible height",
      `${round(visibleHeight)} px` + (clipped > 0 ? ` (${round(clipped)} clipped)` : ""),
    ],
    ["Bleed", `${currentBleed} px` + (currentBleed > 0 ? ` (${currentBleed / 2} each side)` : "")],
    ["Tiles", String(config.tiles.length)],
    ["Operations", String(config.operations.length)],
    ["Engine", ENGINE_VERSION],
    ["Schema", String(file.schemaVersion)],
  ]);
</script>

<Section title="Derived" open={false} summary="{config.columns} columns · {config.columns * layout.cellSize} × {config.rows * layout.cellSize} px">
  <dl>
    {#each rows as [term, value] (term)}
      <div class="row">
        <dt class="t-label">{term}</dt>
        <dd class="t-console">{value}</dd>
      </div>
    {/each}
  </dl>
</Section>

<style>
  dl {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
    margin: 0;
    color: var(--color-ink);
  }

  .row {
    display: grid;
    grid-template-columns: var(--field-label-w) minmax(0, 1fr);
    align-items: baseline;
    gap: var(--space-4);
  }

  dd {
    margin: 0;
    padding-left: var(--space-4);
  }
</style>
