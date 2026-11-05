<!--
  A sidebar section: a `ui/Collapsible` header row over its content, closed by
  a 1px divider.

  `09` §2 sends "visual design, layout of panels" to *nowhere*, and §3.1 repeats
  it: "Panel layout is not specified anywhere and deliberately so." So this
  component carries no obligation. The row, the triangle and the disclosure
  semantics are `ui/Collapsible`'s; this adds the content gutter, the divider,
  and two things the header row carries:

  - `summary`, a read-only line of the section's current values, shown while
    it is closed, so a closed section still says what it holds.
  - `actions`, controls in the header row (the "+" that adds a rule, a tile
    group or an operation). The snippet receives `reveal`, which opens the
    section, so adding to a closed section shows what was added.

  It sets no gap between rows, because the bodies differ. Each body sets its own.

  **The collapsed state is transient.** `09` §12 lists persisted editor state,
  collapsed panels among them, as `[POSTPONED]`, and **E4** forbids `meta` as
  the place to put it. So it lives in `Collapsible`, per session, and neither
  reads nor writes the file.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Collapsible from "./ui/Collapsible.svelte";

  interface Props {
    title: string;
    /** The *initial* state only. Nothing writes back to it (see above). */
    open?: boolean;
    /** What the section holds, shown in its header while closed. */
    summary?: string | undefined;
    /** Header controls; `reveal` opens the section. */
    actions?: Snippet<[() => void]>;
    children: Snippet;
  }

  let { title, open = true, summary, actions, children }: Props = $props();

  // `open` seeds the state once. A later change to the prop would reopen a
  // section the author had just closed.
  // svelte-ignore state_referenced_locally
  let expanded = $state(open);

  const reveal = (): void => {
    expanded = true;
  };
</script>

<div class="section">
  <Collapsible {title} {summary} variant="section" bind:open={expanded} actions={actions ? headerActions : undefined}>
    <div class="content">
      {@render children()}
    </div>
  </Collapsible>
</div>

{#snippet headerActions()}
  {@render actions?.(reveal)}
{/snippet}

<style>
  .section {
    border-bottom: var(--divider);
  }

  /* The sidebar gutter, and the gap that closes a section before its divider. */
  .content {
    padding: var(--space-1) var(--pad-x) var(--space-6);
  }
</style>
