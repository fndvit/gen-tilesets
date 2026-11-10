<!--
  A header that shows and hides what follows it: a sidebar section, or a
  nested group inside one (a breakpoint rule, a tile group).

  The title first, then (while closed) a muted one-line `summary` of what is
  inside, then optional `extras` (a tile group's thumbnails), the `actions`
  (trash, reorder) and the chevron at the right end. The chevron points down
  when closed and up when open. Everything right of the title sits inside the
  panel's padding, clear of `ScrollArea`'s overlay handle.

  **Surface says what level it is.** `variant="section"` is a section: a white
  card on the grey sidebar ground, open or closed, so a folded section keeps
  its presence (iteration 2). Its header is `--header-h` tall, the title in the
  section style over a mono one-line summary of what is inside; open, an ink
  rule under the header separates it from the body. `variant="group"` is a
  nested group: a faint grey well inside its section's card, with the summary
  on the title's line.

  For a tile group the header also edits: `onRename` makes the title an
  `InlineEdit` (click to rename), and the chevron is then a button of its own
  at the right end. The empty space between title and actions toggles too,
  for the pointer, so clicking anywhere but the title or an action opens and
  closes it. `note` is text shown after the title but not edited with it (a
  duplicate name's ` (t3)`), and `hint` explains the title on hover
  (`ui/Hint`).

  An open section's header sticks to the top of the scroller while its body
  scrolls under it (see the style below). Groups do not stick. Opened from
  its own header, a collapsible scrolls its scroller, once the slide ends,
  until its bottom shows, but never past its own top (`reveal.ts`), over
  `--dur-slow`. Closing near the scroller's bottom scrolls up with the fold,
  on its clock, so the browser never clamps the scroll (B-028, `closeDrop`).

  Hover washes the whole header one step darker; the chevron turns ink. The
  body slides open over `--dur-fast` and shut over `--dur-close` with `--ease`,
  and appears and goes at once under reduced motion. Its padding belongs to the caller (Section, TileGroup).

  **Open state is transient.** It is bindable so a caller can open a group it
  just created, but it is never written to the file (`09` §12, **E4**), the same
  rule `Section.svelte` follows.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { slide } from "svelte/transition";
  import Hint from "./Hint.svelte";
  import Icon from "./Icon.svelte";
  import InlineEdit from "./InlineEdit.svelte";
  import { motionDuration } from "./motion.js";
  import { closeDrop, cssEase, revealOpened, scrollParent, tweenScroll } from "./reveal.js";

  interface Props {
    title: string;
    open?: boolean;
    variant?: "section" | "group";
    /** Heading level of the header, so the sidebar keeps a real outline. */
    level?: 2 | 3 | 4;
    /** Makes the title editable on click. Receives the trimmed, changed name. */
    onRename?: (title: string) => void;
    /** Shown after the title and never edited with it. */
    note?: string | undefined;
    /** Explanation shown on hovering the title. */
    hint?: string | undefined;
    /** One muted line shown after the title while closed: what is inside, from existing values. */
    summary?: string | undefined;
    /** Controls at the right end, before the chevron (trash, reorder). Outside the disclosure button. */
    actions?: Snippet | undefined;
    /** Decorative content after the title. It sits inside the button, so nothing in it may be interactive. */
    extras?: Snippet | undefined;
    /** `data-tour` on the whole card, for the onboarding tour to find it (`Section.svelte` says why). */
    tour?: string | undefined;
    /** `data-tour` on the header alone. */
    tourHeading?: string | undefined;
    children: Snippet;
  }

  let {
    title,
    open = $bindable(true),
    variant = "section",
    level = variant === "section" ? 2 : 3,
    onRename,
    note,
    hint,
    summary,
    actions,
    extras,
    tour,
    tourHeading,
    children,
  }: Props = $props();

  const bodyId = $props.id();
  const textClass = $derived(variant === "section" ? "t-section" : "t-title");
  const summaryClass = $derived(variant === "section" ? "t-console" : "t-body");

  let root: HTMLElement | undefined = $state();
  let body: HTMLElement | undefined = $state();

  /**
   * Set when the user opens this from its own header, cleared when the body
   * has slid open and been revealed.
   *
   * Only the user's own toggle reveals. An open from outside (`Section`'s
   * `reveal` and "+", `opening.open` in `OperationsSection`) comes with its
   * caller's own scrolling, and the two would fight: `OperationsSection`
   * scrolls the opened card into view, and revealing the whole section after
   * it would move that card away again.
   */
  let revealing = false;

  function toggle(): void {
    if (open) leadClose();
    open = !open;
    revealing = open;
  }

  /**
   * Before the body goes: start scrolling up by as much as its removal would
   * clamp the scroll, over the fold's duration and curve (`closeDrop` says why
   * that never clamps). Started before `open` changes, so the scroll's clock
   * is never behind the fold's. Only the user's own toggle calls it, like the
   * reveal; a close set from outside through `bind:open` folds unled.
   */
  function leadClose(): void {
    if (!root || !body) return;
    const scroller = scrollParent(root) as HTMLElement | null;
    if (!scroller) return;
    const drop = closeDrop(scroller, body.getBoundingClientRect().height);
    if (drop > 0) tweenScroll(scroller, -drop, motionDuration(root, "--dur-close"), cssEase(root));
  }

  /**
   * After the slide, not at `tick()`: during it the body is still short, so
   * its final bottom is not known yet (T-09).
   */
  function afterOpen(): void {
    if (!revealing || !root) return;
    revealing = false;
    revealOpened(root);
  }

  /**
   * Opening keeps `slide`'s own curve over `--dur-fast`, as before T-05.
   * Closing runs over `--dur-close` on `--ease`, the duration and curve
   * `leadClose` scrolls with: the two must match frame for frame, or the
   * fold outruns the scroll and the browser clamps it again.
   *
   * Which way is read from `open`, not from the transition's `direction`: a
   * `transition:` is told "both" either way, and `in:`/`out:` instead would
   * not reverse, so a quick reopen would show the closing body and the new
   * one together. Svelte asks for a fresh config each time a fold starts, and
   * reuses the running one when it reverses mid-way, which is what we want.
   */
  function fold(node: HTMLElement) {
    if (!root) return slide(node, { duration: 0 });
    if (!open) return slide(node, { duration: motionDuration(root, "--dur-close"), easing: cssEase(root) });
    return slide(node, { duration: motionDuration(root) });
  }
</script>

<div class="collapsible {variant}" class:open bind:this={root} data-tour={tour}>
  <!--
    The heading wraps the controls, not the other way round: the heading stays a
    heading for the outline, and the button carries the disclosure semantics.
  -->
  <svelte:element this={`h${level}`} class="heading" data-tour={tourHeading}>
    <div class="bar">
      {#if onRename}
        <Hint text={hint}>
          {#snippet children(hintId)}
            <span class="named">
              <InlineEdit
                value={title}
                label="Rename {title}"
                onCommit={onRename}
                {textClass}
                describedby={hintId}
              />
              {#if note}<span class="note {textClass}">{note}</span>{/if}
            </span>
          {/snippet}
        </Hint>
        <!--
          The rest of the header toggles for the pointer only; the chevron button
          is the control for the keyboard and for assistive technology.
        -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span class="fill" onclick={toggle}>
          {#if !open && summary}<span class="summary t-body">{summary}</span>{/if}
          {#if extras}<span class="extras">{@render extras()}</span>{/if}
        </span>
        {#if actions}<span class="actions">{@render actions()}</span>{/if}
        <button
          type="button"
          class="chev-button"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label="{open ? 'Collapse' : 'Expand'} {title}"
          onclick={toggle}
        >
          <span class="chev" class:open><Icon name="fold" /></span>
        </button>
      {:else}
        <button
          type="button"
          class="toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onclick={toggle}
        >
          <span class="text">
            <span class="title {textClass}">{title}{#if note}&nbsp;{note}{/if}</span>
            {#if !open && summary}<span class="summary {summaryClass}">{summary}</span>{/if}
          </span>
          {#if extras}<span class="extras">{@render extras()}</span>{/if}
          {#if !actions}<span class="chev" class:open><Icon name="fold" /></span>{/if}
        </button>
        {#if actions}
          <span class="actions">{@render actions()}</span>
          <!--
            With actions, the chevron sits after them at the right end, like every
            other header's. It toggles for the pointer; the title button is the
            disclosure control for the keyboard.
          -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span class="chev end" class:open onclick={toggle}><Icon name="fold" /></span>
        {/if}
      {/if}
    </div>
  </svelte:element>

  {#if open}
    <div id={bodyId} bind:this={body} transition:fold onintroend={afterOpen}>
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .collapsible {
    border-radius: var(--radius);
    transition: background-color var(--dur-fast) var(--ease);
  }

  /* A section is a white card on the ground, open or closed. */
  .section {
    background: var(--color-card);
  }

  /* A nested group is a well inside its section's panel, open or closed. */
  .group {
    background: var(--color-well);
  }

  .heading {
    margin: 0;
    font: inherit;
  }

  /*
    A section's header sticks to the top of the sidebar's scroller while its
    own body scrolls under it (B-002), so the open section's title and its "+"
    stay in reach. It sticks within its own card only: a sticky element never
    leaves its containing block, so the next section's header pushes it away
    rather than stacking under it (stacking would be a behaviour choice, batch
    01 T-08).

    It needs the card's background, or the body would show through. `z-index:
    2` keeps the body's own raised parts (palette rows and tile assets at 1)
    under it, and stays below `ScrollArea`'s handle (3), which must always draw
    on top. Menus, the explainer and the tile picker are `position: fixed` at
    20 and still open over it. Groups do not stick: they are short, and a
    second stuck header would cover the section's.

    The radius is the card's, so a header that is not stuck does not poke
    square corners out over the ground; open, only its top corners are round.
  */
  .section > .heading {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--color-card);
    border-radius: var(--radius);
  }

  .section.open > .heading {
    border-radius: var(--radius) var(--radius) 0 0;
  }

  /*
    Whatever the browser scrolls into view inside a section's body (focus by
    Shift+Tab, `OperationsSection`'s `scrollIntoView` of an opened card) stops
    below the stuck header instead of under it. Without this, Shift+Tab back up
    a scrolled section put the focused field wholly behind the header (WCAG
    2.2 2.4.11, Focus Not Obscured). On the descendants, not as
    `scroll-padding-top` on `ScrollArea`'s viewport: that is shared by every
    scroller, and only a section's header sticks.
  */
  .section > div :global(*) {
    scroll-margin-top: var(--header-h);
  }

  .bar {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    border-radius: var(--radius);
    color: var(--color-ink);
    transition: background-color var(--dur-fast) var(--ease);
  }

  .section > .heading .bar {
    min-height: var(--header-h);
    padding: 0 var(--space-5) 0 var(--space-7);
  }

  /* Open: an ink rule under the header, the card's one line. */
  .section.open > .heading .bar {
    box-shadow: inset 0 calc(-1 * var(--rule-strong)) 0 var(--color-ink);
  }

  .group > .heading .bar {
    min-height: var(--group-h);
    padding: 0 var(--space-2) 0 var(--space-5);
  }

  /*
    Hover washes the whole header, whichever part of it is under the pointer,
    except the actions, which answer on their own.
  */
  .bar:has(.toggle:hover, .fill:hover, .chev-button:hover, .chev.end:hover) {
    background: var(--color-hover);
  }

  .bar:has(.toggle:active, .fill:active, .chev-button:active, .chev.end:active) {
    background: var(--color-pressed);
  }

  /* An open section's header is part of its card: the wash keeps only the top corners round. */
  .section.open > .heading .bar {
    border-radius: var(--radius) var(--radius) 0 0;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex: none;
  }

  .named {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .note {
    flex: none;
    white-space: nowrap;
    color: var(--color-muted);
  }

  .toggle,
  .chev-button {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .toggle {
    flex: 1;
    min-width: 0;
    align-self: stretch;
  }

  .toggle:focus-visible,
  .chev-button:focus-visible {
    outline-offset: calc(-1 * var(--focus-w));
    border-radius: var(--radius-sm);
  }

  .chev-button {
    flex: none;
  }

  /* The chevron gets an icon button's square; the icon is muted until the header is hovered. */
  .chev {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--icon-button);
    height: var(--icon-button);
    border-radius: var(--radius-sm);
    margin-left: auto;
    color: var(--color-muted);
    transition:
      transform var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .chev.end {
    margin-left: 0;
    cursor: pointer;
  }

  .bar:hover .chev {
    color: var(--color-ink);
  }

  /* A section's chevron sits in a square of its own, so the fold reads as a control. */
  .section > .heading .chev {
    background: var(--color-field);
  }

  .section > .heading .bar:hover .chev {
    background: var(--color-field-hover);
  }

  .chev.open {
    transform: rotate(180deg);
  }

  /*
    Untrimmed, with a real line height: `overflow: hidden` (for the ellipsis)
    on a box trimmed to cap height cut off whatever rises above it.
  */
  .title,
  .note,
  .summary {
    line-height: var(--leading-title);
    text-box: none;
  }

  /* Title and summary: stacked in a section, on one line in a group. */
  .text {
    display: flex;
    flex: 1 1 0;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
  }

  .section > .heading .text {
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: var(--space-1);
  }

  .title {
    flex: none;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* What a closed group holds, quiet and on one line, after its title. */
  .summary {
    flex: 1 1 0;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    color: var(--color-muted);
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* A closed section's summary: mono, under its title, as long as the card allows. */
  .section > .heading .summary {
    flex: none;
    text-align: left;
  }

  /* After the title: the empty header (it toggles) with the extras at its right. */
  .fill {
    display: flex;
    flex: 1;
    align-self: stretch;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-4);
    min-width: 0;
    cursor: pointer;
  }

  .extras {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: auto;
  }
</style>
