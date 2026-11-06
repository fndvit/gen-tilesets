<!--
  A sidebar section: a header over its content, folding.

  `09` §2 sends "visual design, layout of panels" to *nowhere*, and §3.1 repeats
  it: "Panel layout is not specified anywhere and deliberately so." So this
  component carries no obligation. The bar, the chevron and the disclosure
  semantics are `ui/Collapsible`'s, and so is the white panel an open section
  becomes; this adds only the content padding, which lines the fields up with
  the header's title.

  It sets no gap between rows; each body sets its own (6px between fields and
  between nested groups).

  `summary` is the line a closed section shows under its title, built by the
  section from values it already holds ("25 px · 14 rows · 720 wide").

  `onAdd` puts a "+" in the header for a section that holds a list
  (breakpoints, tiles, operations), so adding never needs a scroll to the end of
  the list; it opens the section too, so the new item is in view. `reveal` opens
  it from outside: the orphan notice's "Open op-2" (Stage 2 W4).

  **The collapsed state is transient.** `09` §12 lists persisted editor state,
  collapsed panels among them, as `[POSTPONED]`, and **E4** forbids `meta` as
  the place to put it. So it lives in `Collapsible`, per session, and neither
  reads nor writes the file.

  There is no destructive look. A section whose edits can damage work is
  protected by the confirmation gate in `App.svelte` (§9.3), not by its colour.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Collapsible from "./ui/Collapsible.svelte";
  import IconButton from "./ui/IconButton.svelte";

  interface Props {
    title: string;
    /** The *initial* state only. Nothing writes back to it (see above). */
    open?: boolean;
    /** A muted line shown while closed, from values the section already holds. */
    summary?: string | undefined;
    /** Adds an item to the section's list, from a "+" in the header. */
    onAdd?: (() => void) | undefined;
    /** The "+" button's name: "Add breakpoint". */
    addLabel?: string | undefined;
    /** A counter: each change unfolds the section (something outside asked to show an item in it). */
    reveal?: number;
    children: Snippet;
  }

  let { title, open = true, summary, onAdd, addLabel, reveal = 0, children }: Props = $props();

  // `open` seeds the state once. A later change to the prop would reopen a
  // section the author had just closed.
  // svelte-ignore state_referenced_locally
  let expanded = $state(open);

  $effect(() => {
    if (reveal > 0) expanded = true;
  });
</script>

{#snippet add()}
  <IconButton
    icon="plus"
    label={addLabel ?? `Add to ${title}`}
    onclick={() => {
      expanded = true;
      onAdd?.();
    }}
  />
{/snippet}

<Collapsible {title} {summary} variant="section" bind:open={expanded} actions={onAdd ? add : undefined}>
  <div class="content">
    {@render children()}
  </div>
</Collapsible>

<style>
  /* Under the header's ink rule: room on every side, the fields lined up with the title. */
  .content {
    padding: var(--space-6) var(--space-7) var(--space-7);
  }
</style>
