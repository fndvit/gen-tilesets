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
  import { documentNotices } from "./advisories.js";
  import { entry } from "./entry.svelte.js";
  import type { Notice } from "./notices.js";
  import { editorProvider, replaceAll, stored } from "./assets.js";
  import type { Transition } from "./document.js";
  import { shadowConfig } from "./draft.svelte.js";
  import { drafting } from "./drafting.svelte.js";
  import { opening } from "./opening.svelte.js";
  import { atRisk, needsConfirmation, orphans } from "./orphans.js";
  import PaintLayer from "./lib/PaintLayer.svelte";
  import PreviewFrame from "./lib/preview/PreviewFrame.svelte";
  import NoticeStack from "./lib/preview/NoticeStack.svelte";
  import PreviewGrid from "./lib/preview/PreviewGrid.svelte";
  import PreviewTopBar from "./lib/preview/PreviewTopBar.svelte";
  import { preview } from "./lib/preview/view.svelte.js";
  import BreakpointsSection from "./lib/sections/BreakpointsSection.svelte";
  import DerivedSection from "./lib/sections/DerivedSection.svelte";
  import GridSection from "./lib/sections/GridSection.svelte";
  import SidebarFooter from "./lib/sections/SidebarFooter.svelte";
  import SidebarTopBar from "./lib/sections/SidebarTopBar.svelte";
  import OperationsSection from "./lib/sections/OperationsSection.svelte";
  import TilesSection from "./lib/sections/TilesSection.svelte";
  import Dialog from "./lib/ui/Dialog.svelte";
  import ScrollArea from "./lib/ui/ScrollArea.svelte";
  import SelectionOverlay from "./lib/SelectionOverlay.svelte";
  import type { Cell } from "./paint.js";
  import { notices } from "./notices.svelte.js";
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
  let failures = $state<{ ref: AssetRef; meta: unknown; text: string }[]>([]);

  /**
   * The failures whose asset is still the one that failed: the same `meta`
   * object. An import, or attaching the file again, writes a new `meta`, so
   * the failure goes; a deleted asset's goes too. Either way it would describe
   * a picture the author can no longer see or fix.
   */
  const liveFailures = $derived(
    failures
      .filter(({ ref, meta }) => metaOf(ref) === meta)
      .map((f) => f.text),
  );

  function metaOf(ref: AssetRef): unknown {
    const tile = config.tiles.find((t) => t.id === ref.tileId);
    return tile?.assets.find((a) => a.id === ref.assetId)?.meta;
  }

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
    // The author's words, not the provider's: a picture with no file behind it
    // (an archive that did not carry it, a reload) says so plainly.
    const name = config.tiles.find((t) => t.id === ref.tileId)?.name ?? ref.tileId;
    const reason = stored(ref.tileId, ref.assetId) === undefined ? "no file attached" : String(cause);
    const failure = `${name} · ${ref.assetId}: ${reason}`;
    // The notice lists each failure once, and its signature is the list, so a
    // repeat would bring a dismissed notice back for nothing. The renderer reports a failure once
    // per resolution (`provider.ts` `DrawableCache`), but it resolves again when
    // an asset's `meta` changes, and the same picture can then fail the same way.
    if (failures.some((f) => f.text === failure)) return;
    failures = [...failures, { ref, meta: metaOf(ref), text: failure }];
  }

  /**
   * Starts a new tileset, **confirmed and not undoable** (`session.reset`). It
   * discards everything, so it asks first (a `Dialog`, Stage 2 W4), and it then
   * reclaims every picture the session held.
   *
   * Reset first, then empty the store: the outgoing document is then already
   * gone from the preview, so no `<img>` draws an object URL `replaceAll` has
   * just revoked, and nothing reports those as failures.
   */
  let askingNew = $state(false);

  async function newTileset(): Promise<void> {
    session.reset();
    failures = [];
    notices.clear();
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

  /** §8.5's load preview, held in `preview` (`view.svelte.ts`) with its reasons. */
  const loadSalt = $derived(preview.loadSalt);

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
  let pending = $state<{ field: string; value: string; apply: Transition } | null>(null);
  let askingResize = $state(false);

  /**
   * The gate the three destructive controls route through — §9.3.
   *
   * **Confirmation is required only where something is at risk.** Procedural
   * Selections survive a resize unharmed, so a config holding only those applies
   * directly: "a dialogue that appears every time teaches the author to dismiss
   * it before reading, which is worse than no dialogue."
   */
  function destructive(field: string, value: string, transition: Transition): void {
    if (needsConfirmation(config)) {
      pending = { field, value, apply: transition };
      askingResize = true;
    } else session.apply(transition);
  }

  function confirmPending(): void {
    if (pending === null) return;
    session.apply(pending.apply);
    pending = null;
  }

  /** "Cell size", for the dialog's verb. */
  function capitalised(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
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
   * The orphan notice's "Open op-2" (Pol, W4): the operation opens on its
   * Selection step, which is what lost cells. It goes through the
   * unsaved-changes guard, so an open draft's changes are never dropped
   * without asking.
   */
  function openOperation(id: string): void {
    opening.open(id, "selection");
  }

  /**
   * Every condition the document holds — §12.2's advisories and §12.3's
   * failures, as notices in the preview's stack (Stage 2, W3). Derived, so each
   * goes away by itself when the document no longer has it; a dismissal is
   * forgotten then too, so the notice returns if the condition does.
   */
  const current = $derived(documentNotices(file, orphaned, liveFailures, openOperation));

  /**
   * The conditions as of the last committed value. A numeric field commits on
   * every keystroke that parses (**E5**), so `current` moves while the author is
   * typing; the stack holds still until the value is committed, so nothing
   * interrupts them twice (Pol, W1, `entry.svelte.ts`).
   */
  let conditions = $state.raw<Notice[]>([]);
  $effect(() => {
    const next = current;
    if (!entry.active) conditions = next;
  });
  $effect(() => notices.forget(conditions));

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
   * The **shadow config** the overlay resolves against (`shadowConfig`).
   *
   * `selection()` resolves an Operation **by id** and the draft is not in the
   * file, so the overlay is drawn against the config with the draft in it. A
   * pure local value; it touches nothing, and **E3** is untouched because the
   * document is still exactly `session.file`.
   *
   * `null` until the draft has a Selection type — before that there is no
   * predicate to resolve, which is different from a predicate that matches
   * nothing, and §6.1 shows the overlay for the Operation *being edited*.
   */
  const shadow = $derived(drafting.draft === null ? null : shadowConfig(config, drafting.draft));

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

<svelte:window oninputcapture={entry.input} onchange={entry.done} onfocusout={entry.done} onkeydown={entry.keydown} />

<main>
  <aside>
    <!--
      The sidebar is three parts. The top bar (the document's actions) lines up
      with the preview's top bar. `.scrollable` holds the sections and scrolls;
      the preview beside it does not move, so every control is reachable
      without the picture it changes leaving the screen, which is the whole
      point of **S2**'s single live preview. `.fixed` (the footer) never
      scrolls.
    -->
    <SidebarTopBar onNew={() => (askingNew = true)} />

    <div class="sidebar-body">
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

    <SidebarFooter />
    </div>
  </aside>

  <section class="preview" aria-label="Preview">
    <PreviewTopBar {rules} />
    <!-- The backdrop is the whole picture area's, between the bars (Pol, Stage 2). -->
    <div class="canvas" style="background: {preview.background};">
    <ScrollArea fill>
      <div class="preview-body">
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
    <!--
      §12.2's advisories and §12.3's failures — "reported beside the preview,
      not inside it": floating over the picture area, never drawn into a cell.
    -->
    <NoticeStack notices={notices.shown(conditions)} onDismiss={(n) => notices.dismiss(n)} />
    </div>
  </section>

</main>

<!--
  **E12** — explicit confirmation, naming the Operations that will be affected
  (Stage 2 W4: a `Dialog`, asked once the value is committed). It is a *held
  transition*: nothing has touched the file, so cancelling costs nothing, and
  the field already shows the file again because its draft went on blur.
  Confirming is one `TilesetFile -> TilesetFile`. "Nothing is moved for you" is
  §9.4: undo is the repair.
-->
<Dialog
  title={pending ? `Change ${pending.field} to ${pending.value}?` : ""}
  confirmLabel={pending ? `Change ${pending.field}` : "Change"}
  bind:open={askingResize}
  onConfirm={confirmPending}
  onCancel={() => (pending = null)}
>
  <p class="t-body">
    This changes the column count, and {risked.length === 1 ? "this operation is" : "these operations are"}
    tied to specific cells. Nothing is moved for you; undo puts it back.
  </p>
  <ul class="risked">
    {#each risked as op (op.id)}
      <li>
        <span class="index t-console" aria-hidden="true">{config.operations.indexOf(op) + 1}</span>
        <span class="t-console">{op.id} · {op.selection.type}</span>
      </li>
    {/each}
  </ul>
</Dialog>

<Dialog title="Start a new tileset?" confirmLabel="Start new" bind:open={askingNew} onConfirm={newTileset}>
  <p class="t-body">Everything in this one is lost, and this can't be undone. Export it first to keep it.</p>
</Dialog>

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
    grid-template-rows: auto minmax(0, 1fr);
    height: 100dvh;
  }

  /*
    The two top bars share the first row (subgrid), so they are always the same
    height and their hairline is one line across the window, even when the
    preview's bar wraps in a narrow column.
  */
  aside,
  .preview {
    grid-row: 1 / -1;
    display: grid;
    grid-template-rows: subgrid;
    grid-template-columns: minmax(0, 1fr);
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
      grid-template-rows: none;
      height: auto;
    }

    aside,
    .preview {
      grid-row: auto;
      grid-template-rows: auto minmax(0, 1fr);
      height: 100dvh;
    }
  }

  /*
    The sidebar: the grey ground; the top bar, the scrolling sections, the fixed
    footer. No frame: the ground's value against the preview's white is the edge.
  */
  aside {
    background: var(--color-ground);
  }

  .sidebar-body {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }

  /* `ScrollArea` scrolls; its handle sits on the content, so the sidebar never narrows. */
  .scrollable {
    min-height: 0;
  }

  /*
    Sections float on the ground with a little of it between them, so an open
    section's white panel has an edge on every side, the last one included.
  */
  .sections {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
    padding: var(--space-4);
  }

  /*
    The preview column: the top bar (with the breakpoints, Pol, Stage 2), then
    the picture area. The bar stays put and only the picture area scrolls, in a `ScrollArea` like the
    sidebar, so a scrollbar never takes width from the frame and the sidebar
    never moves.
  */
  /* The notice stack is placed against it, so it stays put while the picture scrolls. */
  .canvas {
    position: relative;
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


  /* E12's affected operations: a well, each row an ink index square and the id in mono. */
  .risked {
    display: grid;
    gap: var(--space-3);
    margin: var(--space-6) 0 0;
    padding: var(--space-4);
    border-radius: var(--radius);
    background: var(--color-well);
    list-style: none;
  }

  .risked li {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .risked .index {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--op-index);
    height: var(--op-index);
    border-radius: var(--radius-xs);
    background: var(--color-ink);
    color: var(--color-paper);
    text-box: none;
  }
</style>
