<!--
  The open operation's body: a vertical stepper inside its card
  (`OperationCard`). It edits a draft, never the file (`09-editor.md` §7).

  Four steps, in the order the author walks them: **Selection → attribute →
  Source → Blend**, with the mapping folded into the attribute step per §7.4.
  Iteration 2 lays them out as a numbered list joined by a line, each row the
  step's name and its current answer, instead of a row of tabs: how the steps
  follow one another is visible, and every answer stays in view while one is
  edited. A step's number is filled once it is answered, hollow while it is
  not, and the accent marks the open one.

  The open step unfolds under its row: a question, a glyph grid of the
  options, then the chosen option's fields in a grey well under a caption
  naming the choice, so it is plain that the fields belong to that choice and
  where they end (Pol, Block F review). An option with no fields gets no well.

  | Step      | Options from                                  |
  | --------- | --------------------------------------------- |
  | Selection | the registry, with Figma's artwork             |
  | attribute | `TARGETS` (label-only until designed)          |
  | Source    | the registry (label-only until designed)       |
  | Blend     | `acceptedBlends()` — §7.7, ADR-001             |

  A Selection or Source registered later appears with no change here (**E9**),
  as a label-only cell if it has no artwork. The steps stay navigable after the
  fact rather than being a one-way wizard: §7.4's collapse under a `constant`
  Source and §7.6's advisory about a reordered palette under `random` make the
  attribute step depend on the Source after it (`DECISIONS.md` D8).

  The Blend grid shows every accepted Blend with the Target's default chosen,
  rather than §7.7's "reveal the accepted set only on request" (Pol, Block E).
  A vetoed Blend is absent, not disabled (`04` §7.2).

  **E5** — the draft reaches the file at Save and nowhere else, as **one**
  `TilesetFile -> TilesetFile` transition (`DECISIONS.md` D7), so an edit is
  one undo entry (**E6**).
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    acceptedBlends,
    selections,
    sources,
    TARGETS,
    type AttributeName,
    type BlendName,
    type TargetName,
  } from "@vit-foundation/gen-tilesets";
  import allGlyph from "../../assets/glyphs/selection/all.svg";
  import checkeredGlyph from "../../assets/glyphs/selection/checkered.svg";
  import everyNthGlyph from "../../assets/glyphs/selection/every-nth.svg";
  import handpickGlyph from "../../assets/glyphs/selection/handpick.svg";
  import randomGlyph from "../../assets/glyphs/selection/random.svg";
  import rectGlyph from "../../assets/glyphs/selection/rect.svg";
  import { isTileTarget } from "../../controls/mapping.js";
  import NumericMappingControl from "../../controls/NumericMapping.svelte";
  import PaletteBar from "../../controls/PaletteBar.svelte";
  import ParamFields from "../../controls/ParamFields.svelte";
  import { addOperation, replaceOperation } from "../../document.js";
  import {
    defaultParams,
    isComplete,
    retarget,
    STEPS,
    toOperation,
    type Draft,
    type Step,
  } from "../../draft.svelte.js";
  import { session } from "../../session.svelte.js";
  import Button from "../ui/Button.svelte";
  import FieldRow from "../ui/FieldRow.svelte";
  import GlyphGrid from "../ui/GlyphGrid.svelte";
  import Hint from "../ui/Hint.svelte";
  import Toggle from "../ui/Toggle.svelte";
  import { draftParts, labelFor, summaryCells, writesOf, writesText } from "./labels.js";

  interface Props {
    /**
     * Held **beside** the file in `drafting.svelte.ts` rather than owned here,
     * so §7.3's brush can paint into it from the preview. Its id was allocated
     * when it opened and is never reassigned (§4.3).
     */
    draft: Draft;
    /** Whether Save replaces an Operation in the stack rather than appending one. */
    editing: boolean;
    onClose: () => void;
    /** The id the card's title `aria-controls` names. */
    id?: string;
  }

  let { draft, editing, onClose, id }: Props = $props();

  const ownId = $props.id();
  const base = $derived(id ?? ownId);

  /**
   * Selection artwork, by registry name, in Figma's order. A name missing here
   * gets a label-only cell after these.
   */
  const SELECTION_GLYPHS: Record<string, string> = {
    all: allGlyph,
    checkerboard: checkeredGlyph,
    everyNth: everyNthGlyph,
    random: randomGlyph,
    rect: rectGlyph,
    cellList: handpickGlyph,
  };

  const QUESTIONS: Record<Step, string> = {
    selection: "Which cells does this operation affect?",
    attribute: "What does this operation write?",
    source: "Where does each cell's number come from?",
    blend: "How does this combine with what is already there?",
  };

  /** The 1-based numbers of the file's breakpoints that name `rows` or `columns`. */
  const resizedBy = $derived(
    (session.file.responsive ?? []).flatMap((r, i) =>
      r.rows !== undefined || r.columns !== undefined ? [i + 1] : [],
    ),
  );

  const glyphOrder = Object.keys(SELECTION_GLYPHS);
  const rank = (name: string): number => {
    const i = glyphOrder.indexOf(name);
    return i < 0 ? glyphOrder.length : i;
  };

  /**
   * A coordinate-bound Selection holds literal cells, so it cannot live in a
   * stack whose grid a breakpoint resizes — `document.ts` would refuse the
   * commit (`COORDINATE_BOUND_RESIZE`). Disabled, with the reason as a hint on
   * the question, so the refusal never arrives as a silent no-op.
   */
  const selectionItems = $derived(
    [...selections.all()].sort((a, b) => rank(a.name) - rank(b.name)).map((r) => ({
      value: r.name,
      label: labelFor(r.name),
      disabled: r.coordinateBound && resizedBy.length > 0,
      ...(SELECTION_GLYPHS[r.name] ? { src: SELECTION_GLYPHS[r.name] } : {}),
    })),
  );
  const selectionHint = $derived(
    selectionItems.some((item) => item.disabled)
      ? `${selectionItems
          .filter((item) => item.disabled)
          .map((item) => item.label)
          .join(", ")} holds literal cells, and breakpoint ${resizedBy.join(", ")} changes rows or columns.`
      : undefined,
  );

  const hasFields = (schema: object | null): boolean =>
    schema !== null && Object.keys(schema).length > 0;

  /**
   * `04` §5.2's presets. `vignette` is specified there but is **not registered**
   * in `packages/tileset`, so it is absent — an engine gap, flagged and not
   * worked around.
   */
  const sourceItems = sources.all().map((r) => ({ value: r.name, label: labelFor(r.name) }));

  /**
   * `04` §7.2's Targets, from the package's own table. Closed by `05` §4.2, which
   * follows `03` **D7** closing the attribute set.
   */
  const targetItems = (Object.keys(TARGETS) as TargetName[]).map((t) => ({
    value: t,
    label: labelFor(t),
  }));

  const blendItems = $derived(
    draft.target === null
      ? []
      : acceptedBlends(draft.target).map((b) => ({ value: b, label: labelFor(b) })),
  );

  const selectionSchema = $derived(
    draft.selectionType === null ? null : selections.get(draft.selectionType).params,
  );
  const sourceSchema = $derived(
    draft.sourceType === null ? null : sources.get(draft.sourceType).params,
  );

  /**
   * §8.4 reads the registry's `stochastic` declaration, never a list of Source
   * names (`05` **X5**): `reseedOnLoad` means nothing on a Source that ignores
   * the hash.
   */
  const stochastic = $derived(
    draft.sourceType !== null && sources.get(draft.sourceType).stochastic === true,
  );

  /**
   * §7.4 — "the handles collapse to one when the Source is `constant`." `04`
   * §5.2: `constant` emits `0` always, so a fixed value is the mapping's `min`
   * equal to its `max`. Live, because the Source comes after the attribute
   * (`DECISIONS.md` D8).
   */
  const collapsed = $derived(draft.sourceType === "constant");

  /**
   * Choosing a type materializes every parameter at its schema default (§7.1,
   * `06` §5.1), so the fields show exactly what the file will contain.
   */
  function chooseSelection(name: string): void {
    draft.selectionType = name;
    draft.selectionParams = defaultParams(selections.get(name).params);
  }

  function chooseSource(name: string): void {
    draft.sourceType = name;
    draft.sourceParams = defaultParams(sources.get(name).params);
  }

  /** Each step's answer for its row; the Attribute's as `writesText` gives it. */
  const answers = $derived.by(() => {
    const parts = draftParts(draft);
    const tiles = session.file.config.tiles;
    return { ...summaryCells(parts, tiles), attribute: writesText(writesOf(parts, tiles)) };
  });

  /** What each step has settled. */
  function chosen(step: Step): string | null {
    if (step === "selection") return draft.selectionType;
    if (step === "source") return draft.sourceType;
    if (step === "attribute") return draft.target;
    return draft.blend;
  }

  /**
   * Which steps have no answer — Save's hint, rather than a button disabled for
   * reasons the author has to guess at. Every Target has a default Blend (`04`
   * §7.2), so answering the attribute answers the Blend too (§7.7).
   */
  const unanswered = $derived.by(() => {
    const open = STEPS.filter((step) => chosen(step) === null).map(labelFor);
    // Every step answered and still not whole: `06` §7.3's rules on the mapping
    // — an empty palette, or weights summing to zero.
    if (open.length === 0 && !isComplete(draft)) open.push("the mapping");
    return open;
  });

  /**
   * Where Next goes: the first unanswered step after this one, wrapping, so the
   * author is never left guessing what is still to do. `null` once every step
   * is answered, when Save is the next action.
   */
  const next = $derived.by(() => {
    const at = STEPS.indexOf(draft.step);
    const order = [...STEPS.slice(at + 1), ...STEPS.slice(0, at)];
    return order.find((step) => chosen(step) === null) ?? null;
  });

  /**
   * The one transition. `toOperation` re-checks rather than trusting the
   * disabled button, because this is the boundary the file is on the other side
   * of. `replaceOperation` keeps the index, so an edited Operation keeps its
   * place in the stack (`02` §6.3).
   */
  function commit(): void {
    const operation = toOperation(draft);
    if (operation === null) return;
    session.apply(editing ? replaceOperation(operation) : addOperation(operation));
    onClose();
  }
</script>

<div class="body" role="region" aria-label="Steps" id={base}>
  <ol class="steps">
    {#each STEPS as step, i (step)}
      {@const active = draft.step === step}
      <li class="step" class:active class:done={chosen(step) !== null}>
        <button
          type="button"
          class="step-head"
          aria-expanded={active}
          aria-controls="{base}-{step}"
          onclick={() => (draft.step = step)}
        >
          <span class="dot t-console" aria-hidden="true">{i + 1}</span>
          <span class="name t-title">{labelFor(step)}</span>
          <span class="answer t-console" class:unset={chosen(step) === null}>
            {chosen(step) === null ? "Not set" : answers[step]}
          </span>
        </button>
        {#if active}
          <div class="step-body" id="{base}-{step}">
            {@render content()}
          </div>
        {/if}
      </li>
    {/each}
  </ol>

  <div class="actions">
    <Button label="Discard" variant="tertiary" onclick={onClose} />
    {#if next !== null}
      <Button label="Next: {labelFor(next)}" onclick={() => (draft.step = next)} />
    {/if}
    <Hint text={unanswered.length > 0 ? `Still open: ${unanswered.join(", ")}.` : undefined}>
      {#snippet children()}
        <Button
          label={editing ? "Save" : "Add"}
          variant="primary"
          disabled={unanswered.length > 0}
          onclick={commit}
        />
      {/snippet}
    </Hint>
  </div>
</div>

{#snippet content()}
  <Hint text={draft.step === "selection" ? selectionHint : undefined}>
    {#snippet children()}
      <p class="question t-label">{QUESTIONS[draft.step]}</p>
    {/snippet}
  </Hint>

  {#if draft.step === "selection"}
    <!--
      **Invariant O2** — a Selection is a pure function of `(x, y)` and its own
      parameters; it never reads the accumulated `TileState`.
    -->
    <GlyphGrid
      items={selectionItems}
      value={draft.selectionType}
      onChange={chooseSelection}
      label="Selection"
    />
    {#if draft.selectionType !== null && selectionSchema && hasFields(selectionSchema)}
      {@const schema = selectionSchema}
      {#snippet fields()}
        <ParamFields
          {schema}
          values={draft.selectionParams}
          onChange={(name, value) => (draft.selectionParams[name] = value)}
        />
      {/snippet}
      {@render options(draft.selectionType, fields)}
    {/if}
  {:else if draft.step === "attribute"}
    <!--
      §7.4 folds the mapping into this step: "a numeric mapping is two handles
      on the Target's slider track, and the author never sees the word
      *mapping*". The Target decides which shape appears — `06` **C8**.
    -->
    <GlyphGrid
      items={targetItems}
      value={draft.target}
      onChange={(target) => retarget(draft, target)}
      label="Attribute"
    />
    {#if draft.target !== null}
      {@const target = draft.target}
      {#snippet fields()}
        {#if isTileTarget(target)}
          <PaletteBar
            palette={draft.palette}
            tiles={session.file.config.tiles}
            sourceType={draft.sourceType}
            onChange={(palette) => (draft.palette = palette)}
          />
        {:else}
          <NumericMappingControl
            target={target as AttributeName}
            mapping={draft.numeric}
            {collapsed}
            onChange={(mapping) => (draft.numeric = mapping)}
          />
        {/if}
      {/snippet}
      {@render options(target, fields)}
    {/if}
  {:else if draft.step === "source"}
    <!-- Every Source emits a value in [0, 1); the mapping gives it units. -->
    <GlyphGrid items={sourceItems} value={draft.sourceType} onChange={chooseSource} label="Source" />
    {#if draft.sourceType !== null && (hasFields(sourceSchema) || stochastic)}
      {#snippet fields()}
        {#if sourceSchema}
          <ParamFields
            schema={sourceSchema}
            values={draft.sourceParams}
            onChange={(name, value) => (draft.sourceParams[name] = value)}
          />
        {/if}
        {#if stochastic}
          <FieldRow
            label="Reseed on load"
            hint="Each page load draws this operation with a new seed. Saved with the operation."
            align="center"
          >
            {#snippet children()}
              <Toggle
                options={[
                  { value: false, label: "Off" },
                  { value: true, label: "On" },
                ]}
                value={draft.reseedOnLoad}
                onChange={(on) => (draft.reseedOnLoad = on)}
                label="Reseed on load"
              />
            {/snippet}
          </FieldRow>
        {/if}
      {/snippet}
      {@render options(draft.sourceType, fields)}
    {/if}
  {:else if draft.target === null}
    <!-- A Blend belongs to a Target: `04` §7.2 gives each its own accepted set. -->
    <p class="t-body">Choose an attribute first.</p>
  {:else}
    <GlyphGrid
      items={blendItems}
      value={draft.blend}
      onChange={(blend: BlendName) => (draft.blend = blend)}
      label="Blend"
    />
  {/if}

{/snippet}

<!-- The chosen option's fields: a caption naming the choice over a white panel. -->
{#snippet options(choice: string, fields: Snippet)}
  <section class="options" aria-label="{labelFor(choice)} settings">
    <p class="options-bar t-xs">{labelFor(choice)}</p>
    <div class="options-body">
      {@render fields()}
    </div>
  </section>
{/snippet}

<style>
  .body {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: 0 var(--space-5) var(--space-5);
    color: var(--color-ink);
    /* Labels in a fixed column, each control right after its label. */
    --field-label-w: var(--field-label-w-compact);
  }

  /* The steps: a numbered list, the numbers joined by a line. */
  .steps {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .step {
    position: relative;
  }

  /* The line from this step's number down to the next one's. */
  .step:not(:last-child)::before {
    content: "";
    position: absolute;
    top: calc(var(--space-6) + var(--step-dot));
    bottom: calc(-1 * var(--space-6));
    left: calc(var(--space-3) + var(--step-dot) / 2 - var(--rule-w) / 2);
    width: var(--rule-w);
    background: var(--color-track);
  }

  .step-head {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-5);
    width: 100%;
    min-height: calc(var(--step-dot) + 2 * var(--space-6));
    padding: 0 var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color var(--dur-fast) var(--ease);
  }

  .step:not(.active) .step-head:hover {
    background: var(--color-hover);
  }

  .active .step-head {
    background: var(--color-accent-wash);
    cursor: default;
  }

  /* Hollow while unanswered, ink once answered, the accent while open. */
  .dot {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: var(--step-dot);
    height: var(--step-dot);
    border: var(--rule-w) solid var(--color-edge);
    border-radius: var(--radius-round);
    background: var(--color-panel);
    color: var(--color-muted);
    text-box: none;
  }

  .done .dot {
    border-color: var(--color-ink);
    background: var(--color-ink);
    color: var(--color-paper);
  }

  .active .dot {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-paper);
  }

  .name {
    flex: none;
    width: 76px;
    line-height: var(--leading-title);
    text-box: none;
  }

  .active .name {
    color: var(--color-accent);
  }

  .answer {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    line-height: var(--leading-title);
    text-box: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .answer.unset {
    color: var(--color-muted);
  }

  /* The open step's content, indented to the names, so the line runs beside it. */
  .step-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-6) 0 var(--space-7) calc(var(--space-3) + var(--step-dot) + var(--space-5));
  }

  .question {
    margin: 0;
    color: var(--color-ink);
  }

  .options {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
  }

  .options-bar {
    margin: 0;
    padding-left: var(--space-1);
    color: var(--color-muted);
  }

  /* The chosen option's fields: a grey well in the white card, its fields white. */
  .options-body {
    --color-field: var(--color-panel);
    --color-field-hover: var(--grey-200);
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
    padding: var(--space-4);
    border-radius: var(--radius);
    background: var(--color-well);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-4);
    border-top: var(--rule-w) solid var(--color-track);
    /* Save's hint opens upward and right-aligned, so it stays inside the sidebar. */
    --hint-top: auto;
    --hint-bottom: calc(100% + var(--space-2));
    --hint-left: auto;
    --hint-right: 0;
  }
</style>
