<!--
  The onboarding tour (B-017) — DESIGN_SYSTEM.md § "Onboarding: the tour".

  It draws `tour.ts`'s model: a Welcome card, then one bubble per step,
  pointing at a part of the editor through a hole in a dark scrim. It only
  points: Next always works, and nothing the user does in the editor is
  needed to go on.

  **A native modal `<dialog>` covering the window** (O2), holding the scrim,
  the rings and the bubble. The top layer puts it over every popover with no
  z-index of its own, and `showModal()` makes the editor behind it inert,
  the cut-out included: the target is seen, not used. Esc is the dialog's own
  `cancel`, turned into Skip tour. A press on the scrim does nothing, so a
  stray click doesn't end the tour.

  **The holes are `<rect>`s in an SVG mask**, positioned in CSS so they move
  to the next target with the bubble (`tour-layout.ts` says what was
  rejected). Each has a 2px ink ring with a 2px white halo outside it: ink,
  not the accent, which is focus's, and Next has focus while the ring shows
  (Pol, O1).

  **On each step**, in order: set how much of the file the preview draws
  (`tour-preview.svelte.ts`; all of it off the build); close the card the tour
  opened if this step opens none or another; open the step's card at its
  stage, or move the open one to it, then wait out a fresh card's slide; find
  the targets by `data-tour` (`Section.svelte` says why), with the step's
  fallback, or its `alone` target where they can't share the window
  (`oneWindow`); scroll the first into view in its scroller and then the page;
  measure and place; focus the primary button; announce the step. A resize, or
  a target that changes size, measures again. Every scroll is instant: the
  hole and the bubble are what move, and measuring after a smooth scroll would
  have to guess when it ends.

  The geometry is `tour-layout.ts`, tested; this file only measures.
-->
<script lang="ts">
  import { tick, untrack } from "svelte";
  import { drafting } from "../drafting.svelte.js";
  import { opening } from "../opening.svelte.js";
  import { session } from "../session.svelte.js";
  import { tourPreview } from "../tour-preview.svelte.js";
  import { clip, cutout, oneWindow, placeBubble, resolveTargets, scrollDelta, type Box, type BubblePlacement } from "../tour-layout.js";
  import {
    back,
    count,
    current,
    end,
    mosaicOperations,
    next,
    plain,
    primaryLabel,
    runFor,
    seenStore,
    showsSkip,
    showsSkipOperations,
    skipOperations,
    spans,
    type Span,
    start,
    type TargetKey,
    type TourRun,
    type TourState,
  } from "../tour.js";
  import Button from "./ui/Button.svelte";
  import Icon from "./ui/Icon.svelte";
  import { motionDuration } from "./ui/motion.js";
  import { scrollParent } from "./ui/reveal.js";

  interface Props {
    run: TourRun;
    /** After the dialog has closed. */
    onEnd: () => void;
    /**
     * Where focus goes when the tour ends: "?" after a replay (O3c). Absent
     * after a first-visit tour, which no button opened, so focus goes to the
     * sidebar's first section header (O2).
     */
    returnFocus?: HTMLElement | undefined;
  }

  let { run, onEnd, returnFocus }: Props = $props();

  // A tour starts once, from the run it was mounted with: a first visit with no
  // Mosaic to rebuild runs as a replay (`runFor`).
  // svelte-ignore state_referenced_locally
  let tour = $state<TourState>(start(runFor(run, session.file.config.operations)));
  const step = $derived(current(tour));
  const welcome = $derived(tour.index === 0);

  let dialog = $state<HTMLDialogElement | undefined>(undefined);
  let bubble = $state<HTMLElement | undefined>(undefined);
  let primary = $state<HTMLButtonElement | undefined>(undefined);
  let viewport = $state({ width: 0, height: 0 });
  let holes = $state<Box[]>([]);
  let place = $state<BubblePlacement | null>(null);
  /** Off for the first placement after Welcome, so the bubble doesn't glide in from the centre. */
  let glide = $state(false);
  let announcement = $state("");

  const ids = $props.id();

  /** The card the tour opened, so it closes only what it opened. */
  let opened: string | null = null;
  /** Bumped on each step, so a step still waiting out a slide can't place over the next one. */
  let generation = 0;
  let targets: HTMLElement[] = [];
  let observer: ResizeObserver | undefined;

  /** A length token in px, read from the dialog so the rules and the CSS share one number. */
  const px = (token: string): number => (dialog ? parseFloat(getComputedStyle(dialog).getPropertyValue(token)) || 0 : 0);

  /** The element carrying `data-tour="key"`, if it is there and drawn. */
  function find(key: TargetKey): HTMLElement | undefined {
    const el = document.querySelector<HTMLElement>(`[data-tour="${key}"]`);
    return el !== null && el.getClientRects().length > 0 ? el : undefined;
  }

  /**
   * How much of the scroller's top an enclosing section's sticky header
   * covers, as `Collapsible`'s `stuckAbove` works it out. Nothing for the
   * section itself or for a part of its header (the "+").
   */
  function stuckOver(el: HTMLElement): number {
    const section = el.closest(".collapsible.section");
    const heading = section?.querySelector(":scope > .heading");
    if (!section || section === el || !heading || heading.contains(el)) return 0;
    return heading.getBoundingClientRect().height;
  }

  /**
   * Into view in its own scroller (the sidebar's), then in the page: below
   * 40rem the layout is stacked and the page scrolls too, and the preview is
   * a window's height down.
   */
  function reveal(el: HTMLElement): void {
    const scroller = scrollParent(el) as HTMLElement | null;
    if (scroller) {
      const delta = scrollDelta(visibleIn(el), el.getBoundingClientRect(), stuckOver(el));
      if (delta !== 0) scroller.scrollBy({ top: delta, behavior: "instant" });
    }
    // Its visible part in its scroller: a card taller than the sidebar would otherwise scroll the top
    // bar off the page. Not with no scroller, where `visibleIn` is the window: clipped to the window,
    // a target past it collapses onto the window's edge, and the page never brings it in (step 6's
    // picture, stacked, and then New above it on the last step; O4).
    // Room for the cut-out's pad and the ring with its halo (`ring(hole, 3)`, a 2px stroke), so a
    // target brought in from above or below isn't ringed off the window's edge.
    const room = px("--space-2") + 4;
    const box = el.getBoundingClientRect();
    const delta = scrollDelta({ top: room, bottom: window.innerHeight - room }, scroller ? clip(box, visibleIn(el)) : box);
    if (delta !== 0) window.scrollBy({ top: delta, behavior: "instant" });
  }

  /** The visible box of the target's scroller, or the window when it has none. */
  function visibleIn(el: HTMLElement): Box {
    const scroller = scrollParent(el) as HTMLElement | null;
    if (!scroller) return { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth };
    const box = scroller.getBoundingClientRect();
    const top = box.top + scroller.clientTop;
    const left = box.left + scroller.clientLeft;
    return { top, left, bottom: top + scroller.clientHeight, right: left + scroller.clientWidth };
  }

  function measure(): void {
    if (!dialog || !bubble) return;
    viewport = { width: dialog.clientWidth, height: dialog.clientHeight };
    const pad = px("--space-2");
    holes = targets.map((t) => cutout(clip(t.getBoundingClientRect(), visibleIn(t)), pad));
    if (welcome) {
      place = null;
      return;
    }
    const el = bubble;
    place = placeBubble({
      viewport,
      sidebar: document.querySelector("aside")?.getBoundingClientRect() ?? { top: 0, bottom: 0, left: 0, right: 0 },
      holes,
      width: px("--tour-bubble-w"),
      margin: px("--space-4"),
      gutter: px("--space-7"),
      // Only when both were found: on its fallback, a build step points at the "+" like any step.
      inSidebar: step.build === true && holes.length > 1,
      heightAt: (w) => {
        el.style.width = `${w}px`;
        return el.offsetHeight;
      },
    });
  }

  /** Closes the card the tour opened, unsaved: the tour never edits the file or leaves a draft. */
  function closeOpened(): void {
    if (opened === null) return;
    opened = null;
    drafting.discard();
  }

  async function show(state: TourState): Promise<void> {
    const mine = ++generation;
    const now = current(state);
    tourPreview.kept = now.ops ?? null;
    const mosaic = mosaicOperations(session.file.config.operations);
    const want = now.open !== undefined && mosaic !== null ? mosaic[now.open.op] : null;
    if (want === null || want !== opened) closeOpened();
    let wait = 0;
    if (want !== null && now.open !== undefined) {
      const fresh = opened === null;
      // What pressing the card's stepper does; on a fresh card, its title. On a first visit no
      // draft is open, so the guard never asks.
      opening.open(want, now.open.stage);
      opened = drafting.editing && drafting.draft?.id === want ? want : null;
      // Only a fresh card slides open; a change of stage swaps the body, and the observer re-measures.
      if (fresh && opened !== null && dialog) wait = motionDuration(dialog);
    }
    await tick();
    // The card's body slides open; the reveal needs its final height.
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait + 20));
    if (mine !== generation) return;

    targets = resolveTargets(now, find);
    // Revealed before `oneWindow` measures: a target scrolled out of its scroller (step 5's
    // Operations "+", below the open Tiles) clips to nothing and would read as out of the window.
    if (targets[0]) reveal(targets[0]);
    const view = { width: window.innerWidth, height: window.innerHeight };
    const seen = targets.map((t) => clip(t.getBoundingClientRect(), visibleIn(t)));
    if (now.alone !== undefined && !oneWindow(seen, view)) {
      const alone = find(now.alone);
      if (alone) {
        targets = [alone];
        reveal(alone);
      }
    }
    observer?.disconnect();
    observer = new ResizeObserver(() => measure());
    for (const t of targets) observer.observe(t);

    if (state.index === 0) glide = false;
    measure();
    if (state.index > 0) requestAnimationFrame(() => (glide = true));
    primary?.focus();
    // The dialog's name and description announce the first step; later ones need the live region,
    // because focus landing on the same Next again says nothing new.
    if (mine > 1) {
      const head = state.index === 0 ? now.title : `${now.title}, ${count(state)}`;
      announcement = `${head}. ${plain(now)}`;
    }
  }

  function forward(): void {
    const after = next(tour);
    if (after === null) finish();
    else tour = after;
  }

  /** Done, Skip tour and Esc alike: each sets the seen flag (`tour.ts` `end`). */
  function finish(): void {
    generation++;
    closeOpened();
    tourPreview.kept = null;
    observer?.disconnect();
    end(seenStore());
    dialog?.close();
    const to = returnFocus ?? document.querySelector<HTMLElement>('[data-tour="grid"] button');
    to?.focus();
    onEnd();
  }

  function oncancel(event: Event): void {
    event.preventDefault();
    finish();
  }

  $effect(() => {
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      observer?.disconnect();
      // However the tour goes away, the preview draws the whole file again.
      tourPreview.kept = null;
    };
  });

  // Only `tour` drives a step. Untracked, because `show` reads the file and the
  // draft, and opening the card changes the draft.
  $effect(() => {
    const state = tour;
    untrack(() => void show(state));
  });

  const ring = (h: Box, grow: number) => ({
    x: `${h.left - grow}px`,
    y: `${h.top - grow}px`,
    width: `${h.right - h.left + 2 * grow}px`,
    height: `${h.bottom - h.top + 2 * grow}px`,
  });
</script>

<!-- One span of a paragraph: a bold term, the (i) buttons' icon (`INFO` in `tour.ts`), or text. -->
{#snippet drawn(span: Span)}{#if span.icon}<span class="inline-icon"><Icon name={span.icon} label={span.text} /></span>{:else if span.strong}<strong>{span.text}</strong>{:else}{span.text}{/if}{/snippet}

<svelte:window onresize={measure} />

<dialog
  bind:this={dialog}
  class="tour theme-default"
  aria-labelledby={welcome ? `${ids}-title` : `${ids}-title ${ids}-count`}
  aria-describedby="{ids}-text"
  {oncancel}
>
  <!--
    A press on the scrim does nothing, and keeps focus where it was: without
    `preventDefault` on `mousedown` it moved focus off Next to the dialog, and
    Enter stopped working until Tab brought it back.
  -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg
    class="scrim"
    width={viewport.width}
    height={viewport.height}
    aria-hidden="true"
    onmousedown={(event) => event.preventDefault()}
  >
    <defs>
      <mask id="{ids}-holes">
        <rect width="100%" height="100%" fill="white" />
        {#each holes as hole, i (i)}
          {@const r = ring(hole, 0)}
          <rect class="hole" class:glide rx="8" fill="black" style:x={r.x} style:y={r.y} style:width={r.width} style:height={r.height} />
        {/each}
      </mask>
    </defs>
    <rect class="shade" width="100%" height="100%" mask="url(#{ids}-holes)" />
    {#each holes as hole, i (i)}
      <!-- Centred on the line, so 1px out puts the 2px ink ring just outside the hole, and the halo outside that. -->
      {@const halo = ring(hole, 3)}
      {@const ink = ring(hole, 1)}
      <rect class="hole halo" class:glide rx="11" style:x={halo.x} style:y={halo.y} style:width={halo.width} style:height={halo.height} />
      <rect class="hole ink" class:glide rx="9" style:x={ink.x} style:y={ink.y} style:width={ink.width} style:height={ink.height} />
    {/each}
  </svg>

  <div
    class="bubble"
    class:welcome
    class:glide
    bind:this={bubble}
    style:top={place ? `${place.top}px` : undefined}
    style:left={place ? `${place.left}px` : undefined}
    style:width={place ? `${place.width}px` : undefined}
  >
    {#if welcome}
      <h2 class="t-section" id="{ids}-title">{step.title}</h2>
    {:else}
      <div class="head">
        <h2 class="t-section" id="{ids}-title">{step.title}</h2>
        <span class="count t-console" id="{ids}-count">{count(tour)}</span>
      </div>
    {/if}
    <div class="text" id="{ids}-text">
      {#each step.text as paragraph, i (i)}
        <p>
          {#each spans(paragraph) as span, j (j)}{@render drawn(span)}{/each}
        </p>
      {/each}
      {#if step.aside !== undefined}
        <p class="aside">{#each spans(step.aside) as span, j (j)}{@render drawn(span)}{/each}</p>
      {/if}
    </div>
    <div class="foot">
      {#if showsSkip(tour) || showsSkipOperations(tour)}
        <span class="skips">
          {#if showsSkip(tour)}
            <Button label="Skip tour" variant={welcome ? "secondary" : "tertiary"} onclick={finish} />
          {/if}
          <!-- Steps 5 to 11 rebuild Mosaic; this goes on to Breakpoints (Pol, 2026-11-12). -->
          {#if showsSkipOperations(tour)}
            <Button label="Skip operations" variant="tertiary" onclick={() => (tour = skipOperations(tour))} />
          {/if}
        </span>
      {/if}
      <span class="go">
        {#if !welcome}
          <Button label="Back" variant="secondary" onclick={() => (tour = back(tour))} />
        {/if}
        <Button label={primaryLabel(tour)} variant="primary" bind:element={primary} onclick={forward} />
      </span>
    </div>
    <p class="sr" aria-live="polite">{announcement}</p>
  </div>
</dialog>

<style>
  /* The whole window, with no look of its own: the scrim and the bubble are its parts. */
  .tour {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
    border: 0;
    background: transparent;
    color: var(--color-ink);
  }

  .tour::backdrop {
    background: transparent;
  }

  .scrim {
    position: absolute;
    inset: 0;
  }

  .shade {
    fill: var(--color-scrim);
  }

  .hole.glide {
    transition-property: x, y, width, height;
    transition-duration: var(--dur-fast);
    transition-timing-function: var(--ease);
  }

  .halo,
  .ink {
    fill: none;
    stroke-width: var(--rule-strong);
  }

  .halo {
    stroke: var(--color-paper);
  }

  .ink {
    stroke: var(--color-ink);
  }

  .bubble {
    position: absolute;
    box-sizing: border-box;
    display: grid;
    gap: var(--space-7);
    max-height: calc(100% - 2 * var(--space-4));
    overflow-y: auto;
    padding: var(--tour-pad);
    border-radius: var(--radius-lg);
    background: var(--color-panel);
    box-shadow: var(--shadow-float);
  }

  .bubble.glide {
    transition:
      top var(--dur-fast) var(--ease),
      left var(--dur-fast) var(--ease);
  }

  /* The cover: centred and wider. */
  .bubble.welcome {
    top: 50%;
    left: 50%;
    width: min(var(--tour-welcome-w), calc(100% - 2 * var(--space-7)));
    transform: translate(-50%, -50%);
  }

  @media (max-width: 40rem) {
    .bubble.welcome {
      width: calc(100% - 2 * var(--space-7));
    }
  }

  h2 {
    margin: 0;
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4);
  }

  /* Ink, not muted: no text in the tour is grey (Pol, 2026-11-10). */
  .count {
    flex: none;
    color: var(--color-ink);
  }

  /*
    A step larger than `.t-body` and roomier (tokens.css says why). Not a
    `.t-*` class: the tour is the one place that reads as prose.
  */
  .text {
    display: grid;
    gap: var(--space-6);
    font-family: var(--font-ui);
    font-size: var(--text-tour-size);
    font-weight: var(--weight-regular);
    line-height: var(--leading-tour);
  }

  p {
    margin: 0;
    text-box: none;
  }

  strong {
    font-weight: var(--weight-semibold);
  }

  /* The (i) buttons' icon in a line of text: sits on the line like a capital, no extra leading. */
  .inline-icon {
    display: inline-flex;
    vertical-align: -0.2em;
  }

  .aside {
    color: var(--color-ink);
  }

  /*
    Skip tour at the left, Back and the primary at the right; on Welcome, both at the right.
    On the build steps Skip operations follows Skip tour, and where the four don't fit one line
    the footer wraps: `.go` keeps `margin-left: auto`, so Back and Next stay bottom-right.
  */
  .foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .skips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  .welcome .foot {
    justify-content: flex-end;
  }

  .welcome .go {
    margin-left: 0;
  }

  .go {
    display: flex;
    gap: var(--space-4);
    margin-left: auto;
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
