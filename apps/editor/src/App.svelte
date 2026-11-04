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
  import { nextOperationId } from "./ids.js";
  import { atRisk, needsConfirmation, orphans } from "./orphans.js";
  import OperationDraft from "./lib/OperationDraft.svelte";
  import OperationStack from "./lib/OperationStack.svelte";
  import PaintLayer from "./lib/PaintLayer.svelte";
  import PreviewFrame from "./lib/PreviewFrame.svelte";
  import BreakpointsSection from "./lib/sections/BreakpointsSection.svelte";
  import DerivedSection from "./lib/sections/DerivedSection.svelte";
  import GridSection from "./lib/sections/GridSection.svelte";
  import SidebarFooter from "./lib/sections/SidebarFooter.svelte";
  import Button from "./lib/ui/Button.svelte";
  import Section from "./lib/Section.svelte";
  import SelectionOverlay from "./lib/SelectionOverlay.svelte";
  import TileLibrary from "./lib/TileLibrary.svelte";
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
      <GridSection {risked} {destructive} />
      <BreakpointsSection {risked} />
      <DerivedSection />

      <Section title="Tiles">
        <TileLibrary />
      </Section>

      <Section title="Operations">
        <!--
          The draft opens **inside this section**, and `OperationStack` places
          it: under the row it edits, or under the button that starts a new
          one. It is not a section of its own: it is a workflow that is either
          running or not, and a collapsible one would hide a step the author is
          mid-way through. Collapsing Operations does hide it, which is right —
          it belongs to this card — and nothing is lost, since `drafting` holds
          the draft until it is committed or discarded.

          `editingId` comes from `drafting.editing`, not from looking the id up
          in the stack: that lookup is exactly the inference `drafting.svelte.ts`
          records the mode to avoid.
        -->
        <OperationStack
          onCreate={() => drafting.start(nextOperationId(config.operations.map((o) => o.id)))}
          onEdit={(op) => drafting.edit(op)}
          editingId={drafting.editing ? (drafting.draft?.id ?? null) : null}
        >
          {#snippet draftPanel()}
            {#if drafting.draft !== null}
              {@const draft = drafting.draft}
              <OperationDraft
                {draft}
                editing={drafting.editing}
                nested={drafting.editing}
                onClose={() => drafting.discard()}
              />
            {/if}
          {/snippet}
        </OperationStack>
      </Section>
    </div>

    <SidebarFooter bind:loadSalt onNew={newTileset} />
  </aside>

  <section class="preview" aria-label="Preview">
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
            <h2 class="t-label" id="confirm-title">{p.label}</h2>
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
              <Button label="Change it" onclick={confirmPending} />
              <Button label="Cancel" onclick={() => (pending = null)} />
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
            <h2 class="t-label">Orphaned by a resize</h2>
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

    <!--
      The host owns the render box's width through ordinary CSS. There is no
      width prop: `07` §5.3 makes every quantity a fixed fraction of Wpx, so
      the component expresses placement in relative units and Wpx is whatever
      width the CSS gives it (`08` §4).

      `PreviewFrame` is that CSS and nothing more — **E11**: it sets `Wpx` and
      writes no field.
    -->
    <PreviewFrame
      ratio={(Wpx) => {
        const f = shapedAt(Wpx);
        return naturalRatio(f.layout, f.config.rows);
      }}
      {rules}
      painting={painting !== null}
    >
      {#snippet children(Wpx: number)}
        {@const here = shapedAt(Wpx)}
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
    <p class="note">
      A new document is legal and draws nothing — every cell is
      <code>tileId: null</code> (<code>02</code>&nbsp;§8.1, <strong>G4</strong>). The box
      still reserves the right space, because its aspect ratio is a constant of
      <code>Layout</code> and <code>rows</code> with <code>Wpx</code> cancelled out
      (<code>07</code>&nbsp;§5.3, <strong>S8</strong>).
    </p>
    <p class="note">
      Dragging either edge changes <code>Wpx</code>, hence <code>s</code>, and nothing
      else — <code>07</code>&nbsp;§9.1's second row. <code>columns</code> does not move,
      no confirmation appears, and <strong>R12</strong> forbids regeneration, so every
      cell keeps its <code>TileState</code> and moves to a new rect. The design width
      beside it is the destructive one.
    </p>

    {#if failures.length > 0}
      <ul class="failures">
        {#each failures as failure (failure)}
          <li>{failure}</li>
        {/each}
      </ul>
    {/if}

    <details class="debug">
      <summary>The file</summary>
      <!--
        **E3** — the editor's state *is* this. There is no second document model,
        so what is shown here is what previews above and what Step 11 will export.
      -->
      <pre>{JSON.stringify(file, null, 2)}</pre>
    </details>
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

  /* The Figma *Sidebar*: a 1px ink frame, the scrolling sections over the fixed footer. */
  aside {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    border: var(--rule);
    background: var(--color-surface);
  }

  .scrollable {
    overflow-y: auto;
  }

  /*
    The preview column scrolls on its own, with the frame at the top of it. The
    notes, the failure list and the file dump sit below and scroll under it, so
    reading any of them is the only thing that can move the picture, and the
    sidebar never can. Its own UI is Stage 2's.
  */
  .preview {
    overflow-y: auto;
    padding: var(--space-6);
  }

  .notices {
    position: sticky;
    top: 0;
    z-index: 2;
    display: grid;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .notice {
    display: grid;
    gap: var(--space-4);
    padding: calc(var(--space-3) + var(--space-2));
    border: var(--rule);
    background: var(--color-paper);
    color: var(--color-warn);
  }

  .notice h2 {
    margin: 0;
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

  .note {
    max-width: 62ch;
    margin: var(--space-6) 0 0;
    font-size: var(--text-body-size);
  }

  .failures {
    margin-top: var(--space-6);
    color: var(--color-danger);
  }

  .debug {
    margin-top: var(--space-6);
  }

  .debug pre {
    overflow-x: auto;
    padding: var(--space-6);
    border: var(--rule);
    font-family: var(--font-mono);
    font-size: var(--text-console-size);
  }
</style>
