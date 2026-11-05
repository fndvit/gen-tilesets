<!--
  A header row that shows and hides what follows it: a sidebar section, or a
  nested group (a breakpoint rule, a tile group).

  Inspector anatomy: a disclosure triangle, the title, then whatever the row
  carries at its right: a read-only `summary` of the collapsed contents, the
  `extras` (a tile group's thumbnails), and the `actions` (add, delete,
  reorder), which live in the header instead of in bars of their own. The
  triangle points right when closed and down when open. Actions sit at the
  right end with a margin that keeps them clear of `ScrollArea`'s handle.

  For a tile group the row also edits: `onRename` makes the title an
  `InlineEdit` (click to rename). Actions sit outside the disclosure button.
  The triangle is then a button of its own, and the empty space after the
  title toggles too, so clicking anywhere but the title or an action still
  opens and closes it. `note` is text shown after the title but not edited
  with it (a duplicate name's ` (t3)`), and `hint` explains the title on hover
  (`ui/Hint`).

  `variant` picks the level: `section` is a 32px row in 13 semibold, sticky at
  the top of the sidebar while its body scrolls under it; `group` a 28px row
  in 13 medium, one indent in. Neither has a fill: hover tints the row, and
  the body is rendered bare, its indent and spacing the caller's.

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

  interface Props {
    title: string;
    open?: boolean;
    variant?: "section" | "group";
    /** Heading level of the bar, so the sidebar keeps a real outline. */
    level?: 2 | 3 | 4;
    /** Makes the title editable on click. Receives the trimmed, changed name. */
    onRename?: (title: string) => void;
    /** Shown after the title and never edited with it. */
    note?: string | undefined;
    /** Explanation shown on hovering the title. */
    hint?: string | undefined;
    /** Controls before the title (the trash button). Outside the disclosure button. */
    actions?: Snippet | undefined;
    /** Decorative content at the row's right. It sits inside the button, so nothing in it may be interactive. */
    extras?: Snippet | undefined;
    /** A read-only line of what is inside, shown while closed. */
    summary?: string | undefined;
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
    actions,
    extras,
    summary,
    children,
  }: Props = $props();

  const bodyId = $props.id();
  const textClass = $derived(variant === "section" ? "t-section" : "t-body");

  let root: HTMLElement | undefined = $state();

  function toggle(): void {
    open = !open;
  }

  function fold(node: HTMLElement) {
    return slide(node, { duration: root ? motionDuration(root) : 0 });
  }
</script>

<div class="collapsible {variant}" bind:this={root}>
  <!--
    The heading wraps the controls, not the other way round: the heading stays a
    heading for the outline, and the button carries the disclosure semantics.
  -->
  <svelte:element this={`h${level}`} class="heading">
    <div class="bar">
      {#if onRename}
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
          The rest of the bar toggles for the pointer only; the chevron button is
          the control for the keyboard and for assistive technology.
        -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span class="fill" onclick={toggle}>
          {#if extras}<span class="extras">{@render extras()}</span>{/if}
          {#if summary && !open}<span class="summary t-label">{summary}</span>{/if}
        </span>
      {:else}
        <button
          type="button"
          class="toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onclick={toggle}
        >
          <span class="chev" class:open><Icon name="fold" /></span>
          <span class="title {textClass}">{title}{#if note}&nbsp;{note}{/if}</span>
          {#if extras}<span class="extras">{@render extras()}</span>{/if}
          {#if summary && !open}<span class="summary t-label">{summary}</span>{/if}
        </button>
      {/if}
      {#if actions}<span class="actions">{@render actions()}</span>{/if}
    </div>
  </svelte:element>

  {#if open}
    <div id={bodyId} transition:fold>
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .heading {
    margin: 0;
    font: inherit;
  }

  /* Border-box, so `min-height` is the row height with its padding inside. */
  .bar {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-ink);
    transition: background-color var(--dur-fast) var(--ease);
  }

  /*
    A section's row: sticky, so the title of the section being read stays in
    view while its body scrolls. Its paper hides what passes under it.
  */
  .section > .heading {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--color-surface);
  }

  /* The triangle hangs in the gutter, so the title lines up with the fields below. */
  /* The gutter on the right too, so a summary or "+" stays clear of the scroll handle. */
  .section > .heading .bar {
    min-height: var(--bar-h-section);
    padding-right: var(--pad-x);
  }

  .section > .heading .toggle {
    gap: 0;
  }

  .section > .heading .chev {
    width: var(--pad-x);
  }

  /* The title starts one indent in, where the group's body does. */
  .group .bar,
  .group .toggle {
    gap: 0;
  }

  .group .named {
    margin-right: var(--space-2);
  }

  .group .bar {
    min-height: var(--bar-h-group);
    padding-right: var(--space-1);
    border-radius: var(--radius);
  }

  /* Hover tints the row, but only over the part that toggles or renames. */
  .bar:has(.toggle:hover, .chev-button:hover, .fill:hover) {
    background: var(--color-hover);
  }

  .bar:has(.toggle:active, .chev-button:active, .fill:active) {
    background: var(--color-pressed);
  }

  .section > .heading .title {
    font-weight: var(--weight-semibold);
  }

  .group .title,
  .group :global(.text) {
    font-weight: var(--weight-medium);
  }

  /* The right end, clear of `ScrollArea`'s overlay handle. */
  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex: none;
    margin-left: auto;
    color: var(--color-label);
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
    color: var(--color-label);
  }

  .toggle,
  .chev-button {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0;
    border: 0;
    border-radius: var(--radius);
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
  }

  .chev-button {
    flex: none;
  }

  /* The triangle sits in a 24px column, the indent every nested level uses. */
  .chev {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--indent);
    height: var(--target-min);
    color: var(--color-label);
    transition:
      transform var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .chev.open {
    transform: rotate(90deg);
  }

  .bar:hover .chev {
    color: var(--color-ink);
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

  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* What a closed section holds, in the label role, pushed to the right. */
  .summary {
    flex: 0 1 auto;
    min-width: 0;
    margin-left: auto;
    padding-left: var(--space-4);
    overflow: hidden;
    color: var(--color-label);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* After the title: the empty row (it toggles) with the extras at its right. */
  .fill {
    display: flex;
    flex: 1;
    align-self: stretch;
    align-items: center;
    justify-content: flex-end;
    min-width: 0;
    cursor: pointer;
  }

  .extras {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: auto;
    padding-left: var(--space-4);
  }
</style>
