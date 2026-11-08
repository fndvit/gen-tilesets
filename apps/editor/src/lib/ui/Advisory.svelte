<!--
  An inline advisory: a muted info icon and a muted line, under the control it
  is about (`09` §12.2's 6 and 9; 8 is retired, T0). It is shown where the author can act on
  it, so it is never a popup and has no ✕: it goes when its condition does.

  No box and no colour (**E16**: never styled as an error). It is a polite live
  region, so it is announced when it appears without taking focus.

  `when` is the condition. While the author is entering a value (`entry`), the
  advisory keeps its last state, so it never appears or vanishes mid-typing or
  mid-drag (Pol, W1, 2026-11-06).
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { entry } from "../../entry.svelte.js";
  import Icon from "./Icon.svelte";

  interface Props {
    when: boolean;
    children: Snippet;
  }

  let { when, children }: Props = $props();

  let shown = $state(false);

  $effect(() => {
    const next = when;
    if (!entry.active) shown = next;
  });
</script>

<!-- The live region stays in the DOM, so what appears in it is announced. -->
<div class="region" role="status">
  {#if shown}
    <p class="advisory">
      <span class="marker"><Icon name="info" /></span>
      <span class="t-body text">{@render children()}</span>
    </p>
  {/if}
</div>

<style>
  .region:empty {
    display: none;
  }

  .advisory {
    display: grid;
    grid-template-columns: var(--icon) minmax(0, 1fr);
    column-gap: var(--space-3);
    align-items: start;
    margin: 0;
    color: var(--color-muted);
  }

  .marker {
    display: flex;
  }

  /* It can wrap, so it keeps a real line height, centred on the icon's first line. */
  .text {
    line-height: var(--leading-hint);
    text-box: none;
    margin-top: calc((var(--icon) - 1em * var(--leading-hint)) / 2);
  }
</style>
