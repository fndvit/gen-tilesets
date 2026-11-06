<!--
  The notices, stacked at the preview's top-right (Pol, W0, 2026-11-06).

  It floats over the picture, `--space-6` under the top bar's hairline, and
  never covers the sidebar or takes space in the layout. Failures come first,
  then advisories (`notices.ts` `visible`).

  Two live regions, both always in the DOM so that what appears in them is
  announced: failures are assertive, advisories polite. A notice never takes
  focus. The stack lets the pointer through wherever there is no notice, so
  the picture under its empty part stays paintable.
-->
<script lang="ts">
  import type { Notice as NoticeData } from "../../notices.js";
  import Notice from "../ui/Notice.svelte";

  interface Props {
    notices: readonly NoticeData[];
    onDismiss: (notice: NoticeData) => void;
  }

  let { notices, onDismiss }: Props = $props();

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
</style>
