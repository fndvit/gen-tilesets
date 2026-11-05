<!--
  The editor shell — `09-editor.md` §5.

  **Invariant S2** — the preview is `<Tileset>` mounted on the file the editor
  holds, drawing the complete operation stack. Overlays are drawn *over* that
  output and never in place of it. There is no preview mode, no simplified path,
  and no second component.

  The guarantee that buys: for one `(file, seed, loadSalt)` triple the editor and
  a production page produce the same picture, because they run the same code on
  the same input. Not by convention, and with no second implementation to drift.

  **`09` §3.1 — this document specifies affordances, not appearance.** Panel
  layout, colour, and shortcuts are specified nowhere in the package, on purpose.
  What is load-bearing below is which control writes which field, and that is
  what the comments record.
-->
<script lang="ts">
  import { selections } from "@vit-foundation/gen-tilesets";
  import Tileset from "@vit-foundation/gen-tilesets/Tileset.svelte";
  import { naturalRatio, type AssetRef } from "@vit-foundation/gen-tilesets/render";
  import { activeRules, reshape, ruleOverride, type TilesetFile } from "@vit-foundation/gen-tilesets";
  import { editorProvider, replaceAll } from "./assets.js";
  import type { Transition } from "./document.js";
  import { toShadowOperation } from "./draft.svelte.js";
  import { drafting } from "./drafting.svelte.js";
  import { atRisk, needsConfirmation, orphans } from "./orphans.js";
  import PaintLayer from "./lib/PaintLayer.svelte";
  import PreviewFrame from "./lib/preview/PreviewFrame.svelte";
  import PreviewGrid from "./lib/preview/PreviewGrid.svelte";
  import PreviewTopBar from "./lib/preview/PreviewTopBar.svelte";
  import { preview } from "./lib/preview/view.svelte.js";
  import BreakpointsSection from "./lib/sections/BreakpointsSection.svelte";
  import DerivedSection from "./lib/sections/DerivedSection.svelte";
  import GridSection from "./lib/sections/GridSection.svelte";
  import SidebarFooter from "./lib/sections/SidebarFooter.svelte";
  import OperationsSection from "./lib/sections/OperationsSection.svelte";
  import TilesSection from "./lib/sections/TilesSection.svelte";
  import Button from "./lib/ui/Button.svelte";
  import ScrollArea from "./lib/ui/ScrollArea.svelte";
  import SelectionOverlay from "./lib/SelectionOverlay.svelte";
  import type { Cell } from "./paint.js";
  import { session } from "./session.svelte.js";

  const file = $derived(session.file);
  const config = $derived(file.config);

  /** The file's breakpoints. Empty for a file without any, which is most. */
  const rules = $derived(file.responsive ?? []);

  /**
   * The file **as `<Tileset>` draws it at a preview width** — its rules' cascade
   * applied by the package's own functions, never re-derived here (**R1**).
   *
   * What reads it: the frame's height and the two overlays. They must agree with
   * the picture to the cell, and at a width where a rule changes `columns` the
   * picture is not the base file's grid. The editing controls keep reading the
   * base, because the base is what they edit.
   */
  function shapedAt(Wpx: number): TilesetFile {
    return reshape(file, ruleOverride(activeRules(rules, Wpx)));
  }

  /**
   * `09` §5's prop table.
   *
   * **`seed` is omitted.** The seed field writes `config.defaultSeed`, and the
   * component falls back to it (`07` §9.2), so the preview always shows what a
   * visitor with no host seed would see. "A separate preview seed would let the
   * author approve a picture the file does not produce, which is `07` §3's
   * stated worst outcome reached by a different route."
   *
   * `loadSalt` is §8.5's load-preview value, held below. `provider` is the
   * editor's own, bridging `meta.src` to the session `Blob` a drop created.
   */
  let failures = $state<string[]>([]);

  /**
   * **`onAssetError` is wired, always** (§5's table, **S6**).
   *
   * §12.3: a failure surfaces as a prominent editor condition rather than a
   * console line. "`07` §4.3 accepts that a production host may never wire the
   * channel and get a silently incomplete background; the editor has no excuse,
   * because the author is present and the tile is missing from the picture they
   * are approving."
   *
   * The empty cell is `07` **R3**'s and is not filled. The editor draws no
   * substitute in the preview either — a placeholder glyph would be a drawable
   * the renderer did not choose, in a cell R3 says must draw nothing. The
   * failure is reported *beside* the preview, not inside it.
   */
  function onAssetError(ref: AssetRef, cause: unknown): void {
    const failure = `${ref.tileId}/${ref.assetId}: ${String(cause)}`;
    // The list below is keyed by the string, and a repeat would be a duplicate
    // `{#each}` key, which Svelte throws on. The renderer reports a failure once
    // per resolution (`provider.ts` `DrawableCache`), but it resolves again when
    // an asset's `meta` changes, and the same picture can then fail the same way.
    if (failures.includes(failure)) return;
    failures = [...failures, failure];
  }

  /**
   * Starts a new tileset, **confirmed and not undoable** (`session.reset`). It
   * discards everything, so it asks first, and it then reclaims every picture
   * the session held.
   *
   * Reset first, then empty the store: the outgoing document is then already
   * gone from the preview, so no `<img>` draws an object URL `replaceAll` has
   * just revoked, and nothing reports those as failures.
   */
  async function newTileset(): Promise<void> {
    if (!confirm("Start a new tileset? All progress in the current one is lost, and this cannot be undone.")) {
      return;
    }
    session.reset();
    failures = [];
    await replaceAll([]);
  }

  /**
   * The render box element — `08` §7, bound out of `<Tileset>`.
   *
   * The **only** thing the editor needs from the component beyond `cellBox` and
   * `cellAt`, and it needs it for one reason: `07` §8.2 assigns converting a
   * pointer event into render space to the caller, and that requires the box's
   * position on screen. **R5** is untouched — it forbids the *renderer*
   * measuring, and an editor calling `getBoundingClientRect()` on an exposed
   * element is doing something else.
   */
  // `HTMLElement` since ADR-006: under the default `substrate: "canvas"` the render
  // box is the canvas's wrapper `<div>`. `metricsOf` takes the wider type, because
  // all it does is measure.
  let renderBox = $state<HTMLElement | null>(null);

  /**
   * §8.5's load preview. **Writes no field** — §8.1's fourth row is the one that
   * is not an edit, so it lives here and reaches `<Tileset>` through its `options`.
   *
   * **R12** — one value per session, held for its duration. `08` **S7** makes
   * that structural rather than disciplinary: the component draws no random
   * number at all, so a regeneration has nothing to redraw. Only the footer's
   * Fresh load button moves it, which is what makes it a *preview of another load* rather than
   * noise under every edit.
   */
  let loadSalt = $state(0);

  /**
   * **E12's confirmation** — §9.3. A destructive edit held until the author
   * agrees to it, with the Operations it will affect named.
   *
   * The pending value is a `Transition`, not a field and not a number: **E5**
   * makes a transition total and defined on every legal file, so holding one and
   * applying it later is exactly as safe as applying it now. Holding a *value*
   * instead would mean re-deriving which field it belonged to at confirm time.
   *
   * `document.ts` states this from the other side: a transition that opened a
   * dialogue would not be the total function E5 requires, so "confirmation
   * belongs to the caller".
   */
  let pending = $state<{ label: string; apply: Transition } | null>(null);

  /**
   * The gate the three destructive controls route through — §9.3.
   *
   * **Confirmation is required only where something is at risk.** Procedural
   * Selections survive a resize unharmed, so a config holding only those applies
   * directly: "a dialogue that appears every time teaches the author to dismiss
   * it before reading, which is worse than no dialogue."
   */
  function destructive(label: string, transition: Transition): void {
    if (needsConfirmation(config)) pending = { label, apply: transition };
    else session.apply(transition);
  }

  function confirmPending(): void {
    if (pending === null) return;
    session.apply(pending.apply);
    pending = null;
  }

  /** The Operations E12 requires the confirmation to name. */
  const risked = $derived(atRisk(config));

  /**
   * §9.4's step 2 — each orphaned Operation carried as a §12.2 advisory until
   * the author touches it. **E16**: never blocks, never modifies the file, never
   * an error.
   */
  const orphaned = $derived(orphans(config, config.defaultSeed, loadSalt));

  /**
   * The draft's `cellList` parameter, if the Selection it is building has one.
   *
   * `05` §5.1's list type is the one parameter `09` cannot generate a control
   * for mechanically (§7.3, the single exception to **E9**), so this is the only
   * place the editor looks a parameter type up by name.
   */
  const painting = $derived.by(() => {
    const draft = drafting.draft;
    if (draft === null || draft.selectionType === null) return null;
    const schema = selections.get(draft.selectionType).params;
    const name = Object.keys(schema).find((key) => schema[key]!.type === "cellList");
    if (name === undefined) return null;
    return { name, cells: (draft.selectionParams[name] ?? []) as Cell[] };
  });

  /**
   * The **shadow config** the overlay resolves against — `DECISIONS.md` D7's
   * recorded consequence.
   *
   * `selection()` resolves an Operation **by id** and the draft is not in the
   * file, so the overlay is drawn against `{ ...config, operations: [...ops,
   * draft] }`. A pure local value; it touches nothing, and **E3** is untouched
   * because the document is still exactly `session.file`.
   *
   * `null` until the draft has a Selection type — before that there is no
   * predicate to resolve, which is different from a predicate that matches
   * nothing, and §6.1 shows the overlay for the Operation *being edited*.
   *
   * ## It replaces where the id is already there, and appends where it is not
   *
   * An **edit**-draft's id is in `config.operations` already, so appending would
   * put two Operations with one id in the same stack. `selection()` resolves *by
   * id* and would find the first — the unedited one — so the overlay would draw
   * the Selection the author is in the middle of changing away from, and the
   * brush would paint against it. Replacing covers both cases in one expression,
   * because a create-draft's id matches nothing and the append is the fallback.
   */
  const shadow = $derived.by(() => {
    const draft = drafting.draft;
    if (draft === null) return null;
    const operation = toShadowOperation(draft);
    if (operation === null) return null;
    const present = config.operations.some((op) => op.id === operation.id);
    const operations = present
      ? config.operations.map((op) => (op.id === operation.id ? operation : op))
      : [...config.operations, operation];
    return { operationId: operation.id, config: { ...config, operations } };
  });

  /**
   * §4.4's repair, applied to the draft rather than to the file.
   *
   * An edit-draft names an Operation by id, and that Operation can leave the
   * stack while its panel is open — removed from the stack row, or undone away
   * (§4.4 restores a whole `TilesetFile`, and the draft is deliberately not
   * rewound with it — `session.svelte.ts`). Committing then runs
   * `replaceOperation` against an id that matches nothing: a `.map` over the
   * stack that changes it in no way, which `session.apply` correctly declines to
   * push, so the button would appear to work and do nothing.
   *
   * Discarding is right rather than merely safe. The alternative — falling back
   * to `addOperation` — would resurrect an Operation the author deleted, and
   * §4.4 already refused to guess on the author's behalf once, for the same
   * reason.
   */
  $effect(() => {
    const draft = drafting.draft;
    if (draft === null || !drafting.editing) return;
    if (!config.operations.some((op) => op.id === draft.id)) drafting.discard();
  });

  /**
   * The brush's write. Straight into the draft's parameters, which are transient
   * UI state — **nothing here touches the file**, and cannot: the whole draft
   * reaches it as one transition when it is complete (`DECISIONS.md` D7).
   */
  function paintCells(name: string, cells: Cell[]): void {
    const draft = drafting.draft;
    if (draft !== null) draft.selectionParams[name] = cells;
  }
</script>

<main>
  <aside>
    <!--
      The sidebar is two parts. `.scrollable` holds the sections and scrolls;
      the preview beside it does not move, so every control is reachable
      without the picture it changes leaving the screen, which is the whole
      point of **S2**'s single live preview. `.fixed` (the footer) never
      scrolls.
    -->
    <div class="scrollable">
      <ScrollArea>
        <div class="sections">
          <GridSection {risked} {destructive} />
          <BreakpointsSection {risked} />
          <DerivedSection />

          <TilesSection />

          <OperationsSection />
        </div>
      </ScrollArea>
    </div>

    <SidebarFooter bind:loadSalt onNew={newTileset} />
  </aside>

  <section class="preview" aria-label="Preview">
    <PreviewTopBar {rules} />
    <!-- The backdrop is the whole picture area's, between the bars (Pol, Stage 2). -->
    <div class="canvas" style="background: {preview.background};">
    <ScrollArea fill>
      <div class="preview-body">
        {#if pending !== null || orphaned.length > 0}
          <!-- Pinned over the top of the preview until Stage 2's warnings design. -->
          <div class="notices">
            {#if pending !== null}
              {@const p = pending}
              <!--
                **E12** — explicit confirmation, naming the Operations that will be
                affected. It is a *held transition*: nothing has touched the file,
                so cancelling costs nothing and confirming is one
                `TilesetFile -> TilesetFile`. `nothing is migrated` is §9.4: undo is
                the repair.
              -->
              <!-- A div, not a section: a section carries an implicit `region` role
                   and cannot take an interactive one. -->
              <div class="notice" role="alertdialog" aria-labelledby="confirm-title">
                <h2 class="t-section" id="confirm-title">{p.label}</h2>
                <p class="t-body">
                  This changes the column count, and
                  {risked.length === 1 ? "this operation is" : "these operations are"} tied to specific
                  cells. Nothing is moved for you; undo puts it back.
                </p>
                <ul class="t-console">
                  {#each risked as op (op.id)}
                    <li>{op.id} · {op.selection.type}</li>
                  {/each}
                </ul>
                <div class="actions">
                  <Button label="Cancel" onclick={() => (pending = null)} />
                  <Button label="Change it" variant="primary" onclick={confirmPending} />
                </div>
              </div>
            {/if}

            {#if orphaned.length > 0}
              <!--
                §9.4's step 2, carried as a §12.2 advisory until the author touches
                the Operation. **E16** — never blocks, never modifies the file,
                never an error.

                `04` §4.4's distinction survives in the *wording* and not in the
                repair: a `rect` can plausibly be re-dragged, a hand-painted
                `cellList` cannot.
              -->
              <div class="notice">
                <h2 class="t-section">Orphaned by a resize</h2>
                <ul class="t-console">
                  {#each orphaned as orphan (orphan.operationId)}
                    <li>
                      {orphan.operationId} · {orphan.selectionType}:
                      {#if orphan.authored !== undefined}
                        {orphan.authored - orphan.reachable} of {orphan.authored}
                        painted {orphan.authored - orphan.reachable === 1 ? "cell is" : "cells are"}
                        outside the grid and cannot be reached or unpainted.
                      {:else if orphan.empty}
                        lies wholly outside the grid and selects nothing. Re-drag it, or undo.
                      {:else}
                        reaches fewer cells than it did.
                      {/if}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {/if}

        {#if failures.length > 0}
          <!-- Above the picture until Stage 2's warnings design. -->
          <ul class="failures">
            {#each failures as failure (failure)}
              <li>{failure}</li>
            {/each}
          </ul>
        {/if}

        <!--
          The host owns the render box's width through ordinary CSS. There is no
          width prop: `07` §5.3 makes every quantity a fixed fraction of Wpx, so
          the component expresses placement in relative units and Wpx is whatever
          width the CSS gives it (`08` §4).

          `PreviewFrame` is that CSS and nothing more — **E11**: it sets `Wpx` and
          writes no field.
        -->
        <!-- Centred in the visible height, so a change of rows recentres it; taller, it scrolls. -->
        <div class="stage">
        <PreviewFrame
          ratio={(Wpx) => {
            const f = shapedAt(Wpx);
            return naturalRatio(f.layout, f.config.rows);
          }}
        >
          {#snippet children(Wpx: number)}
            {@const here = shapedAt(Wpx)}
            {#if preview.showGrid}
              <PreviewGrid
                g={{ layout: here.layout, rows: here.config.rows, columns: here.config.columns, Wpx }}
                zoom={preview.zoom}
              />
            {/if}
            <!--
              **S2** — one component, drawing the complete stack. The brush layer
              is drawn *over* this output and never in place of it, and the picture
              underneath is the same one a production page gets.
            -->
            <Tileset
              {file}
              options={{ loadSalt, provider: editorProvider, onAssetError }}
              bind:box={renderBox}
            />

            {#if shadow !== null}
              {@const s = shadow}
              <!--
                **E7** — the one overlay, over the Operation being edited. **E8** —
                its cell set comes from the package (`09` §6.2) and the editor
                implements no Selection's test.
              -->
              <SelectionOverlay
                g={{ layout: here.layout, rows: here.config.rows, columns: here.config.columns, Wpx }}
                config={{ ...s.config, rows: here.config.rows, columns: here.config.columns }}
                operationId={s.operationId}
                seed={config.defaultSeed}
                {loadSalt}
              />
            {/if}

            {#if painting !== null && renderBox !== null}
              {@const brush = painting}
              <!--
                §7.3 — the `cellList` brush, and the only control `09` cannot
                generate from a `ParamSchema` (**E9**'s one exception, named by
                `05` §5.1 rather than arrived at).
              -->
              <PaintLayer
                g={{ layout: here.layout, rows: here.config.rows, columns: here.config.columns, Wpx }}
                box={renderBox}
                cells={brush.cells}
                param={brush.name}
                onChange={(cells) => paintCells(brush.name, cells)}
              />
            {/if}
          {/snippet}
        </PreviewFrame>
        </div>
      </div>
    </ScrollArea>
    </div>
  </section>

</main>

<style>
  /*
    A full-height shell rather than a document that scrolls. The picture is what
    every control in the sidebar is judged against, so it must not be able to
    leave the screen: the page itself does not scroll, and the two columns each
    scroll their own contents. `09` §2 puts layout outside the spec — this is a
    usability choice and nothing in the package depends on it.

    `minmax(0, 1fr)`: a grid item defaults to `min-width: auto`, its max-content
    size. The preview frame carries an explicit pixel width, so without this the
    track grows to contain a 1440px frame and squeezes the sidebar. With it, the
    frame's own clamp against the available width decides its size.
  */
  main {
    display: grid;
    grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
    height: 100dvh;
  }

  main > * {
    min-width: 0;
    min-height: 0;
  }

  /*
    Reflow (WCAG 1.4.10). Below 40rem, which is a 1280px window at 200% zoom
    or a 320px-wide one, two columns no longer fit. The columns then stack: the
    sidebar fills the screen and scrolls on its own as before, the preview
    follows it, and only here does the page scroll.
  */
  @media (max-width: 40rem) {
    main {
      grid-template-columns: minmax(0, 1fr);
      height: auto;
    }

    aside,
    .preview {
      height: 100dvh;
    }
  }

  /* The inspector: white, a divider on its right, the scrolling sections over the fixed footer. */
  aside {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-columns: minmax(0, 1fr);
    border-right: var(--divider);
    background: var(--color-surface);
  }

  /* `ScrollArea` scrolls; its handle sits on the content, so the sidebar never narrows. */
  .scrollable {
    min-height: 0;
  }

  /* Sections stack, each closed by its own divider. */
  .sections {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    padding-bottom: var(--space-6);
  }

  /*
    The preview column: the top bar (with the breakpoints, Pol, Stage 2), then
    the picture area. The bar stays put and only the picture area scrolls, in a `ScrollArea` like the
    sidebar, so a scrollbar never takes width from the frame and the sidebar
    never moves.
  */
  .preview {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-columns: minmax(0, 1fr);
  }

  .canvas {
    min-height: 0;
  }

  /*
    A flex column at least as tall as the picture area (`ScrollArea fill`).
    It clips the grid, which reaches far past the frame, at its own edges:
    `clip` rather than `hidden`, so it is not a second scroll container and
    the clipped part adds no scroll length.
  */
  .preview-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--space-6);
    overflow: clip;
  }

  /* Takes the height left under the notices and centres the frame in it. Its
     minimum is the frame's own height, so a tall tileset overflows downwards
     and scrolls, never upwards out of reach. */
  .stage {
    flex: 1 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .notices {
    position: sticky;
    top: 0;
    z-index: 2;
    display: grid;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  /* A floating panel over the picture, as a popup is, but in place. */
  .notice {
    display: grid;
    gap: var(--space-4);
    max-width: 560px;
    padding: var(--space-6) var(--space-8);
    border-radius: var(--radius);
    background: var(--color-paper);
    box-shadow: var(--shadow-float);
    color: var(--color-warn);
  }

  .notice h2 {
    margin: 0;
  }

  .notice p {
    margin: 0;
    line-height: var(--leading-hint);
    text-box: none;
  }

  .notice ul {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
    line-height: var(--leading-hint);
    text-box: none;
  }

  .notice .actions {
    display: flex;
    gap: var(--chip-gap);
  }

  .failures {
    margin: 0 0 var(--space-6);
    color: var(--color-danger);
    font-size: var(--text-body-size);
  }
</style>
