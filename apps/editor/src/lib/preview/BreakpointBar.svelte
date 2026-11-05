<!--
  The preview's bottom bar (Figma *UI Bottom*): one button per bound the file's
  breakpoints name. It is not drawn when the file has none.

  The black one is the range the width is in, the smallest bound at or above
  it (`activeBound`), so dragging across a bound moves the black along with the
  rule taking over. Pressing one shows the preview at exactly that bound;
  bounds are inclusive, so the rule it names applies there. Writes no field
  (**E11**).
-->
<script lang="ts">
  import type { ResponsiveRule } from "@vit-foundation/gen-tilesets";
  import { preview } from "./view.svelte.js";
  import { activeBound, boundsOf } from "./width.js";
  import WidthChoices from "./WidthChoices.svelte";

  interface Props {
    rules?: readonly ResponsiveRule[];
  }

  let { rules = [] }: Props = $props();

  const bounds = $derived(boundsOf(rules));
  const choices = $derived(bounds.map((b) => ({ value: b, label: String(b) })));
  const chosen = $derived(activeBound(bounds, preview.width) ?? undefined);
</script>

{#if bounds.length > 0}
  <div class="bottom-bar">
    <p class="label t-body">Breakpoints</p>
    <WidthChoices
      {choices}
      {chosen}
      onChoose={(value) => (preview.requested = value)}
      label="Breakpoints"
      size="breakpoint"
      divided
    />
  </div>
{/if}

<style>
  .bottom-bar {
    display: grid;
    justify-items: start;
    background: var(--color-paper);
    color: var(--color-ink);
  }

  /* Figma's 4px label padding, trimmed text, so the row is about 33px tall. */
  .label {
    padding: calc(var(--space-6) + var(--space-1)) var(--space-2);
  }
</style>
