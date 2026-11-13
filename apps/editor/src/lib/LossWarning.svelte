<!--
  The line that says the current tileset will be replaced for good: New
  tileset's popup and Import's question. Neither can be undone (`session.open`,
  `session.reset`), so both say so in the same words.

  An alert icon and a bold first sentence, at Pol's request (2026-11-09): the
  line used to be plain body text and was easy to read past. It is sized to fit
  on one line in a `wide` Popup (`ui/Popup.svelte`), so the two sentences are
  read together. The red is only on the icon; the words carry the danger, as
  `ui/Dialog.svelte` asks.
-->
<script lang="ts">
  import Icon from "./ui/Icon.svelte";
</script>

<p class="warning t-body">
  <span class="mark"><Icon name="alert" /></span>
  <span><strong>Everything in the current tileset is lost, and it can't be undone.</strong> Export it first to keep it.</span>
</p>

<style>
  .warning {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    margin: 0;
    color: var(--color-ink);
    overflow-wrap: anywhere;
  }

  strong {
    font-weight: var(--weight-semibold);
  }

  .mark {
    flex: none;
    display: inline-flex;
    color: var(--color-danger);
  }
</style>
