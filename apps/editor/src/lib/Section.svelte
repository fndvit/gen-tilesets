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

  `summary` is the line a closed section shows after its title, built by the
  section from values it already holds ("25 px · 14 rows · 720 wide").

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
    /** A muted line shown while closed, from values the section already holds. */
    summary?: string | undefined;
    children: Snippet;
  }

  let { title, open = true, summary, children }: Props = $props();

  // `open` seeds the state once. A later change to the prop would reopen a
  // section the author had just closed.
  // svelte-ignore state_referenced_locally
  let expanded = $state(open);
</script>

<Collapsible {title} {summary} variant="section" bind:open={expanded}>
  <div class="content">
    {@render children()}
  </div>
</Collapsible>

<style>
  /* The panel's own white is the frame: no rule, just room on every side. */
  .content {
    padding: var(--space-1) var(--space-6) var(--space-6);
  }
</style>
