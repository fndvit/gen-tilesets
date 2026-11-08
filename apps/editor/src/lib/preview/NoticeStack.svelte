<!--
  The notices, stacked at the preview's top-right (Pol, W0, 2026-11-06).

  It floats over the picture, `--space-6` under the top bar's hairline, and
  never covers the sidebar or takes space in the layout. Failures come first,
  then advisories (`notices.ts` `visible`).

  Two live regions, both always in the DOM so that what appears in them is
  announced: failures are assertive, advisories polite. A notice never takes
  focus. The stack lets the pointer through wherever there is no notice, so
  the picture under its empty part stays paintable.

  While the preview draws an unsaved draft (item 12, the **Draft cue**), the
  "Draft · not saved" tag sits at the top, above every notice, so it shares
  their placement and reflow. It is not a notice: nothing dismisses it, and it
  is not a live region, because it comes and goes with every edit that makes
  the draft complete or not, and announcing each would be noise. The frame
  around the picture is the other half of the cue (`App.svelte`).
-->
<script lang="ts">
  import type { Notice as NoticeData } from "../../notices.js";
  import Notice from "../ui/Notice.svelte";

  interface Props {
    notices: readonly NoticeData[];
    onDismiss: (notice: NoticeData) => void;
    /** Whether the preview is drawing an unsaved draft: shows the tag. */
    draft?: boolean;
  }

  let { notices, onDismiss, draft = false }: Props = $props();

  const failures = $derived(notices.filter((n) => n.kind === "failure"));
  const advisories = $derived(notices.filter((n) => n.kind === "advisory"));
</script>

{#snippet list(items: readonly NoticeData[])}
  {#each items as notice (notice.key)}
    <Notice
      kind={notice.kind}
      title={notice.title}
      data={notice.data}
      body={notice.body}
      actions={notice.actions}
      onDismiss={() => onDismiss(notice)}
    />
  {/each}
{/snippet}

<div class="notice-stack">
  {#if draft}
    <p class="draft-tag t-xs"><span class="dot" aria-hidden="true"></span>Draft · not saved</p>
  {/if}
  <div class="region" role="alert" aria-live="assertive">{@render list(failures)}</div>
  <div class="region" role="status" aria-live="polite">{@render list(advisories)}</div>
</div>

<style>
  .notice-stack {
    position: absolute;
    top: var(--space-6);
    right: var(--space-6);
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    width: min(var(--notice-w), calc(100% - 2 * var(--space-6)));
    max-height: calc(100% - 2 * var(--space-6));
    overflow-y: auto;
    pointer-events: none;
  }

  .region {
    display: contents;
  }

  .notice-stack :global(.notice) {
    pointer-events: auto;
  }

  /* The draft cue's tag: a white chip, an accent square, accent words. */
  .draft-tag {
    display: inline-flex;
    flex: none;
    align-self: flex-end;
    align-items: center;
    gap: var(--space-3);
    height: var(--icon-button);
    margin: 0;
    padding: 0 var(--space-4);
    border-radius: var(--radius-sm);
    background: var(--color-panel);
    box-shadow: var(--shadow-float);
    color: var(--color-accent);
    white-space: nowrap;
  }

  .dot {
    width: var(--space-4);
    height: var(--space-4);
    border-radius: 2px;
    background: var(--color-accent);
  }
</style>
