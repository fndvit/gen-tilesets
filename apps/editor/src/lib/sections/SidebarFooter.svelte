<!--
  The sidebar's fixed footer, "Randomness": below the scrolling sections, never
  scrolled or collapsed. A white card on the ground, like a section.

  It holds only what decides the picture's randomness: the seed and the three
  ways to draw again. The document's actions (Undo, New, Import, Export) moved
  to the sidebar's top bar in iteration 2, so the footer no longer mixes "how
  it is drawn" with "what happens to the file", and Export no longer competes
  with the seed.

  The seed field with its re-seed button, the assets-on-load choice, then two
  labelled actions: Reroll assets and Preview a fresh load. Each wears the
  re-seed icon, the one shape that means "draw again".
-->
<script lang="ts">
  import {
    rerollAssets,
    rerollSeed,
    setDefaultSeed,
    setReseedAssetsOnLoad,
  } from "../../document.js";
  import { drawLoadSalt, loadVaries } from "../../reseed.js";
  import { session } from "../../session.svelte.js";
  import { preview } from "../preview/view.svelte.js";
  import Button from "../ui/Button.svelte";
  import Explainer from "../ui/Explainer.svelte";
  import FieldRow from "../ui/FieldRow.svelte";
  import Hint from "../ui/Hint.svelte";
  import IconButton from "../ui/IconButton.svelte";
  import Toggle from "../ui/Toggle.svelte";
  import { RANDOMNESS_EXPLAINER } from "./randomness-explainer.js";

  const config = $derived(session.file.config);

  /**
   * "How randomness works" (batch 01, T-07, B-019), wired as `OperationBody`
   * wires "How noise works". `Explainer` places itself: beside the sidebar,
   * level with the trigger and kept inside the window; above the trigger in
   * the stacked layout, since the footer is at the foot of the window.
   */
  let explaining = $state<HTMLButtonElement | undefined>(undefined);
  let explainTrigger = $state<HTMLButtonElement | undefined>(undefined);
  const seedId = $props.id();

  /** §8.5's disabled condition. */
  const varies = $derived(loadVaries(config));

  /**
   * `06` §10.4's second diagnostic (an Operation flagged over a non-random
   * Source) is a notice in the preview's stack now (`advisories.ts`
   * `inertReseed`, Stage 2 W3), not a clause in this hint.
   *
   * The disabled text names the two switches that would enable the button
   * (B-015): the reason alone left the user to find them.
   */
  const freshLoadHint = $derived(
    varies
      ? "Shows what another visitor's load looks like. Writes nothing to the file."
      : "Nothing reseeds on load, so every load looks the same. Set Assets on load to Reseed, or turn on Reseed on load in an operation.",
  );
</script>

<!-- `data-tour`: the onboarding tour's Randomness step cuts out the whole footer. -->
<div class="fixed" data-tour="footer">
  <div class="heading">
    <h2 class="title t-title">Randomness</h2>
    <IconButton
      icon="info"
      label="How randomness works"
      expanded={explaining !== undefined}
      bind:element={explainTrigger}
      onclick={() => (explaining = explaining === undefined ? explainTrigger : undefined)}
    />
  </div>
  <!--
    `09` §8.2, the seed field. **The author never sees a hash** (`02` §6.6): they
    type a string, and that is the whole interface. **There is no separate
    preview seed** (§5): this writes `config.defaultSeed`, and the component
    falls back to it (`07` §9.2), so the preview always shows what a visitor
    with no host seed sees. An empty field is in-flight input and does not
    reach the file (**E5**).
  -->
  <FieldRow label="Seed" for={seedId} hint="Every operation's picture follows from it.">
    {#snippet children(describedBy)}
      <span class="seed">
        <input
          id={seedId}
          class="t-value"
          aria-describedby={describedBy}
          type="text"
          spellcheck="false"
          value={config.defaultSeed}
          oninput={(e) => session.apply(setDefaultSeed(e.currentTarget.value))}
        />
        <IconButton icon="reseed" strong label="New seed" onclick={() => session.apply(rerollSeed())} />
      </span>
    {/snippet}
  </FieldRow>

  <FieldRow label="Assets on load" align="center" hint="Whether each page load picks the variants again.">
    {#snippet children()}
      <Toggle
        label="Assets on load"
        options={[
          { value: false, label: "Fixed" },
          { value: true, label: "Reseed" },
        ]}
        value={config.reseedAssetsOnLoad === true}
        onChange={(on) => session.apply(setReseedAssetsOnLoad(on))}
      />
    {/snippet}
  </FieldRow>

  <div class="actions">
    <!--
      §8.4, the asset reroll. `02` §6.4: it rerolls which variant each cell
      shows **without disturbing any Operation**, because the asset channel is
      separate. Every `tileId` stays where it is.
    -->
    <Hint text="Rerolls which variant each cell shows. No operation moves.">
      {#snippet children(hintId)}
        <Button
          label="Reroll assets"
          icon="reseed"
          wide
          describedby={hintId}
          onclick={() => session.apply(rerollAssets())}
        />
      {/snippet}
    </Hint>
    <!--
      §8.5, the load preview. It **writes no field** (§8.1's fourth row): the
      value is held in App and reaches `<Tileset>` through its `options`.
      **Disabled where nothing is flagged**: `04` §8.3 makes such a config
      identical on every load regardless of `loadSalt`, and "an enabled button
      that provably changes nothing is `05` §6.1's complaint arriving one level
      out". **R12**: one value per session, moved only by this button.
    -->
    <Hint text={freshLoadHint}>
      {#snippet children(hintId)}
        <Button
          label="Preview a fresh load"
          icon="reseed"
          wide
          describedby={hintId}
          disabled={!varies}
          onclick={() => (preview.loadSalt = drawLoadSalt())}
        />
      {/snippet}
    </Hint>
  </div>
</div>

{#if explaining !== undefined}
  <Explainer
    anchor={explaining}
    content={RANDOMNESS_EXPLAINER}
    onClose={(refocus) => {
      const trigger = explaining;
      explaining = undefined;
      if (refocus) trigger?.focus();
    }}
  />
{/if}

<style>
  .fixed {
    /* Hints open upward: below the footer is the edge of the screen. */
    --hint-top: auto;
    --hint-bottom: calc(100% + var(--space-2));

    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
    margin: 0 var(--space-4) var(--space-4);
    padding: var(--space-6) var(--space-7) var(--space-7);
    border-radius: var(--radius);
    background: var(--color-card);
    color: var(--color-ink);
  }

  /* The title, and its (i) at the right end, as a section header holds its controls. */
  .heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    /* The 28px button would push the card taller than the title; pull it back into the padding. */
    margin: calc(-1 * var(--space-2)) calc(-1 * var(--space-3)) 0 0;
  }

  .title {
    margin: 0;
  }

  /* The field gives way before the row grows past a narrow sidebar (WCAG 1.4.10). */
  .seed {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  /* The numeric fields' filled box, in a face that keeps case: a seed is case-sensitive. */
  input {
    box-sizing: border-box;
    flex: 1;
    width: 100%;
    min-width: 0;
    height: var(--control-h);
    padding: 0 var(--space-4);
    border: 0;
    border-radius: var(--radius-sm);
    background: var(--color-field);
    box-shadow: inset 0 calc(-1 * var(--rule-w)) 0 var(--color-edge);
    color: var(--color-ink);
    line-height: normal;
    text-box: none;
    transition: background-color var(--dur-fast) var(--ease);
  }

  input:hover {
    background: var(--color-field-hover);
  }

  input:focus-visible {
    outline-offset: 0;
  }

  /* Two equal actions; one per row in a narrow sidebar (WCAG 1.4.10). */
  .actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .actions > :global(*) {
    display: flex;
  }
</style>
