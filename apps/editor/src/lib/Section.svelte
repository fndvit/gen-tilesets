<!--
  A collapsible sidebar panel.

  `09` §2 sends "visual design, layout of panels" to *nowhere*, and §3.1 repeats
  it: "Panel layout is not specified anywhere and deliberately so." So this
  component carries no obligation — it is the sidebar's one panel shell, and the
  reason it exists is that `.panel` and the `h2` treatment were previously
  duplicated verbatim across four components.

  **The collapsed state is transient and lives here.** `09` §12 lists persisted
  editor state — collapsed panels among them — as `[POSTPONED]`, and **E4**
  forbids `meta` as the place to put it. So it is a rune in this component,
  per-session, and it neither reads nor writes the file.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** Shown in the header, uppercased by the style. */
    title: string;

    /**
     * The *initial* state only. Nothing writes back to it, because there is
     * nowhere to persist it to (see above).
     */
    open?: boolean;

    /** §9.2's design principle made visible: the destructive panel looks it. */
    destructive?: boolean;

    children: Snippet;
  }

  let { title, open = true, destructive = false, children }: Props = $props();

  // Capturing the initial value is the intent: `open` seeds the state once and
  // is never read again, because a later change to it would reopen a panel the
  // author had just closed.
  // svelte-ignore state_referenced_locally
  let expanded = $state(open);
</script>

<section class="panel" class:destructive>
  <!--
    An `<h2>` wrapping the button rather than the other way round: the heading
    has to stay a heading for the sidebar's outline, and the button is what
    carries the disclosure semantics. Same shape as `controls/BlendControl`'s
    `button.disclose`.
  -->
  <h2 class:closed={!expanded}>
    <button
      type="button"
      class="head"
      aria-expanded={expanded}
      onclick={() => (expanded = !expanded)}
    >
      {title}
      <!-- Down when collapsed, up when expanded. Decorative — `aria-expanded`
           is what a screen reader reads. -->
      <span class="chev" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
    </button>
  </h2>

  {#if expanded}
    <div class="body">
      {@render children()}
    </div>
  {/if}
</section>

<style>
  .panel {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 1rem;
  }

  .destructive {
    border-color: #e0b062;
  }

  h2 {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #5a6b80;
    margin: 0 0 0.75rem;
  }

  /* Collapsed, the header is the whole panel, so it carries no gap below it. */
  h2.closed {
    margin-bottom: 0;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    padding: 0;
    background: none;
    border: 0;
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .head:hover {
    color: #1a202c;
  }

  .chev {
    font-size: 0.6rem;
    line-height: 1;
    color: #a0aec0;
  }
</style>
