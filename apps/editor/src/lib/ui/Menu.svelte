<!--
  A "more actions" menu: an icon button that opens a short list of actions.

  For actions a row needs but should not show at rest: an operation's Move
  earlier, Move later and Delete (iteration 2). One click more than a bare
  icon, in exchange for a row that says what it is instead of what can be done
  to it.

  It follows the WAI-ARIA menu button pattern. Opening focuses the first enabled
  item; the arrow keys, Home and End move between items; Enter or Space runs
  one; Escape closes and returns focus to the button; Tab or a click elsewhere
  closes. The list is `position: fixed` under the button, so a scrolling,
  clipping sidebar never cuts it off; it opens upward when there is no room
  below.
-->
<script lang="ts" module>
  import type { IconName } from "./icons.js";

  export interface MenuItem {
    label: string;
    icon: IconName;
    onSelect: () => void;
    disabled?: boolean;
  }
</script>

<script lang="ts">
  import Icon from "./Icon.svelte";
  import IconButton from "./IconButton.svelte";

  interface Props {
    /** The button's accessible name: "More actions for operation 2". */
    label: string;
    items: MenuItem[];
  }

  let { label, items }: Props = $props();

  let open = $state(false);
  let trigger = $state<HTMLButtonElement | undefined>(undefined);
  let list = $state<HTMLElement | undefined>(undefined);
  let place = $state({ top: 0, right: 0, up: false });
  const id = $props.id();

  function enabled(): HTMLButtonElement[] {
    if (!list) return [];
    return Array.from(list.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)"));
  }

  function show(): void {
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const room = window.innerHeight - r.bottom;
    const up = room < 40 * items.length + 16;
    place = { top: up ? r.top : r.bottom, right: window.innerWidth - r.right, up };
    open = true;
    queueMicrotask(() => enabled()[0]?.focus());
  }

  function close(refocus: boolean): void {
    open = false;
    if (refocus) trigger?.focus();
  }

  function run(item: MenuItem): void {
    close(true);
    item.onSelect();
  }

  function onkeydown(event: KeyboardEvent): void {
    const all = enabled();
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => all[(i + all.length) % all.length]?.focus();
    if (event.key === "ArrowDown") go(at + 1);
    else if (event.key === "ArrowUp") go(at - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(all.length - 1);
    else if (event.key === "Escape") close(true);
    else if (event.key === "Tab") close(false);
    else return;
    if (event.key !== "Tab") event.preventDefault();
  }

  function onpointerdown(event: PointerEvent): void {
    const target = event.target as Node;
    if (open && !list?.contains(target) && !trigger?.contains(target)) close(false);
  }
</script>

<svelte:window {onpointerdown} onresize={() => close(false)} />

<IconButton
  icon="more"
  {label}
  haspopup="menu"
  expanded={open}
  bind:element={trigger}
  onclick={() => (open ? close(true) : show())}
/>

{#if open}
  <div
    class="menu"
    class:up={place.up}
    role="menu"
    tabindex="-1"
    aria-label={label}
    {id}
    bind:this={list}
    style="--top: {place.top}px; --right: {place.right}px;"
    {onkeydown}
  >
    {#each items as item (item.label)}
      <button
        type="button"
        role="menuitem"
        class="item t-xs"
        tabindex="-1"
        disabled={item.disabled}
        onclick={() => run(item)}
      >
        <Icon name={item.icon} />
        {item.label}
      </button>
    {/each}
  </div>
{/if}

<style>
  .menu {
    position: fixed;
    top: calc(var(--top) + var(--space-2));
    right: var(--right);
    z-index: 20;
    display: grid;
    min-width: var(--menu-w);
    padding: var(--space-2);
    border-radius: var(--radius);
    background: var(--color-panel);
    box-shadow: var(--shadow-float);
  }

  .menu.up {
    top: auto;
    bottom: calc(100vh - var(--top) + var(--space-2));
  }

  .item {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-height: var(--control-h);
    padding: 0 var(--space-4);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-ink);
    line-height: normal;
    text-align: left;
    text-box: none;
    cursor: pointer;
  }

  .item:hover:not(:disabled),
  .item:focus-visible {
    background: var(--color-hover);
  }

  .item:focus-visible {
    outline-offset: calc(-1 * var(--focus-w));
  }

  .item:disabled {
    color: var(--color-disabled);
    cursor: default;
  }
</style>
