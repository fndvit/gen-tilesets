<!--
  The strip of equal-width step tabs in an operation row (Selection,
  Attribute, Source, Blend), each showing its answer under its name.

  With `active = null` (a closed operation) every tab is paper. With a tab
  active (an open operation), that tab is black, as a chosen segment is. A
  long answer ends in an ellipsis and scrolls while hovered (`Marquee`); the
  tab's accessible name carries the whole answer.

  Selecting a tab opens that step, which is a real action, so activation is
  manual: arrows move focus, and Enter, Space or a click selects.
-->
<script lang="ts">
  import Marquee from "./Marquee.svelte";
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

<div class="tabs" class:open={active !== null} role="tablist" aria-label={label}>
  {#each tabs as tab, i (tab.id)}
    <button
      bind:this={buttons[i]}
      type="button"
      role="tab"
      class="tab"
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
      <span class="name t-xs">{tab.label}</span>
      {#if tab.detail !== undefined}
        <span class="detail" aria-hidden="true"><Marquee text={tab.detail} scroll="hover" /></span>
      {/if}
    </button>
  {/each}
</div>

<style>
  /*
    A segmented strip: one box with a 3:1 edge, the tabs sharing its width.
    Each tab shows its step, and below it, in mono, what that step answered,
    so a closed operation reads as a sentence across the strip.
  */
  .tabs {
    box-sizing: border-box;
    display: flex;
    min-height: var(--control-h);
    border: var(--rule);
    border-radius: var(--radius);
    background: var(--color-paper);
    overflow: hidden;
  }

  .tab {
    --marquee-bg: var(--color-paper);
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-1);
    min-width: 0;
    padding: var(--space-1) var(--space-3);
    border: 0;
    background: var(--color-paper);
    color: var(--color-label);
    text-align: left;
    overflow: hidden;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .tab + .tab {
    border-left: var(--divider);
  }

  /* Untrimmed: it clips for the ellipsis, and a cap-trimmed box lost the letters' tops. */
  .name {
    overflow: hidden;
    line-height: var(--leading-title);
    text-box: none;
    text-overflow: ellipsis;
  }

  .detail {
    display: flex;
    min-width: 0;
    color: var(--color-ink);
  }

  .tab:hover:not(.active) {
    --marquee-bg: var(--color-hover);
    background: var(--color-hover);
    color: var(--color-ink);
  }

  .tab:active:not(.active) {
    --marquee-bg: var(--color-pressed);
    background: var(--color-pressed);
  }

  /* The open step: black, as a chosen segment is. */
  .tab.active {
    --marquee-bg: var(--color-selected);
    background: var(--color-selected);
    color: var(--color-on-selected);
    cursor: default;
  }

  .tab.active .detail {
    color: var(--color-on-selected);
  }

  .tab:focus-visible {
    outline-offset: calc(-1 * var(--focus-w) - var(--focus-offset));
  }

  .tab.active:focus-visible {
    outline-color: var(--color-on-selected);
  }

  /*
    Too narrow for four readable answers (a phone, or 200% zoom): two by two,
    so each answer keeps half the width instead of a quarter (WCAG 1.4.10).
    The caller makes the strip's parent a size container.
  */
  @container (max-width: 260px) {
    .tabs {
      flex-wrap: wrap;
    }

    .tab {
      flex-basis: 50%;
      box-sizing: border-box;
    }

    .tab:nth-child(3) {
      border-left: 0;
    }

    .tab:nth-child(n + 3) {
      border-top: var(--divider);
    }
  }
</style>
