<!--
  The Figma *Grid & Size* section: cell size, rows, y offset, design width and
  alignment.

  `09` §9.3: "The three controls sit together, away from the preview width
  handle." §9.2's principle is that the destructive edit must not be the one
  that is easy to do by accident. A page edge that can be dragged reads as a
  viewport, and a viewport does not destroy work, so the destructive controls
  are typed fields here and the harmless one is the drag handle on the preview.

  Design width is not in Figma. It sits beside Alignment because §9.1 puts the
  alignment toggle beside it, and it is built from the same row.

  **The three destructive fields** (cell size, design width, alignment)
  re-derive `columns` (**E12**), so they go through `destructive`, App's gate,
  which asks first only where an Operation is coordinate-bound (§9.3: "a
  dialogue that appears every time teaches the author to dismiss it before
  reading"). Their hints say which of the two states the document is in. Rows
  and y offset never re-derive anything and apply directly.
-->
<script lang="ts">
  import type { Operation } from "@vit-foundation/gen-tilesets";
  import {
    setCellSize,
    setHorizontalAlignment,
    setReferenceWidth,
    setRows,
    setYOffset,
    type Transition,
  } from "../../document.js";
  import { parseCellSize, parseReferenceWidth, parseRows, parseYOffset } from "../../fields.js";
  import { session } from "../../session.svelte.js";
  import NumericInput from "../NumericInput.svelte";
  import Section from "../Section.svelte";
  import FieldRow from "../ui/FieldRow.svelte";
  import Toggle from "../ui/Toggle.svelte";

  interface Props {
    /** The coordinate-bound Operations a resize would affect (`orphans.ts` `atRisk`). */
    risked: Operation[];
    /** App's confirmation gate for an edit that re-derives `columns`. */
    destructive: (label: string, transition: Transition) => void;
  }

  let { risked, destructive }: Props = $props();

  const config = $derived(session.file.config);
  const layout = $derived(session.file.layout);

  /** The second half of each destructive hint: whether a change will ask first. */
  const consequence = $derived(
    risked.length > 0
      ? `Changes the column count. ${risked.map((op) => op.id).join(", ")} ${
          risked.length === 1 ? "is" : "are"
        } tied to specific cells, so a change asks first.`
      : "Changes the column count. Every selection here survives a resize, so it applies at once.",
  );

  const alignments = [
    { value: "column", label: "Column" },
    { value: "gutter", label: "Gutter" },
  ] as const;
</script>

<Section
  title="Grid & Size"
  summary="{layout.cellSize} px cells · {config.rows} rows · {layout.referenceWidth} wide"
>
  <div class="fields">
    <NumericInput
      label="Cell size"
      unit="px"
      hint="One cell's size, in design px. {consequence}"
      value={layout.cellSize}
      parse={parseCellSize}
      onCommit={(t) => destructive(`Cell size → ${t}`, setCellSize(t))}
    />
    <NumericInput
      label="Rows"
      step="1"
      value={config.rows}
      parse={parseRows}
      onCommit={(t) => session.apply(setRows(t))}
    />
    <NumericInput
      label="Y offset"
      step="0.05"
      hint="Shifts the grid up by a fraction of a cell, from 0 to just under 1. The top of row 0 is clipped."
      value={layout.yOffset}
      parse={parseYOffset}
      onCommit={(t) => session.apply(setYOffset(t))}
    />
    <NumericInput
      label="Design width"
      unit="px"
      hint="The page width the design is drawn at, in px. {consequence}"
      value={layout.referenceWidth}
      parse={parseReferenceWidth}
      onCommit={(t) => destructive(`Design width → ${t}`, setReferenceWidth(t))}
    />
    <!--
      §9.1's toggle. It writes `horizontalAlignment`, which is authoring metadata
      the renderer never reads (`02` §7.3). Its only function is constraining
      parity during derivation, and toggling it can move `columns` by one
      through that alone.
    -->
    <div class="wide">
    <FieldRow
      label="Alignment"
      align="center"
      hint="Whether the page centre falls on a column or on a gutter. {consequence}"
    >
      {#snippet children()}
        <Toggle
          label="Alignment"
          options={[...alignments]}
          value={layout.horizontalAlignment}
          onChange={(option) =>
            destructive(`Alignment → ${option}`, setHorizontalAlignment(option))}
        />
      {/snippet}
    </FieldRow>
    </div>
  </div>
</Section>

<style>
  /* Two boxed fields per row; the segmented Alignment takes a whole row. */
  .fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .wide {
    grid-column: 1 / -1;
  }
</style>
