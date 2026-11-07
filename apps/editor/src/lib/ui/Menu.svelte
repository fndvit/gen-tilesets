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

  By default the trigger is the ⋯ icon button and the list right-aligns with
  it, as a row's menu does. A Split button passes its own chevron as `trigger`
  and its whole control as `anchor`, with `align="left"`: the list then opens
  under the control and lines up with its left edge, while Escape and the
  refocus after an action still go to the chevron, the thing that was pressed
  (`DESIGN_SYSTEM.md` *Menu*, *Split button*). The trigger is a snippet rather
  than an exported `show`/`close` so that opening, closing and refocusing stay
  in this one file.
-->
<script lang="ts" module>
  import type { Attachment } from "svelte/attachments";
  import type { IconName } from "./icons.js";

  /** What a custom `trigger` gets: wire `attach` to the button, `toggle` to its click. */
  export interface MenuTrigger {
    open: boolean;
    toggle: () => void;
    attach: Attachment<HTMLButtonElement>;
  }

  export interface MenuItem {
    label: string;
    icon: IconName;
    onSelect: () => void;
    disabled?: boolean;
  }
</script>

<script lang="ts">
  import { tick, type Snippet } from "svelte";
  import Icon from "./Icon.svelte";
  import IconButton from "./IconButton.svelte";
  import { placeAt, pressedOutside, type Placement } from "./popover.js";

  interface Props {
    /** The button's accessible name: "More actions for operation 2". */
    label: string;
    items: MenuItem[];
    /** Which edge of the anchor the list lines up with. */
    align?: "left" | "right";
    /** The element the list is placed against. Defaults to the trigger. */
    anchor?: HTMLElement | undefined;
    /** A button of the caller's own in place of the ⋯ icon button. */
    trigger?: Snippet<[MenuTrigger]>;
  }

  let { label, items, align = "right", anchor, trigger: custom }: Props = $props();

  let open = $state(false);
  let trigger = $state<HTMLButtonElement | undefined>(undefined);
  let list = $state<HTMLElement | undefined>(undefined);
  let place = $state<Placement>({ top: 0, left: 0, right: 0, up: false });
  const id = $props.id();

  const attach: Attachment<HTMLButtonElement> = (el) => {
    trigger = el;
    return () => {
      if (trigger === el) trigger = undefined;
    };
  };

  function enabled(): HTMLButtonElement[] {
    if (!list) return [];
    return Array.from(list.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)"));
  }

  function show(): void {
    const at = anchor ?? trigger;
    if (!at) return;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    // Room for every item at about 40px, plus the list's padding.
    place = placeAt(at.getBoundingClientRect(), viewport, 40 * items.length + 16);
    open = true;
    queueMicrotask(() => enabled()[0]?.focus());
  }

  function close(refocus: boolean): void {
    open = false;
    if (refocus) trigger?.focus();
  }

  /**
   * Focus goes back to the button after the action has landed: a move
   * reinserts the row, which drops focus, so it is restored once the DOM has
   * settled. After a delete the button is gone and there is nothing to return to.
   */
  async function run(item: MenuItem): Promise<void> {
    close(false);
    item.onSelect();
    await tick();
    if (trigger?.isConnected) trigger.focus();
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

  function toggle(): void {
    if (open) close(true);
    else show();
  }

  function onpointerdown(event: PointerEvent): void {
    if (open && pressedOutside(event.target as Node, [list, trigger])) close(false);
  }
</script>

<svelte:window {onpointerdown} onresize={() => close(false)} />

{#if custom}
  {@render custom({ open, toggle, attach })}
{:else}
  <IconButton icon="more" {label} haspopup="menu" expanded={open} bind:element={trigger} onclick={toggle} />
{/if}

{#if open}
  <div
    class="menu"
    class:up={place.up}
    class:left={align === "left"}
    role="menu"
    tabindex="-1"
    aria-label={label}
    {id}
    bind:this={list}
    style="--top: {place.top}px; --left: {place.left}px; --right: {place.right}px;"
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

  .menu.left {
    right: auto;
    left: var(--left);
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
