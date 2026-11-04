<!--
  A black bar that shows and hides what follows it: the Figma *Section Header*
  and *Tile Group Header*.

  The fold chevron first, then the title, then an optional `extras` snippet (a
  closed tile group's thumbnails) at the right. The chevron points down when
  closed and up when open. It is on the left so `ScrollArea`'s overlay handle,
  which sits over the right edge, never covers it (Pol, Block E review).

  For a tile group the bar also edits: `onRename` makes the title an
  `InlineEdit` (click to rename), and `actions` puts controls such as the trash
  `IconButton` at the right end, with a wider right margin that keeps it clear
  of the scroll handle. Those sit outside the disclosure button. The chevron is
  then a button of its own, and the empty space after the title toggles too,
  so clicking anywhere but the title or an action still opens and closes it. `note` is text shown after the title but
  not edited with it (a duplicate name's ` (t3)`), and `hint` explains the
  title on hover (`ui/Hint`).

  `variant` picks the Figma size: `section` is the 25px sidebar section bar in
  `.t-section`, `group` the 24px tile group bar in `.t-label`. The body is
  rendered bare; its padding and frame belong to the caller (Section, TileGroup),
  because the two Figma bodies differ.

  **Open state is transient.** It is bindable so a caller can open a group it
  just created, but it is never written to the file (`09` §12, **E4**), the same
  rule `Section.svelte` follows.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Hint from "./Hint.svelte";
  import Icon from "./Icon.svelte";
  import InlineEdit from "./InlineEdit.svelte";

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
    actions?: Snippet;
    /** Decorative content beside the chevron. It sits inside the button, so nothing in it may be interactive. */
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
    actions,
    extras,
    children,
  }: Props = $props();

  const bodyId = $props.id();
  const textClass = $derived(variant === "section" ? "t-section" : "t-label");

  function toggle(): void {
    open = !open;
  }
</script>

<div class="collapsible {variant}">
  <!--
    The heading wraps the controls, not the other way round: the heading stays a
    heading for the outline, and the button carries the disclosure semantics.
  -->
  <svelte:element this={`h${level}`} class="heading on-bar">
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
        </button>
      {/if}
      {#if actions}<span class="actions">{@render actions()}</span>{/if}
    </div>
  </svelte:element>

  {#if open}
    <div id={bodyId}>
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .heading {
    margin: 0;
    font: inherit;
  }

  /* Border-box, so `min-height` is the Figma bar height with its padding inside. */
  .bar {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-2);
    background: var(--color-bar);
    color: var(--color-on-bar);
  }

  .section .bar {
    min-height: var(--bar-h-section);
  }

  .group .bar {
    min-height: var(--bar-h-group);
    border: var(--rule-w) solid var(--color-bar);
  }

  /* The right end, clear of `ScrollArea`'s overlay handle. */
  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex: none;
    margin-left: auto;
    margin-right: var(--space-4);
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
    transition: color var(--dur-fast) var(--ease);
  }

  .toggle {
    flex: 1;
    min-width: 0;
    align-self: stretch;
  }

  .chev-button {
    flex: none;
  }

  .toggle:hover,
  .chev-button:hover {
    color: var(--color-inactive);
  }

  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* After the title: the empty bar (it toggles) with the extras at its right. */
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
  }

  .chev {
    display: flex;
    transition: transform var(--dur-fast) var(--ease);
  }

  .chev.open {
    transform: rotate(180deg);
  }
</style>
