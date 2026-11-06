<!--
  The open operation's body: a vertical stepper inside its card
  (`OperationCard`). It edits a draft, never the file (`09-editor.md` §7).

  Four steps, in the order the author walks them: **Selection → Pattern →
  Attribute → Blend**, with the mapping folded into the attribute step per §7.4.
  "Pattern" is the Source step's label; its key stays `source` (`STEP_LABELS`).
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
  | Pattern   | the registry, with hand-drawn artwork          |
  | Attribute | `TARGETS` (label-only until designed)          |
  | Blend     | `acceptedBlends()` — §7.7, ADR-001             |

  A Selection or Source registered later appears with no change here (**E9**),
  as a label-only cell if it has no artwork. The Pattern comes before the
  Attribute because it decides what the mapping means: §7.4's collapse under
  `constant`, and a palette read as chances under `random` but as measured
  coverage under an ordered Pattern (Pol, T0). The steps stay navigable in any
  order once opened (`DECISIONS.md` D8).

  The Blend grid shows every accepted Blend with the Target's default chosen,
  rather than §7.7's "reveal the accepted set only on request" (Pol, Block E).
  A vetoed Blend is absent, not disabled (`04` §7.2).

  **E5** — the draft reaches the file at Save and nowhere else, as **one**
  `TilesetFile -> TilesetFile` transition (`DECISIONS.md` D7), so an edit is
  one undo entry (**E6**).
-->
<script lang="ts">
  import { createRawSnippet, type Snippet } from "svelte";
  import {
    acceptedBlends,
    activeRules,
    ruleOverride,
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
  import FieldPreview from "../../controls/FieldPreview.svelte";
  import { coverageOf, fieldCells } from "../../controls/palette.js";
  import { sourceParamHints } from "../../controls/param-hints.js";
  import NumericMappingControl from "../../controls/NumericMapping.svelte";
  import PaletteList from "../../controls/PaletteList.svelte";
  import ParamFields from "../../controls/ParamFields.svelte";
  import { addOperation, replaceOperation } from "../../document.js";
  import {
    defaultParams,
    isComplete,
    retarget,
    shadowConfig,
    STEPS,
    toOperation,
    type Draft,
    type Step,
  } from "../../draft.svelte.js";
  import { session } from "../../session.svelte.js";
  import { preview } from "../preview/view.svelte.js";
  import Button from "../ui/Button.svelte";
  import Explainer from "../ui/Explainer.svelte";
  import FieldRow from "../ui/FieldRow.svelte";
  import GlyphGrid from "../ui/GlyphGrid.svelte";
  import Hint from "../ui/Hint.svelte";
  import Toggle from "../ui/Toggle.svelte";
  import {
    draftParts,
    labelFor,
    STEP_LABELS,
    summaryCells,
    writesOf,
    writesText,
  } from "./labels.js";
  import { NOISE_EXPLAINER } from "./noise-explainer.js";
  import { PATTERN_ORDER, patternSvg } from "./pattern-art.js";

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

  /**
   * The Pattern's question names tiles when the Target is Tile, and also while
   * no Target is chosen: the walk reaches Pattern before Attribute, and Tile is
   * the common case.
   */
  const questions = $derived<Record<Step, string>>({
    selection: "Which cells does this operation affect?",
    source:
      draft.target === null || isTileTarget(draft.target)
        ? "How should the tiles spread?"
        : "How should the values spread?",
    attribute: "What does this operation write?",
    blend: "How does this combine with what is already there?",
  });

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
   * `04` §5.2's presets, drawn ones first in `PATTERN_ORDER`. `vignette` is
   * specified there but is **not registered** in `packages/tileset`, so it is
   * absent — an engine gap, flagged and not worked around.
   *
   * The art is a static SVG string (`pattern-art.ts`), wrapped as a snippet so
   * `GlyphGrid` can take it per item. A Source with no art keeps a label-only
   * cell (**E9**).
   */
  const patternRank = (name: string): number => {
    const i = PATTERN_ORDER.indexOf(name);
    return i < 0 ? PATTERN_ORDER.length : i;
  };
  const sourceItems = [...sources.all()]
    .sort((a, b) => patternRank(a.name) - patternRank(b.name))
    .map((r) => {
      const svg = patternSvg(r.name);
      return {
        value: r.name,
        label: labelFor(r.name),
        ...(svg === null ? {} : { artwork: createRawSnippet(() => ({ render: () => svg })) }),
      };
    });

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
   * equal to its `max`. Live, because the steps can be revisited in any order
   * (`DECISIONS.md` D8).
   */
  const collapsed = $derived(draft.sourceType === "constant");

  /**
   * The pattern's `t` at every selected cell, with the cell, on the grid the
   * preview is showing — the active breakpoint's rows and columns at
   * `preview.width` — with the file's seed and the preview's load salt, the
   * same three inputs `<Tileset>` draws with, against the same shadow config as
   * the Selection overlay. So it is what Save will paint here.
   *
   * Two readers, so it is not tied to either: the Pattern well's **field
   * preview** (item 12), shown on the Pattern step **before** an Attribute is
   * chosen, and the palette's measured "≈ painted" share (T3). It was `null`
   * without a Tile Target while only the palette read it. Computed only where
   * one of them is on screen, and `null` before a Selection and a Pattern.
   *
   * It does not read the palette (`toShadowOperation` carries none), so a
   * weight drag re-counts this list in `coverageOf` and never re-evaluates the
   * pattern.
   */
  const field = $derived.by(() => {
    if (draft.sourceType === null) return null;
    const tiles = draft.target !== null && isTileTarget(draft.target);
    if (draft.step !== "source" && !(draft.step === "attribute" && tiles)) return null;
    const file = session.file;
    const shadow = shadowConfig(file.config, draft);
    if (shadow === null) return null;
    const shape = ruleOverride(activeRules(file.responsive ?? [], preview.width));
    const grid = {
      ...shadow.config,
      rows: shape.rows ?? shadow.config.rows,
      columns: shape.columns ?? shadow.config.columns,
    };
    return {
      rows: grid.rows,
      columns: grid.columns,
      cells: fieldCells(grid, shadow.operationId, file.config.defaultSeed, preview.loadSalt),
    };
  });

  /** Each entry's measured share, or `null` for "—" (nothing measured, or no cell selected). */
  const measured = $derived.by(() => {
    if (field === null || field.cells.length === 0) return null;
    if (draft.target === null || !isTileTarget(draft.target)) return null;
    return coverageOf(
      field.cells.map((c) => c.t),
      draft.palette,
    );
  });

  /**
   * The field preview is drawn for every Pattern but Constant, whose field is
   * one flat value and would be a grey rectangle (Pol, N0.3).
   */
  const previewed = $derived(draft.sourceType !== null && draft.sourceType !== "constant");

  /** The "How noise works" trigger while its popover is open, else `undefined`. */
  let explaining = $state<HTMLButtonElement | undefined>(undefined);
  let explainTrigger = $state<HTMLButtonElement | undefined>(undefined);

  // The popover belongs to Noise's Pattern step: leaving either unmounts its
  // trigger, so it closes rather than hang from a detached button.
  $effect(() => {
    if (draft.step !== "source" || draft.sourceType !== "valueNoise") explaining = undefined;
  });

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
    const open = STEPS.filter((step) => chosen(step) === null).map((step) => STEP_LABELS[step]);
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
          <span class="name t-title">{STEP_LABELS[step]}</span>
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
      <Button label="Next: {STEP_LABELS[next]}" onclick={() => (draft.step = next)} />
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
      <p class="question t-label">{questions[draft.step]}</p>
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
  {:else if draft.step === "source"}
    <!-- Every Source emits a value in [0, 1); the mapping gives it units. -->
    <GlyphGrid items={sourceItems} value={draft.sourceType} onChange={chooseSource} label="Pattern" />
    {#if draft.sourceType !== null && (hasFields(sourceSchema) || stochastic || previewed)}
      {#snippet fields()}
        {#if previewed && field !== null}
          <FieldPreview columns={field.columns} rows={field.rows} cells={field.cells} />
        {/if}
        {#if sourceSchema}
          <ParamFields
            schema={sourceSchema}
            values={draft.sourceParams}
            hints={sourceParamHints(draft.sourceType)}
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
      {#snippet action()}
        {#if draft.sourceType === "valueNoise"}
          <Button
            label="How noise works"
            icon="info"
            variant="tertiary"
            expanded={explaining !== undefined}
            bind:element={explainTrigger}
            onclick={() => (explaining = explaining === undefined ? explainTrigger : undefined)}
          />
        {/if}
      {/snippet}
      {@render options(draft.sourceType, fields, action)}
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
          <PaletteList
            palette={draft.palette}
            tiles={session.file.config.tiles}
            sourceType={draft.sourceType}
            coverage={measured}
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

{#if explaining !== undefined}
  <Explainer
    anchor={explaining}
    content={NOISE_EXPLAINER}
    onClose={(refocus) => {
      const trigger = explaining;
      explaining = undefined;
      if (refocus) trigger?.focus();
    }}
  />
{/if}

<!--
  The chosen option's fields: a caption naming the choice over a grey well. An
  optional action sits at the caption's right ("How noise works").
-->
{#snippet options(choice: string, fields: Snippet, action?: Snippet)}
  <section class="options" aria-label="{labelFor(choice)} settings">
    <div class="options-bar">
      <p class="t-xs">{labelFor(choice)}</p>
      {@render action?.()}
    </div>
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding-left: var(--space-1);
  }

  .options-bar p {
    margin: 0;
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
