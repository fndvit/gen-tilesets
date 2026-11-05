<!--
  A sidebar section: the Figma *Section Header* bar over its content.

  `09` §2 sends "visual design, layout of panels" to *nowhere*, and §3.1 repeats
  it: "Panel layout is not specified anywhere and deliberately so." So this
  component carries no obligation. The bar, the chevron and the disclosure
  semantics are `ui/Collapsible`'s; this adds only the Figma content padding
  (6px, then a 4px slot).

  It sets no gap between rows, because the bodies differ: fields are 8px apart
  (Grid & Size), lists of bars 4px (Tiles). Each body sets its own.

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

  interface Props {
    title: string;
    /** The *initial* state only. Nothing writes back to it (see above). */
    open?: boolean;
    children: Snippet;
  }

  let { title, open = true, children }: Props = $props();

  // `open` seeds the state once. A later change to the prop would reopen a
  // section the author had just closed.
  // svelte-ignore state_referenced_locally
  let expanded = $state(open);
</script>

<Collapsible {title} variant="section" bind:open={expanded}>
  <div class="content">
    {@render children()}
  </div>
</Collapsible>

<style>
  /*
    Lighter than the sidebar ground, closed by a rule, so where an open
    section ends is visible even for the last one (Pol, Block F review).
  */
  .content {
    padding: calc(var(--space-3) + var(--space-2));
    border-bottom: var(--rule-w) solid var(--color-separator);
    background: var(--color-section);
  }
</style>
