<!--
  The row of equal-width step tabs under an operation's console strip
  (Selection, Attribute, Source, Blend).

  Drawn as a segmented control: a grey track of equal tabs. With `active = null`
  (a closed operation) all are text on the track. With a tab active (an open
  operation), that tab is ink, the selected state everywhere in the editor.

  Selecting a tab opens that step, which is a real action, so activation is
  manual: arrows move focus, and Enter, Space or a click selects.
-->
<script lang="ts">
  import { rovingIndex } from "./keys.js";

  interface Tab {
    id: string;
    label: string;
    /** Read after the label in the tab's name ("selection: Checkered"), for what is shown beside it. */
    detail?: string;
  }

  interface Props {
    tabs: Tab[];
    active: string | null;
    onSelect: (id: string) => void;
    label: string;
    /** Id of the panel the active tab shows, for `aria-controls`. */
    panelId?: string;
  }

  let { tabs, active, onSelect, label, panelId }: Props = $props();

  let buttons: HTMLButtonElement[] = $state([]);
  let focused = $state(-1);

  const activeIndex = $derived(tabs.findIndex((t) => t.id === active));
  /** The one tab Tab lands on: the focused one, else the active one, else the first. */
  const stop = $derived(focused >= 0 ? focused : Math.max(activeIndex, 0));

  function onKeydown(event: KeyboardEvent, i: number): void {
    const next = rovingIndex(event.key, i, tabs.length);
    if (next === null || event.key === "ArrowUp" || event.key === "ArrowDown") return;
    event.preventDefault();
    focused = next;
    buttons[next]?.focus();
  }
</script>

<div class="tabs" role="tablist" aria-label={label}>
  {#each tabs as tab, i (tab.id)}
    <button
      bind:this={buttons[i]}
      type="button"
      role="tab"
      class="tab t-xs"
      class:active={tab.id === active}
      aria-label={tab.detail === undefined ? undefined : `${tab.label}: ${tab.detail}`}
      aria-selected={tab.id === active}
      aria-controls={tab.id === active ? panelId : undefined}
      tabindex={i === stop ? 0 : -1}
      onclick={() => onSelect(tab.id)}
      onkeydown={(event) => onKeydown(event, i)}
      onfocus={() => (focused = i)}
      onblur={() => (focused = -1)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tabs {
    box-sizing: border-box;
    display: flex;
    gap: var(--space-1);
    min-height: var(--control-h);
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    background: var(--color-field);
  }

  /* The step ids are lower case; the tab shows them in sentence case. */
  .tab {
    flex: 1 1 0;
    min-width: 0;
    padding: 0 var(--space-2);
    border: 0;
    border-radius: calc(var(--radius-sm) - var(--space-1));
    background: transparent;
    color: var(--color-ink);
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: capitalize;
    white-space: nowrap;
    line-height: normal;
    text-box: none;
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .tab:hover:not(.active) {
    background: var(--color-hover);
  }

  .tab:active:not(.active) {
    background: var(--color-pressed);
  }

  .tab:focus-visible {
    outline-offset: 0;
  }

  .tab.active {
    background: var(--color-selected);
    color: var(--color-on-selected);
    cursor: default;
  }
</style>
