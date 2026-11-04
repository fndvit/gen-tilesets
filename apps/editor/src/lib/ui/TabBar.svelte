<!--
  The row of equal-width step tabs under an operation's console strip
  (Selection, Attribute, Source, Blend).

  Two looks from Figma. With `active = null` (a closed operation) every tab is
  a black bar tab. With a tab active (an open operation), that tab turns paper
  with ink text and joins the body below it, and the others keep a 1px rule
  along the bottom and right.

  Selecting a tab opens that step, which is a real action, so activation is
  manual: arrows move focus, and Enter, Space or a click selects.
-->
<script lang="ts">
  import { rovingIndex } from "./keys.js";

  interface Tab {
    id: string;
    label: string;
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

<div class="tabs on-bar" class:open={active !== null} role="tablist" aria-label={label}>
  {#each tabs as tab, i (tab.id)}
    <button
      bind:this={buttons[i]}
      type="button"
      role="tab"
      class="tab t-xs"
      class:active={tab.id === active}
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
    display: flex;
    height: 100%;
    min-height: var(--bar-h-group);
    background: var(--color-bar);
  }

  .tab {
    flex: 1 1 0;
    min-width: 0;
    padding: var(--space-2);
    border: 0;
    background: var(--color-bar);
    color: var(--color-on-bar);
    overflow: hidden;
    white-space: nowrap;
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease);
  }

  .tab:hover:not(.active) {
    color: var(--color-inactive);
  }

  .open .tab {
    border-right: var(--rule);
    border-bottom: var(--rule);
  }

  .open .tab.active {
    border-bottom: 0;
    background: var(--color-paper);
    color: var(--color-ink);
  }

  /* On the paper tab the ring has to be ink, not the bar's paper. */
  .tab.active:focus-visible {
    outline-color: var(--color-ink);
  }
</style>
