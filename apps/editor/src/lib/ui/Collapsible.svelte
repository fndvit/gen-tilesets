<!--
  A header that shows and hides what follows it: a sidebar section, or a
  nested group inside one (a breakpoint rule, a tile group).

  The title first, then (while closed) a muted one-line `summary` of what is
  inside, then optional `extras` (a tile group's thumbnails), the `actions`
  (trash, reorder) and the chevron at the right end. The chevron points down
  when closed and up when open. Everything right of the title sits inside the
  panel's padding, clear of `ScrollArea`'s overlay handle.

  **Surface, not lines, says what level it is.** `variant="section"` is a
  section: closed, its header sits on the grey sidebar ground; open, the whole
  section becomes a white panel. `variant="group"` is a nested group: always a
  faint grey well inside its section's panel. Neither draws a border.

  For a tile group the header also edits: `onRename` makes the title an
  `InlineEdit` (click to rename), and the chevron is then a button of its own
  at the right end. The empty space between title and actions toggles too,
  for the pointer, so clicking anywhere but the title or an action opens and
  closes it. `note` is text shown after the title but not edited with it (a
  duplicate name's ` (t3)`), and `hint` explains the title on hover
  (`ui/Hint`).

  Hover washes the whole header one step darker; the chevron turns ink. The
  body slides open and closed over `--dur-fast`, and appears at once under
  reduced motion. Its padding belongs to the caller (Section, TileGroup).

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
    actions?: Snippet;
    /** Decorative content after the title. It sits inside the button, so nothing in it may be interactive. */
    extras?: Snippet | undefined;
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
    children,
  }: Props = $props();

  const bodyId = $props.id();
  const textClass = $derived(variant === "section" ? "t-section" : "t-title");

  let root: HTMLElement | undefined = $state();

  function toggle(): void {
    open = !open;
  }

  function fold(node: HTMLElement) {
    return slide(node, { duration: root ? motionDuration(root) : 0 });
  }
</script>

<div class="collapsible {variant}" class:open bind:this={root}>
  <!--
    The heading wraps the controls, not the other way round: the heading stays a
    heading for the outline, and the button carries the disclosure semantics.
  -->
  <svelte:element this={`h${level}`} class="heading">
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
          <span class="title {textClass}">{title}{#if note}&nbsp;{note}{/if}</span>
          {#if !open && summary}<span class="summary t-body">{summary}</span>{/if}
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
    <div id={bodyId} transition:fold>
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .collapsible {
    border-radius: var(--radius);
    transition: background-color var(--dur-fast) var(--ease);
  }

  /* An open section is a white panel on the ground; a closed one is only its header. */
  .section.open {
    background: var(--color-panel);
  }

  /* A nested group is a well inside its section's panel, open or closed. */
  .group {
    background: var(--color-well);
  }

  .heading {
    margin: 0;
    font: inherit;
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

  .section .bar {
    min-height: var(--header-h);
    padding: 0 var(--space-4) 0 var(--space-6);
  }

  .group .bar {
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

  /* An open section's header is part of its panel: the wash keeps only the top corners round. */
  .section.open .bar {
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

  /* The chevron gets the 24px target box; the icon stays 12×6, muted until hovered. */
  .chev {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--target-min);
    height: var(--target-min);
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

  .title {
    flex: none;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* What a closed section holds, quiet and on one line, right after its title. */
  .summary {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    color: var(--color-muted);
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
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
