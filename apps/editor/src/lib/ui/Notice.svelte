<!--
  One notice: something the editor tells the author without stopping them.

  An `advisory` (§12.2) draws the info icon in ink. A `failure` (§12.3) draws
  the alert icon in `--color-danger`, its only colour: no edge and no fill
  (Pol, W1, 2026-11-06). The icon's shape and the words tell the two apart, so
  colour is never the only cue (1.4.1). An advisory is never styled as an
  error (E16).

  Anatomy: the icon, then the title, the data in mono (file names, sizes,
  operation ids, one line each), a muted explanation, and any actions as
  tertiary buttons; a ✕ on the right. A white card on `--shadow-float`.

  It never takes focus and holds no live region: the stack it sits in
  announces it (polite for advisories, assertive for failures).
-->
<script lang="ts">
  import type { NoticeAction, NoticeKind } from "../../notices.js";
  import Button from "./Button.svelte";
  import Icon from "./Icon.svelte";
  import IconButton from "./IconButton.svelte";

  interface Props {
    kind: NoticeKind;
    title: string;
    data?: readonly string[] | undefined;
    body?: string | undefined;
    actions?: readonly NoticeAction[] | undefined;
    onDismiss: () => void;
  }

  let { kind, title, data, body, actions, onDismiss }: Props = $props();
</script>

<div class="notice {kind}">
  <span class="marker"><Icon name={kind === "failure" ? "alert" : "info"} /></span>
  <div class="content">
    <p class="t-title title">{title}</p>
    {#if data && data.length > 0}
      <ul class="t-console data">
        {#each data as line, i (i)}
          <li>{line}</li>
        {/each}
      </ul>
    {/if}
    {#if body}<p class="t-body body">{body}</p>{/if}
    {#if actions && actions.length > 0}
      <div class="actions">
        {#each actions as action (action.label)}
          <Button label={action.label} variant="tertiary" onclick={action.run} />
        {/each}
      </div>
    {/if}
  </div>
  <IconButton icon="close" label="Dismiss" onclick={onDismiss} />
</div>

<style>
  .notice {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: var(--icon) minmax(0, 1fr) var(--icon-button);
    column-gap: var(--space-5);
    align-items: start;
    padding: var(--space-6) var(--space-4) var(--space-6) var(--space-6);
    border-radius: var(--radius);
    background: var(--color-card);
    box-shadow: var(--shadow-float);
    color: var(--color-ink);
  }

  .marker {
    display: flex;
    color: var(--color-ink);
  }

  .failure .marker {
    color: var(--color-danger);
  }

  /* The ✕ is taller than a line of title: centre it on the first line. */
  .notice > :global(.icon-button) {
    margin-top: calc((var(--icon) - var(--icon-button)) / 2);
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
  }

  /* Titles and data can wrap, so they keep a real line height. */
  .title {
    line-height: var(--leading-title);
    text-box: none;
  }

  .data {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
    line-height: var(--leading-hint);
    text-box: none;
    overflow-wrap: anywhere;
  }

  .body {
    line-height: var(--leading-hint);
    text-box: none;
    color: var(--color-muted);
  }

  /* The first action's label lines up with the text above it. */
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-left: calc(-1 * var(--space-4));
  }
</style>
