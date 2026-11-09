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

  Cell size and design width commit on blur or Enter (`commit="blur"`), so the
  confirmation asks once, for the whole value (Stage 2 W4). Rows does too, so a
  "14" does not first rebuild the grid at 1 row (Pol, W4 review). The preview
  does not follow the typing in those three. Alignment is a toggle: a click is a
  commit.

  Under the fields, a folded "Details" group lists what the file implies but
  the author does not type (`grid-details.ts`): the column count, the grid's
  size, the bleed, the counts and the versions. It was a section of its own,
  "Derived", until batch 01 (T-03, D-02 A) put the numbers next to the fields
  that change them. It is the same `Collapsible` group a breakpoint rule or a
  tile group uses, closed by default as the Derived section was.
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
  import Collapsible from "../ui/Collapsible.svelte";
  import Toggle from "../ui/Toggle.svelte";
  import { gridDetails } from "./grid-details.js";

  interface Props {
    /** The coordinate-bound Operations a resize would affect (`orphans.ts` `atRisk`). */
    risked: Operation[];
    /**
     * App's confirmation gate for an edit that re-derives `columns`. `field` is
     * the label in lower case ("cell size"), `value` the new value as shown.
     */
    destructive: (field: string, value: string, transition: Transition) => void;
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

  /** What the header says while the section is closed: the values below, in one line. */
  const summary = $derived(
    `${layout.cellSize} px · ${config.rows} rows · ${layout.referenceWidth} wide · ${layout.horizontalAlignment}`,
  );

  const details = $derived(gridDetails(session.file));
  const detailsSummary = $derived(
    `${config.columns} columns · ${config.columns * layout.cellSize} × ${config.rows * layout.cellSize} px`,
  );

  const alignments = [
    { value: "column", label: "Column" },
    { value: "gutter", label: "Gutter" },
  ] as const;
</script>

<Section title="Grid & size" {summary}>
  <div class="fields">
    <NumericInput
      label="Cell size"
      hint="One cell's size, in design px. {consequence}"
      value={layout.cellSize}
      parse={parseCellSize}
      commit="blur"
      onCommit={(t) => destructive("cell size", t, setCellSize(t))}
    />
    <NumericInput
      label="Rows"
      step="1"
      value={config.rows}
      parse={parseRows}
      commit="blur"
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
      hint="The page width the design is drawn at, in px. {consequence}"
      value={layout.referenceWidth}
      parse={parseReferenceWidth}
      commit="blur"
      onCommit={(t) => destructive("design width", t, setReferenceWidth(t))}
    />
    <!--
      §9.1's toggle. It writes `horizontalAlignment`, which is authoring metadata
      the renderer never reads (`02` §7.3). Its only function is constraining
      parity during derivation, and toggling it can move `columns` by one
      through that alone.
    -->
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
            destructive("alignment", option, setHorizontalAlignment(option))}
        />
      {/snippet}
    </FieldRow>

    <div class="details">
      <Collapsible title="Details" variant="group" open={false} summary={detailsSummary}>
        <dl>
          {#each details as [term, value] (term)}
            <div class="row">
              <dt class="t-label">{term}</dt>
              <dd class="t-console">{value}</dd>
            </div>
          {/each}
        </dl>
      </Collapsible>
    </div>
  </div>
</Section>

<style>
  .fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
  }

  /* A little more room above than between fields: the read-only part starts here. */
  .details {
    margin-top: var(--space-3);
  }

  /* Read-only rows in the field-row shape: the label column, then the value in the console face. */
  dl {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
    margin: 0;
    padding: var(--space-2) var(--space-5) var(--space-5);
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
