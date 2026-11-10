<!--
  One choice from a short list whose options need more than a word: a label
  and a value each, as Export image's sizes are ("Breakpoint 2", "768 px")
  (`DESIGN_SYSTEM.md` *Radio list*). A segmented control (`Toggle`) holds a
  word per option and no more.

  A field-grey well of 30px rows: a 12px ring, the label, and the value in mono
  at the right. The chosen row is ink with white text and a filled white dot,
  the selected state everywhere in the editor, so the choice shows by the dot's
  shape as well as by the row's colour (1.4.1).

  The radios are native, only restyled. That gives the group's name (the
  legend), Tab entering on the chosen row and the arrow keys moving the choice
  for free, so there is no key handling here, unlike `Toggle`, which is built
  from buttons. The input stays the focus target; its ring is drawn on the
  whole row.

  Options are told apart by `key`, not by the value they stand for: two sizes
  can share a width (a breakpoint bound equal to the design width keeps its own
  row), and a radio group needs one value per row.

  **Described** (`DESIGN_SYSTEM.md` *Radio list, described*, New tileset): an
  option with a `description` gets a taller row, its label over a muted line
  that says what choosing it does. `detail` is then usually left out. One list
  is all described or all plain; the row height follows each option, so a mix
  would still work, but nothing asks for one.

  `legendHidden` keeps the legend for assistive tech and hides it from sight,
  for a list whose popup title already says what it chooses.
-->
<script lang="ts" generics="K extends string">
  interface Option {
    key: K;
    label: string;
    /** The value at the right, in mono: "768 px". */
    detail?: string;
    /** A muted line under the label: what choosing this does. */
    description?: string;
  }

  interface Props {
    legend: string;
    /** The radios' shared `name`; unique on the page. */
    name: string;
    options: Option[];
    value: K;
    /** Hide the legend from sight, not from assistive tech. */
    legendHidden?: boolean;
  }

  let { legend, name, options, value = $bindable(), legendHidden = false }: Props = $props();
</script>

<fieldset class="radio-list">
  <legend class="t-label" class:visually-hidden={legendHidden}>{legend}</legend>
  <div class="well">
    {#each options as option (option.key)}
      <label class="row t-xs" class:chosen={option.key === value} class:described={option.description !== undefined}>
        <input type="radio" {name} value={option.key} bind:group={value} />
        {#if option.description !== undefined}
          <span class="text">
            <span class="label">{option.label}</span>
            <span class="description t-body">{option.description}</span>
          </span>
        {:else}
          <span class="label">{option.label}</span>
        {/if}
        {#if option.detail !== undefined}
          <span class="detail t-console">{option.detail}</span>
        {/if}
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .radio-list {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    padding: 0;
    margin-bottom: var(--space-3);
  }

  .well {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    background: var(--color-field);
  }

  /* `--control-h` tall: above the 24px target floor (2.5.8). */
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-height: var(--control-h);
    padding: 0 var(--space-4);
    border-radius: calc(var(--radius-sm) - var(--space-1));
    color: var(--color-ink);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .row:hover:not(.chosen) {
    background: var(--color-hover);
  }

  .row.chosen {
    background: var(--color-selected);
    color: var(--color-on-selected);
    cursor: default;
  }

  .row:has(:focus-visible) {
    outline: var(--focus-w) solid var(--color-accent);
    outline-offset: 0;
  }

  /* The ring: ink on the field grey (1.4.11), filled white once chosen. */
  input {
    flex: none;
    appearance: none;
    box-sizing: border-box;
    width: 12px;
    height: 12px;
    margin: 0;
    border: 1.5px solid currentColor;
    border-radius: 50%;
    background: transparent;
    /* Form controls do not inherit `color`; the ring follows the row's text. */
    color: inherit;
    cursor: inherit;
  }

  input:checked {
    background: currentColor;
  }

  input:focus-visible {
    outline: none;
  }

  .label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail {
    flex: none;
  }

  /*
    Described: at least 52px, so the label and its line sit apart without
    crowding, padded --space-5 above and below. The description wraps; the
    label still truncates.
  */
  .row.described {
    min-height: var(--radio-described-h);
    padding: var(--space-5) var(--space-4);
  }

  .text {
    display: grid;
    flex: 1 1 auto;
    gap: var(--space-2);
    min-width: 0;
  }

  .description {
    color: var(--color-muted);
  }

  /* White at 75% on ink: ≈ 13:1, well above 4.5:1 (1.4.3). */
  .row.chosen .description {
    color: color-mix(in srgb, var(--color-on-selected) 75%, transparent);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
