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
  import { selections } from "@tileset/core";
  import Tileset from "@tileset/core/Tileset.svelte";
  import { naturalHeight, naturalRatio, type AssetRef } from "@tileset/core/render";
  import { editorProvider } from "./assets.js";
  import { bleed } from "./derive.js";
  import { exportZip } from "./download.js";
  import { drawsNothing } from "./export.js";
  import {
    ENGINE_VERSION,
    rerollAssets,
    rerollSeed,
    setCellSize,
    setDefaultSeed,
    setHorizontalAlignment,
    setReferenceWidth,
    setReseedAssetsOnLoad,
    setRows,
    setYOffset,
    type Transition,
  } from "./document.js";
  import { toShadowOperation } from "./draft.svelte.js";
  import { drafting } from "./drafting.svelte.js";
  import { parseCellSize, parseReferenceWidth, parseRows, parseYOffset } from "./fields.js";
  import { nextOperationId } from "./ids.js";
  import { atRisk, needsConfirmation, orphans } from "./orphans.js";
  import NumericInput from "./lib/NumericInput.svelte";
  import OperationDraft from "./lib/OperationDraft.svelte";
  import OperationStack from "./lib/OperationStack.svelte";
  import PaintLayer from "./lib/PaintLayer.svelte";
  import PreviewFrame from "./lib/PreviewFrame.svelte";
  import SelectionOverlay from "./lib/SelectionOverlay.svelte";
  import TileLibrary from "./lib/TileLibrary.svelte";
  import type { Cell } from "./paint.js";
  import { drawLoadSalt, inertFlags, loadVaries } from "./reseed.js";
  import { session } from "./session.svelte.js";

  const file = $derived(session.file);
  const config = $derived(file.config);
  const layout = $derived(file.layout);

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
    failures = [...failures, `${ref.tileId}/${ref.assetId}: ${String(cause)}`];
  }

  const currentBleed = $derived(bleed(layout.referenceWidth, layout.cellSize, config.columns));

  /**
   * The **visible** grid height, in design px.
   *
   * `07` §5.3 defines the render box's natural height as
   * `s * (rows - yOffset) * cellSize` — "the box that exactly contains the
   * visible grid, clipping row 0's top by `yOffset` and ending flush with the
   * last row's bottom edge". Evaluating it at `Wpx = referenceWidth` makes
   * `s = 1`, so the same function returns design px.
   *
   * Taken from the package rather than multiplied out here. `07` **R1** requires
   * one implementation of the coordinate mapping and `08` **S10** exports it for
   * exactly this: "the component computes placement from them, and `09` draws
   * every overlay from them. Neither reimplements the arithmetic."
   */
  const visibleHeight = $derived(
    naturalHeight({
      layout,
      rows: config.rows,
      columns: config.columns,
      Wpx: layout.referenceWidth,
    }),
  );

  /** What `yOffset` clips off the top of row 0, in design px (`02` §7.4). */
  const clipped = $derived(layout.yOffset * layout.cellSize);

  const round = (n: number): number => Math.round(n * 1000) / 1000;

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
  let renderBox = $state<HTMLDivElement | null>(null);

  /**
   * §8.5's load preview. **Writes no field** — §8.1's fourth row is the one that
   * is not an edit, so it lives here and reaches `<Tileset>` as a prop.
   *
   * **R12** — one value per session, held for its duration. `08` **S7** makes
   * that structural rather than disciplinary: the component draws no random
   * number at all, so a regeneration has nothing to redraw. Only this button
   * moves it, which is what makes it a *preview of another load* rather than
   * noise under every edit.
   */
  let loadSalt = $state(0);

  /** §8.5's disabled condition, and §8.4's advisory. */
  const varies = $derived(loadVaries(config));
  const inert = $derived(inertFlags(config));

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
   * The **shadow config** the overlay resolves against — `DECISIONS.md` Q7's
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
   */
  const shadow = $derived.by(() => {
    const draft = drafting.draft;
    if (draft === null) return null;
    const operation = toShadowOperation(draft);
    if (operation === null) return null;
    return {
      operationId: operation.id,
      config: { ...config, operations: [...config.operations, operation] },
    };
  });

  /**
   * §11.1's export — the file and its asset folder, **together** (**E14**).
   *
   * The failure is reported rather than swallowed: `entries()` throws where an
   * asset's bytes are missing or two assets claim one path, and shipping a folder
   * that is quietly incomplete is `07` **R3**'s substitution problem moved into
   * the artifact, where no `onAssetError` will ever fire for it.
   */
  let exporting = $state(false);
  let exportError = $state<string | null>(null);

  async function runExport(): Promise<void> {
    exporting = true;
    exportError = null;
    try {
      await exportZip(file);
    } catch (cause) {
      exportError = String(cause instanceof Error ? cause.message : cause);
    } finally {
      exporting = false;
    }
  }

  /** §12.2's fifth advisory. **E16** — it never blocks the export. */
  const empty = $derived(drawsNothing(file));

  /**
   * The brush's write. Straight into the draft's parameters, which are transient
   * UI state — **nothing here touches the file**, and cannot: the whole draft
   * reaches it as one transition when it is complete (`DECISIONS.md` Q7).
   */
  function paintCells(name: string, cells: Cell[]): void {
    const draft = drafting.draft;
    if (draft !== null) draft.selectionParams[name] = cells;
  }
</script>

<main>
  <header>
    <h1>Tileset editor</h1>
    <p class="version">
      engine <code>{ENGINE_VERSION}</code> · schema <code>{file.schemaVersion}</code>
    </p>
    <!--
      **E6** — undo restores a previous `TilesetFile` in full, and no editor
      action is outside the stack, including §9.3's design-width change. §9.4
      makes this *the repair* for an orphaned Selection: nothing is migrated,
      because migration has to guess.
    -->
    <button class="undo" disabled={!session.canUndo} onclick={() => session.undo()}>
      Undo
    </button>
  </header>

  {#if pending !== null}
    {@const p = pending}
    <!--
      **E12** — explicit confirmation, naming the Operations that will be
      affected. It is a *held transition*: nothing has touched the file, so
      cancelling costs nothing and confirming is one `TilesetFile -> TilesetFile`.
    -->
    <!-- A div, not a section: a section carries an implicit `region` role and
         cannot take an interactive one. -->
    <div class="confirm" role="alertdialog" aria-label="Confirm destructive change">
      <h2>{p.label}</h2>
      <p>
        This re-derives <code>columns</code>, and
        {risked.length === 1 ? "this Operation is" : "these Operations are"} bound to specific
        coordinates. <strong>Nothing is migrated</strong> (§9.4) — undo is the repair.
      </p>
      <ul>
        {#each risked as op (op.id)}
          <li><code>{op.id}</code> · {op.selection.type}</li>
        {/each}
      </ul>
      <div class="actions">
        <button class="go" onclick={confirmPending}>Change it</button>
        <button onclick={() => (pending = null)}>Cancel</button>
      </div>
    </div>
  {/if}

  {#if orphaned.length > 0}
    <!--
      §9.4's step 2, carried as a §12.2 advisory until the author touches the
      Operation. **E16** — never blocks, never modifies the file, never an error.

      `04` §4.4's distinction survives in the *wording* and not in the repair: a
      `rect` can plausibly be re-dragged, a hand-painted `cellList` cannot.
    -->
    <section class="orphans">
      <h2>Orphaned by a resize</h2>
      <ul>
        {#each orphaned as orphan (orphan.operationId)}
          <li>
            <code>{orphan.operationId}</code> · {orphan.selectionType} —
            {#if orphan.authored !== undefined}
              {orphan.authored - orphan.reachable} of {orphan.authored}
              painted {orphan.authored - orphan.reachable === 1 ? "cell is" : "cells are"} outside
              the grid and cannot be reached or unpainted.
            {:else if orphan.empty}
              lies wholly outside the grid and selects nothing. Re-drag it, or undo.
            {:else}
              reaches fewer cells than it did.
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <div class="columns">
    <aside>
      <!--
        `09` §9.3: "The three controls sit together, away from the preview width
        handle." The design principle behind that separation is §9.2's: the
        destructive edit must not be the one that is easy to do by accident. A
        page edge that can be dragged reads as a viewport, and a viewport does
        not destroy work — so the destructive control is a numeric field and the
        harmless one is the drag handle (Step 3).
      -->
      <section class="panel">
        <h2>Grid</h2>
        <div class="fields">
          <NumericInput
            label="rows"
            step="1"
            value={config.rows}
            parse={parseRows}
            onCommit={(t) => session.apply(setRows(t))}
          />
          <NumericInput
            label="y offset"
            step="0.05"
            note="[0, 1) — clips row 0"
            value={layout.yOffset}
            parse={parseYOffset}
            onCommit={(t) => session.apply(setYOffset(t))}
          />
        </div>
      </section>

      <!--
        `09` §8.2 — the seed field.

        **The author never sees a hash** (`02` §6.6). They type a string, and
        that is the whole interface. Beside it, a generated *memorable* seed in
        word-word-number form, because "the value of a seed is that it can be
        written down and returned to, and random hex defeats that".

        **There is no separate preview seed** (§5, §8.1's table). This writes
        `config.defaultSeed` and the component falls back to it (`07` §9.2), so
        the preview always shows what a visitor with no host seed sees. A preview
        seed would let the author approve a picture the file does not produce.
      -->
      <section class="panel">
        <h2>Seed</h2>
        <div class="seed">
          <input
            type="text"
            aria-label="seed"
            value={config.defaultSeed}
            oninput={(e) => session.apply(setDefaultSeed(e.currentTarget.value))}
          />
          <button onclick={() => session.apply(rerollSeed())}>New seed</button>
        </div>
        <p class="note small">
          Writes <code>defaultSeed</code>, and every Operation's picture is a function of it
          (<code>02</code>&nbsp;§6.6). An empty field is in-flight input and does not reach the
          file — <strong>E5</strong>.
        </p>

        <!--
          §8.4 — the asset reroll. `02` §6.4: it re-rolls which variant each cell
          shows **without disturbing any Operation**, because the asset channel is
          separate. Every `tileId` stays where it is.
        -->
        <div class="reroll-row">
          <button onclick={() => session.apply(rerollAssets())}>Reroll assets</button>
          <span class="tag">assetSalt <code>{config.assetSalt ?? 0}</code></span>
        </div>

        <label class="flag">
          <input
            type="checkbox"
            checked={config.reseedAssetsOnLoad === true}
            onchange={(e) => session.apply(setReseedAssetsOnLoad(e.currentTarget.checked))}
          />
          reseed assets on load
        </label>

        <!--
          §8.5 — the load preview. It **writes no field** (§8.1's fourth row): the
          value is held in editor state and reaches `<Tileset>` as a prop.

          **Disabled where nothing is flagged.** `04` §8.3: a config with the flag
          false throughout is byte-identical on every load *regardless of*
          `loadSalt`, and "an enabled button that provably changes nothing is
          `05` §6.1's complaint arriving one level out".

          **R12** — one value per session, held. The editor gets that structurally
          from **S7**: the component draws no random number, so there is nothing
          to redraw on a regeneration.
        -->
        <div class="reroll-row">
          <button disabled={!varies} onclick={() => (loadSalt = drawLoadSalt())}>
            Preview a fresh load
          </button>
          {#if varies}
            <span class="tag">loadSalt <code>{loadSalt}</code></span>
          {:else}
            <span class="tag muted">nothing is flagged</span>
          {/if}
        </div>

        {#if inert.length > 0}
          <!--
            `06` §10.4's second diagnostic, as **E16**'s advisory: never blocks,
            never modifies the file, never an error. §8.4 requires this to be
            *reported* rather than corrected — the flag still moves the
            Operation's `random` Selection (`04` §8.2), so it is not fully inert
            and clearing it would change the picture.
          -->
          <p class="advisory">
            {inert.map((op) => op.id).join(", ")} — <code>reseedOnLoad</code> over a
            non-stochastic Source. Not cleared: the flag still moves a
            <code>random</code> Selection (<code>04</code>&nbsp;§8.2). Only reachable by import.
          </p>
        {/if}
      </section>

      <section class="panel destructive">
        <h2>Design width</h2>
        <div class="fields">
          <NumericInput
            label="design width"
            value={layout.referenceWidth}
            parse={parseReferenceWidth}
            onCommit={(t) => destructive(`design width → ${t}`, setReferenceWidth(t))}
          />
          <NumericInput
            label="cell size"
            value={layout.cellSize}
            parse={parseCellSize}
            onCommit={(t) => destructive(`cell size → ${t}`, setCellSize(t))}
          />

          <!--
            §9.1's toggle, beside design width. It writes `horizontalAlignment`,
            which is authoring metadata the renderer never reads (`02` §7.3) —
            its only function is constraining parity during derivation, and
            toggling it can move `columns` by one through that alone.
          -->
          <div class="field">
            <span class="label">alignment</span>
            <div class="segmented">
              {#each ["column", "gutter"] as const as option (option)}
                <button
                  class:on={layout.horizontalAlignment === option}
                  onclick={() =>
                    destructive(`alignment → ${option}`, setHorizontalAlignment(option))}
                >
                  {option}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <!--
          §9.3 — confirmation is required **only where something is at risk**.
          Procedural Selections survive a resize unharmed, so this says which of
          the two states the document is in rather than warning unconditionally.
        -->
        <p class="warn">
          These three re-derive <code>columns</code> and are destructive
          (<strong>E12</strong>).
          {#if risked.length > 0}
            {risked.length}
            {risked.length === 1 ? "Operation is" : "Operations are"} coordinate-bound, so a change
            asks first.
          {:else}
            Every Selection here is procedural and survives a resize
            (<code>04</code>&nbsp;§4.4), so no confirmation appears.
          {/if}
        </p>
      </section>

      <section class="panel">
        <h2>Derived</h2>
        <!--
          `columns` is **displayed, never edited** (§9.1). The author needs to
          know it — a `rect` is authored in column indices — and editing it would
          break `columns * cellSize >= referenceWidth` and produce `06` §10.4's
          fourth diagnostic from inside the editor, which **E1** forbids.
        -->
        <dl>
          <dt>columns</dt>
          <dd>{config.columns} <span class="tag">derived</span></dd>
          <dt>grid width</dt>
          <dd>{config.columns * layout.cellSize} <span class="unit">design px</span></dd>
          <!--
            `02` §7.4 — the grid is **top-anchored**, its height is
            `rows * cellSize` in design px, and only `rows` makes it taller or
            shorter. There is no vertical counterpart to `horizontalAlignment`,
            and no vertical bleed here: `07` §7.3 makes that the host's, through
            the box's height.
          -->
          <dt>grid height</dt>
          <dd>{config.rows * layout.cellSize} <span class="unit">design px</span></dd>
          <dt>visible height</dt>
          <dd>
            {round(visibleHeight)} <span class="unit">design px</span>
            {#if clipped > 0}
              <em>{round(clipped)} clipped off row 0</em>
            {/if}
          </dd>
          <dt>bleed</dt>
          <dd>
            {currentBleed} <span class="unit">design px</span>
            {#if currentBleed > 0}
              <em>{currentBleed / 2} each side</em>
            {/if}
          </dd>
          <dt>tiles</dt>
          <dd>{config.tiles.length}</dd>
          <dt>operations</dt>
          <dd>{config.operations.length}</dd>
        </dl>
        <button onclick={() => session.reset()}>New document</button>
      </section>

      <!--
        §11.1 — **E14**: a `TilesetFile` and an asset folder, together, as one
        action. Not two buttons: "when the editor emits the folder alongside the
        file, `src` stops being a string an author typed and becomes a string the
        editor wrote beside a file it just copied", and a file exported without
        its folder reopens the hole that closes.
      -->
      <section class="panel">
        <h2>Export</h2>
        <button class="export" disabled={exporting} onclick={runExport}>
          {exporting ? "Building…" : "Export tileset.zip"}
        </button>

        <p class="note small">
          <code>tileset.json</code> plus <code>tiles/&lt;tileId&gt;/&lt;assetId&gt;.&lt;ext&gt;</code>
          — the layout mirrors the asset key, so two Tiles holding <code>a1</code> cannot collide
          (<code>07</code>&nbsp;§4.1). Paths in <code>meta.src</code> are relative; the host
          resolves them (§11.2).
        </p>

        {#if empty}
          <!--
            §12.2's fifth advisory, which `08` §3.4 routes here explicitly. **E16**
            — never blocks: an empty document is a legal file (**G4**) and the
            author may want it.
          -->
          <p class="advisory">
            This document is legal but draws nothing — no tiles, no operations, or every palette
            entry <code>null</code>. Exporting it is allowed.
          </p>
        {/if}

        {#if exportError !== null}
          <p class="failure">{exportError}</p>
        {/if}
      </section>

      <TileLibrary />

      <OperationStack
        onCreate={() => drafting.start(nextOperationId(config.operations.map((o) => o.id)))}
      />

      {#if drafting.draft !== null}
        {@const draft = drafting.draft}
        <OperationDraft {draft} onClose={() => drafting.discard()} />
      {/if}
    </aside>

    <section class="panel preview">
      <h2>Preview</h2>
      <!--
        The host owns the render box's width through ordinary CSS. There is no
        width prop: `07` §5.3 makes every quantity a fixed fraction of Wpx, so
        the component expresses placement in relative units and Wpx is whatever
        width the CSS gives it (`08` §4).

        `PreviewFrame` is that CSS and nothing more — **E11**: it sets `Wpx` and
        writes no field.
      -->
      <PreviewFrame ratio={naturalRatio(layout, config.rows)}>
        {#snippet children(Wpx: number)}
          <!--
            **S2** — one component, drawing the complete stack. The brush layer
            is drawn *over* this output and never in place of it, and the picture
            underneath is the same one a production page gets.
          -->
          <Tileset {file} {loadSalt} provider={editorProvider} {onAssetError} bind:box={renderBox} />

          {#if shadow !== null}
            {@const s = shadow}
            <!--
              **E7** — the one overlay, over the Operation being edited. **E8** —
              its cell set comes from the package (`09` §6.2) and the editor
              implements no Selection's test.
            -->
            <SelectionOverlay
              g={{ layout, rows: config.rows, columns: config.columns, Wpx }}
              config={s.config}
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
              g={{ layout, rows: config.rows, columns: config.columns, Wpx }}
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
    </section>
  </div>

  <details class="debug">
    <summary>The file</summary>
    <!--
      **E3** — the editor's state *is* this. There is no second document model,
      so what is shown here is what previews above and what Step 11 will export.
    -->
    <pre>{JSON.stringify(file, null, 2)}</pre>
  </details>
</main>

<style>
  :global(body) {
    margin: 0;
    font: 14px/1.5 ui-sans-serif, system-ui, sans-serif;
    background: #f4f6f9;
    color: #1a202c;
  }

  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  h1 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }

  h2 {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #5a6b80;
    margin: 0 0 0.75rem;
  }

  .version {
    margin: 0;
    font-size: 0.8rem;
    color: #5a6b80;
  }

  .columns {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 1.25rem;
    align-items: start;
  }

  /*
    A grid item defaults to `min-width: auto`, which is its max-content size. The
    preview frame carries an explicit pixel width, so without this the second
    track grows to contain a 1440px frame, the grid overflows, and the sidebar is
    squeezed underneath it. `minmax(0, 1fr)` above and this together let the
    track be narrower than its content, which is what makes the frame's own
    clamp against the available width the thing that decides its size.
  */
  .columns > * {
    min-width: 0;
  }

  aside {
    display: grid;
    gap: 0.75rem;
  }

  .panel {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 1rem;
  }

  /* §9.2's design principle made visible: the destructive control looks it. */
  .destructive {
    border-color: #e0b062;
  }

  .fields {
    display: grid;
    gap: 0.5rem;
  }

  .field {
    display: grid;
    grid-template-columns: 1fr 5.5rem;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .label {
    color: #4a5568;
  }

  .segmented {
    display: flex;
  }

  .segmented button {
    flex: 1;
    border-radius: 0;
    padding: 0.3rem 0.2rem;
    font-size: 0.7rem;
    background: #f7fafc;
    border-color: #cbd5e0;
  }

  .segmented button:first-child {
    border-radius: 4px 0 0 4px;
  }

  .segmented button:last-child {
    border-radius: 0 4px 4px 0;
    border-left: 0;
  }

  .segmented button.on {
    background: #cbd5e0;
    color: #1a202c;
  }

  .warn {
    margin: 0.85rem 0 0;
    font-size: 0.72rem;
    line-height: 1.45;
    color: #8a6d1f;
  }

  .unit,
  dd em {
    font-size: 0.72rem;
    font-style: normal;
    color: #a0aec0;
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.35rem 0.75rem;
    margin: 0 0 1rem;
    font-size: 0.85rem;
  }

  dt {
    color: #5a6b80;
  }

  dd {
    margin: 0;
  }

  .tag {
    font-size: 0.7rem;
    color: #a0aec0;
    border: 1px solid #cbd5e0;
    border-radius: 3px;
    padding: 0 0.25rem;
  }

  button {
    background: #cbd5e0;
    border: 1px solid #a0aec0;
    color: inherit;
    border-radius: 4px;
    padding: 0.35rem 0.7rem;
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }

  button:hover {
    background: #a0aec0;
  }


  .note {
    font-size: 0.8rem;
    color: #5a6b80;
    max-width: 62ch;
    margin: 0.75rem 0 0;
  }

  .note.small {
    font-size: 0.7rem;
    line-height: 1.45;
    color: #a0aec0;
  }

  .seed {
    display: flex;
    gap: 0.4rem;
  }

  .seed input {
    flex: 1;
    min-width: 0;
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    border-radius: 4px;
    padding: 0.35rem 0.5rem;
    font: inherit;
    font-family: ui-monospace, monospace;
    font-size: 0.8rem;
    color: inherit;
  }

  .seed input:focus {
    outline: none;
    border-color: #3182ce;
  }

  .seed button {
    white-space: nowrap;
  }

  .undo:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .undo:disabled:hover {
    background: #cbd5e0;
  }

  /* §9.3's design principle made visible: the destructive edit is the one that
     stops and asks, and it looks unlike everything else on the page. */
  .confirm {
    background: #fffaf0;
    border: 1px solid #e0b062;
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .confirm h2 {
    color: #8a6d1f;
    margin-bottom: 0.5rem;
  }

  .confirm p {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    line-height: 1.5;
    color: #4a5568;
    max-width: 70ch;
  }

  .confirm ul,
  .orphans ul {
    margin: 0 0 0.75rem;
    padding-left: 1.1rem;
    font-size: 0.78rem;
    line-height: 1.6;
    color: #4a5568;
  }

  .confirm .actions {
    display: flex;
    gap: 0.5rem;
  }

  .confirm .go {
    background: #e0b062;
    border-color: #b7791f;
    color: #1a202c;
  }

  .confirm .go:hover {
    background: #d19c45;
  }

  /* E16 — an advisory, never a blocker and never an error. */
  .orphans {
    background: #fffaf0;
    border: 1px solid #e0b062;
    border-radius: 6px;
    padding: 0.85rem 1rem;
    margin-bottom: 1rem;
  }

  .orphans h2 {
    color: #8a6d1f;
    margin-bottom: 0.5rem;
  }

  .orphans ul {
    margin-bottom: 0;
  }

  .export {
    width: 100%;
  }

  .export:disabled {
    opacity: 0.5;
    cursor: progress;
  }

  .failure {
    margin: 0.6rem 0 0;
    font-size: 0.72rem;
    line-height: 1.45;
    color: #c53030;
  }

  .reroll-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .reroll-row button {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }

  .reroll-row button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .reroll-row button:disabled:hover {
    background: #cbd5e0;
  }

  .tag.muted {
    border-color: transparent;
    color: #a0aec0;
  }

  .flag {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #4a5568;
    cursor: pointer;
  }

  .flag input {
    margin: 0;
  }

  /* E16 — an advisory never blocks, never modifies the file, never an error. */
  .advisory {
    margin: 0.6rem 0 0;
    font-size: 0.7rem;
    line-height: 1.45;
    color: #8a6d1f;
  }

  code {
    font-family: ui-monospace, monospace;
    font-size: 0.85em;
    color: #2b6cb0;
  }

  .failures {
    margin-top: 1rem;
    font-size: 0.8rem;
    color: #c53030;
  }


  .debug {
    margin-top: 1.25rem;
    font-size: 0.8rem;
    color: #5a6b80;
  }

  .debug pre {
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 0.75rem;
    overflow-x: auto;
    color: #4a5568;
  }
</style>
