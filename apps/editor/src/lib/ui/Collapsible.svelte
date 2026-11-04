<!--
  A black bar that shows and hides what follows it: the Figma *Section Header*
  and *Tile Group Header*.

  Title on the left; on the right, an optional `extras` snippet (a closed tile
  group's thumbnails) and the fold chevron, which points down when closed and
  up when open.

  For a tile group the bar also edits: `onRename` makes the title an
  `InlineEdit` (click to rename), and `actions` puts controls such as the trash
  `IconButton` before the title, where the operation header has its trash. Those
  sit outside the disclosure button, which then covers the rest of the bar
  (empty space, extras, chevron), so clicking anywhere but the title or an
  action still opens and closes it.

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
    /** Controls before the title (the trash button). Outside the disclosure button. */
    actions?: Snippet;
    /** Decorative content beside the chevron. It sits inside the button, so nothing in it may be interactive. */
    extras?: Snippet;
    children: Snippet;
  }

  let {
    title,
    open = $bindable(true),
    variant = "section",
    level = variant === "section" ? 2 : 3,
    onRename,
    actions,
    extras,
    children,
  }: Props = $props();

  const bodyId = $props.id();
  const textClass = $derived(variant === "section" ? "t-section" : "t-label");
</script>

<div class="collapsible {variant}">
  <!--
    The heading wraps the controls, not the other way round: the heading stays a
    heading for the outline, and the button carries the disclosure semantics.
  -->
  <svelte:element this={`h${level}`} class="heading on-bar">
    <div class="bar">
      {#if actions}<span class="actions">{@render actions()}</span>{/if}
      {#if onRename}
        <InlineEdit value={title} label="Rename {title}" onCommit={onRename} {textClass} />
      {/if}
      <button
        type="button"
        class="toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={onRename ? `${open ? "Collapse" : "Expand"} ${title}` : undefined}
        onclick={() => (open = !open)}
      >
        {#if !onRename}<span class="title {textClass}">{title}</span>{/if}
        <span class="end">
          {#if extras}<span class="extras">{@render extras()}</span>{/if}
          <span class="chev" class:open><Icon name="fold" /></span>
        </span>
      </button>
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

  .bar {
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

  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex: none;
  }

  .toggle {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    min-width: 0;
    align-self: stretch;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease);
  }

  .toggle:hover {
    color: var(--color-inactive);
  }

  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .end {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    flex: none;
    margin-left: auto;
  }

  .extras {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .chev {
    display: flex;
    transition: transform var(--dur-fast) var(--ease);
  }

  .chev.open {
    transform: rotate(180deg);
  }
</style>
