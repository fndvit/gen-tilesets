<!--
  An explanation that appears on hover: a small ink bubble with paper text under
  whatever it wraps (a field label, a tile thumbnail, a tile group title).

  **Explanations never sit in the layout.** The bubble is `display: none` until
  the pointer is over the wrapped content, so a hidden hint takes no room and
  cannot make the page scroll. The children snippet receives the bubble's id
  for the control's `aria-describedby`; a screen reader reads that text even
  while it is hidden. A native `title` tooltip was rejected: it appears only
  after a delay and cannot be styled.

  It opens below. A container near the bottom of the screen (the sidebar
  footer) sets `--hint-top: auto` and `--hint-bottom` to open it above.

  With no `text` it renders the children alone, with `undefined` for the id.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    text?: string | undefined;
    /** The bubble's id. Set it when the caller needs the id outside the children (`FieldRow`'s group). */
    id?: string | undefined;
    children: Snippet<[string | undefined]>;
  }

  const generated = $props.id();
  let { text, id = `${generated}-hint`, children }: Props = $props();
</script>

{#if text}
  <span class="anchor">
    {@render children(id)}
    <span class="hint t-body" {id}>{text}</span>
  </span>
{:else}
  {@render children(undefined)}
{/if}

<style>
  .anchor {
    position: relative;
    display: flex;
    min-width: 0;
  }

  .hint {
    position: absolute;
    top: var(--hint-top, calc(100% + var(--space-2)));
    bottom: var(--hint-bottom, auto);
    left: 0;
    z-index: 2;
    width: max-content;
    max-width: var(--hint-w);
    padding: var(--space-3);
    background: var(--color-ink);
    color: var(--color-paper);
    line-height: var(--leading-hint);
    text-box: none;
    text-transform: none;
    white-space: normal;
    display: none;
    pointer-events: none;
  }

  .anchor:hover > .hint {
    display: block;
  }
</style>
