<!--
  The create-operation workflow — `09-editor.md` §7.

  Four steps, in the order the author walks them: **Selection → attribute →
  Source → Blend**, with the mapping folded into the attribute step per §7.4.

  Two of them are generated entirely from the registry (**E9**) and two are
  hand-written, and the split is not arbitrary:

  | Step      | Built from                                    |
  | --------- | --------------------------------------------- |
  | Selection | its `ParamSchema` — §7.1, no per-type code    |
  | attribute | `TARGETS` and the Target's type               |
  | Source    | its `ParamSchema` — §7.1, no per-type code    |
  | Blend     | `acceptedBlends()` — §7.7, ADR-001            |

  **The steps stay navigable after the fact rather than being a one-way wizard.**
  §7.4's collapse to a single handle under a `constant` Source, and §7.6's
  advisory about a reordered palette under `random`, both make the attribute step
  depend on the Source that follows it (`DECISIONS.md` Q8).
-->
<script lang="ts">
  import { selections, sources, TARGETS, type AttributeName, type TargetName } from "@tileset/core";
  import BlendControl from "../controls/BlendControl.svelte";
  import { isTileTarget } from "../controls/mapping.js";
  import NumericMappingControl from "../controls/NumericMapping.svelte";
  import PaletteBar from "../controls/PaletteBar.svelte";
  import ParamFields from "../controls/ParamFields.svelte";
  import { addOperation } from "../document.js";
  import {
    defaultParams,
    isComplete,
    retarget,
    STEPS,
    toOperation,
    type Draft,
    type Step,
  } from "../draft.svelte.js";
  import { session } from "../session.svelte.js";

  interface Props {
    /**
     * Held **beside** the file in `draft.svelte.ts` rather than owned here, so
     * §7.3's brush can paint into it from the preview. Its id was allocated when
     * it opened and is never reassigned (§4.3) — Step 8's overlay needs that,
     * since `selection()` resolves an Operation by id.
     */
    draft: Draft;
    onClose: () => void;
  }

  let { draft, onClose }: Props = $props();

  const selectionRegistrations = selections.all();
  const sourceRegistrations = sources.all();

  const selectionSchema = $derived(
    draft.selectionType === null ? null : selections.get(draft.selectionType).params,
  );
  const sourceSchema = $derived(
    draft.sourceType === null ? null : sources.get(draft.sourceType).params,
  );

  /**
   * Choosing a type materializes every parameter at its schema default (§7.1,
   * `06` §5.1) rather than leaving them absent, so the control shows exactly
   * what the file will contain.
   */
  function chooseSelection(name: string): void {
    draft.selectionType = name;
    draft.selectionParams = defaultParams(selections.get(name).params);
  }

  function chooseSource(name: string): void {
    draft.sourceType = name;
    draft.sourceParams = defaultParams(sources.get(name).params);
  }

  /**
   * `04` §7.2's five Targets, from the package's own table. Four attributes plus
   * the structural `tileId`; the set is **closed** by `05` §4.2, which follows
   * `03` **D7** closing the attribute set.
   */
  const targets = Object.keys(TARGETS) as TargetName[];

  /**
   * §7.4 — "the handles collapse to one when the Source is `constant`."
   *
   * `04` §5.2: `constant` emits `0` always, so a fixed value is the mapping's
   * `min` equal to its `max`. The alternative, a `value` parameter on the
   * Source, "puts two controls in the UI that mean the same thing, and leaves
   * undefined what happens when they disagree".
   *
   * Live rather than fixed at the time the attribute step was visited, which is
   * `DECISIONS.md` Q8's answer: the Source comes *after* the attribute in the
   * author's order, so this has to re-read it.
   */
  const collapsed = $derived(draft.sourceType === "constant");

  const stepLabel: Record<Step, string> = {
    selection: "Selection",
    attribute: "Attribute",
    source: "Source",
    blend: "Blend",
  };

  /** What each step has settled, for the step rail. */
  function chosen(step: Step): string | null {
    if (step === "selection") return draft.selectionType;
    if (step === "source") return draft.sourceType;
    if (step === "attribute") return draft.target;
    return draft.blend;
  }

  /**
   * Which steps have no answer — the commit button's reason, rather than a
   * button that is disabled for reasons the author has to guess at.
   *
   * The Blend is never the last one open: `04` §7.2's table gives every Target a
   * default, so answering the attribute step answers this one too (§7.7).
   */
  const unanswered = $derived.by(() => {
    const open = STEPS.filter((step) => chosen(step) === null).map((step) => stepLabel[step]);
    // Every step answered and still not whole: `06` §7.3's rules on the mapping
    // the Target selects — an empty palette, or weights summing to zero.
    if (open.length === 0 && !isComplete(draft)) open.push("the mapping");
    return open;
  });

  /**
   * The one transition — **E5**, and `DECISIONS.md` Q7: "the draft lives in
   * transient UI state and commits to the file as one `TilesetFile ->
   * TilesetFile` transition when complete."
   *
   * `toOperation` re-checks rather than trusting the disabled button, because a
   * transition is total on its own terms and this is the boundary the file is on
   * the other side of.
   */
  function commit(): void {
    const operation = toOperation(draft);
    if (operation === null) return;
    session.apply(addOperation(operation));
    onClose();
  }
</script>

<section class="panel">
  <header>
    <h2>New operation</h2>
    <code class="id">{draft.id}</code>
    <button class="close" onclick={onClose} aria-label="Discard draft">×</button>
  </header>

  <!--
    §4.2 — the draft is not in the file, so nothing here has changed the picture
    yet and discarding it costs nothing.
  -->
  <p class="note">
    Not in the file until it is complete — <strong>E5</strong>. The preview is unchanged.
  </p>

  <nav class="rail">
    {#each STEPS as step (step)}
      <button class:on={draft.step === step} onclick={() => (draft.step = step)}>
        {stepLabel[step]}
        {#if chosen(step)}<em>{chosen(step)}</em>{/if}
      </button>
    {/each}
  </nav>

  <div class="body">
    {#if draft.step === "selection"}
      <!--
        **Invariant O2** — a Selection is a pure function of `(x, y)` and its own
        parameters; it never reads the accumulated `TileState`. The list comes
        from the registry, so a Selection registered later appears here with no
        editor change (**E9**).
      -->
      <p class="prose">Which cells does this operation affect?</p>

      <div class="types">
        {#each selectionRegistrations as registration (registration.name)}
          <button
            class:on={draft.selectionType === registration.name}
            onclick={() => chooseSelection(registration.name)}
          >
            {registration.name}
          </button>
        {/each}
      </div>

      {#if selectionSchema}
        <ParamFields
          schema={selectionSchema}
          values={draft.selectionParams}
          onChange={(name, value) => (draft.selectionParams[name] = value)}
        />
      {/if}

      {#if draft.selectionType === "cellList"}
        <p class="prose small">
          The editor-facing <strong>manual</strong> selection (<code>04</code>&nbsp;§4.4) —
          one the author paints cell by cell. <strong>Paint on the preview</strong> (§7.3);
          drag to continue a stroke, and start on a painted cell to erase.
        </p>
      {/if}
    {:else if draft.step === "source"}
      <!--
        `04` §5.2's presets. `vignette` is specified there but is **not
        registered** in `packages/tileset`, so four appear rather than five —
        an engine gap, flagged and not worked around. When it is registered it
        appears here with nothing written for it.
      -->
      <p class="prose">Where does each cell's number come from? A value in <code>[0, 1)</code>.</p>

      <div class="types">
        {#each sourceRegistrations as registration (registration.name)}
          <button
            class:on={draft.sourceType === registration.name}
            onclick={() => chooseSource(registration.name)}
          >
            {registration.name}
            <!--
              §8.4 reads the registry's `stochastic` declaration and never a
              hardcoded list of Source names. Shown because it decides whether
              `reseedOnLoad` means anything (Step 9, `05` **X5**).
            -->
            {#if registration.stochastic}<em title="04 §5.2 — depends on the hash">stochastic</em
              >{/if}
          </button>
        {/each}
      </div>

      {#if sourceSchema}
        <ParamFields
          schema={sourceSchema}
          values={draft.sourceParams}
          onChange={(name, value) => (draft.sourceParams[name] = value)}
        />
      {/if}

      {#if draft.sourceType === "constant"}
        <p class="prose small">
          Emits <code>0</code>, always. A fixed value is the mapping's two handles collapsed
          to one (<code>04</code>&nbsp;§5.2, §7.4).
        </p>
      {/if}
    {:else if draft.step === "attribute"}
      <!--
        §7.4 folds the mapping into this step: "a numeric mapping is two handles
        on the Target's slider track, and the author never sees the word
        *mapping*". The Target decides which shape appears — `06` **C8**, "the
        file carries no kind tag".
      -->
      <p class="prose">What does this operation write?</p>

      <div class="types">
        {#each targets as target (target)}
          <button class:on={draft.target === target} onclick={() => retarget(draft, target)}>
            {target}
            <em>{TARGETS[target].type}</em>
          </button>
        {/each}
      </div>

      {#if draft.target !== null}
        {#if isTileTarget(draft.target)}
          <PaletteBar
            palette={draft.palette}
            tiles={session.file.config.tiles}
            sourceType={draft.sourceType}
            onChange={(palette) => (draft.palette = palette)}
          />
        {:else}
          <NumericMappingControl
            target={draft.target as AttributeName}
            mapping={draft.numeric}
            {collapsed}
            onChange={(mapping) => (draft.numeric = mapping)}
          />
        {/if}
      {/if}
    {:else}
      <!--
        §7.7 — "for any Target, show the default Blend, and reveal the accepted
        set only on request." The set is the **Target's**, so this step reads the
        attribute step the way the attribute step reads the Source.
      -->
      <p class="prose">How does this combine with what is already there?</p>

      {#if draft.target === null || draft.blend === null}
        <p class="prose small">
          A Blend belongs to a Target — <code>04</code>&nbsp;§7.2 gives each one its own accepted
          set. Choose the <strong>attribute</strong> first.
        </p>
      {:else}
        <BlendControl
          target={draft.target}
          blend={draft.blend}
          onChange={(blend) => (draft.blend = blend)}
        />
      {/if}
    {/if}
  </div>

  <!--
    **E5** — the draft reaches the file here and nowhere else, as **one**
    `TilesetFile -> TilesetFile` transition, because a half-built Operation is
    not a legal one (`DECISIONS.md` Q7).
  -->
  <footer>
    <span class="missing">
      {#if unanswered.length === 0}
        Appends to the end of the stack, where it runs last (<code>02</code>&nbsp;§9).
      {:else}
        Still open: {unanswered.join(", ")}
      {/if}
    </span>
    <button class="commit" disabled={unanswered.length > 0} onclick={commit}>Add operation</button>
  </footer>
</section>

<style>
  .panel {
    background: #ffffff;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    padding: 1rem;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  h2 {
    flex: 1;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #5a6b80;
    margin: 0;
  }

  .id {
    font-size: 0.7rem;
    color: #a0aec0;
  }

  .close {
    background: transparent;
    border: 0;
    color: #a0aec0;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0 0.2rem;
  }

  .close:hover {
    color: #c53030;
  }

  .note {
    margin: 0 0 0.75rem;
    font-size: 0.7rem;
    color: #a0aec0;
  }

  .rail {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
  }

  .rail button {
    flex: 1;
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    color: #5a6b80;
    border-radius: 4px;
    padding: 0.3rem 0.25rem;
    font: inherit;
    font-size: 0.7rem;
    cursor: pointer;
    min-width: 0;
  }

  .rail button.on {
    background: #cbd5e0;
    color: #1a202c;
    border-color: #a0aec0;
  }

  .rail em {
    display: block;
    font-style: normal;
    font-size: 0.65rem;
    color: #a0aec0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .body {
    display: grid;
    gap: 0.6rem;
  }

  footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.9rem;
    padding-top: 0.7rem;
    border-top: 1px solid #e2e8f0;
  }

  .missing {
    flex: 1;
    min-width: 0;
    font-size: 0.68rem;
    line-height: 1.4;
    color: #a0aec0;
  }

  .commit {
    background: #cbd5e0;
    border: 1px solid #a0aec0;
    color: inherit;
    border-radius: 4px;
    padding: 0.35rem 0.7rem;
    font: inherit;
    font-size: 0.78rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .commit:hover:not(:disabled) {
    background: #a0aec0;
  }

  .commit:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .prose {
    margin: 0;
    font-size: 0.78rem;
    color: #4a5568;
  }

  .prose.small {
    font-size: 0.7rem;
    color: #a0aec0;
  }

  .types {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .types button {
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    color: #4a5568;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .types button.on {
    background: #cbd5e0;
    color: #1a202c;
    border-color: #a0aec0;
  }

  .types em {
    font-style: normal;
    font-size: 0.62rem;
    color: #a0aec0;
    margin-left: 0.3rem;
  }

  code {
    font-family: ui-monospace, monospace;
    font-size: 0.85em;
    color: #2b6cb0;
  }
</style>
