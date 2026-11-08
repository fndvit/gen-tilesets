<!--
  One primary control in two parts: a Button that runs the default action, and
  a chevron that opens a Menu of every action, the default one included
  (`DESIGN_SYSTEM.md` *Split button*). Export: the main part downloads the zip
  in one click (**E14**), and the menu adds the image.

  The parts are two `<button>`s with their own names ("Export", "More export
  options"), not one button with a hidden menu: each says what it does. The
  menu opens under the whole control and lines up with its left edge, because
  Export sits at the bar's left; Escape still returns focus to the chevron.

  The main part is `Button` with its right corners squared, so its hover,
  pressed and disabled states are the primary Button's, not a copy. The chevron
  repeats only the primary fill and its hover, plus the white hairline that
  splits it off.

  No busy prop: while the zip is written, the caller passes "Exporting…" as
  `label` and sets `disabled`, as it does for a plain Button. `disabled` turns
  off both parts, so a second export cannot start from the menu meanwhile.
-->
<script lang="ts">
  import Button from "./Button.svelte";
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons.js";
  import Menu, { type MenuItem } from "./Menu.svelte";

  interface Props {
    /** The main part's name and text: "Export". */
    label: string;
    icon?: IconName | undefined;
    /** The default action. It must also be one of `items`. */
    onclick: (event: MouseEvent) => void;
    /** The chevron's name, which says what it opens: "More export options". */
    menuLabel: string;
    items: MenuItem[];
    disabled?: boolean;
  }

  let { label, icon, onclick, menuLabel, items, disabled = false }: Props = $props();

  let anchor = $state<HTMLElement | undefined>(undefined);
</script>

<div class="split" bind:this={anchor}>
  <Button {label} {icon} {onclick} {disabled} variant="primary" squared="right" />
  <Menu label={menuLabel} {items} align="left" {anchor}>
    {#snippet trigger({ open, toggle, attach })}
      <button
        {@attach attach}
        type="button"
        class="chevron"
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        {disabled}
        onclick={toggle}
      >
        <Icon name="fold" />
      </button>
    {/snippet}
  </Menu>
</div>

<style>
  .split {
    display: inline-flex;
  }

  /* 28×30: above the 24px target floor (2.5.8). */
  .chevron {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--icon-button);
    min-height: var(--control-h);
    padding: 0;
    border: 0;
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    background: var(--color-primary);
    color: var(--color-on-primary);
    box-shadow: inset 1px 0 0 rgb(255 255 255 / 0.32);
    cursor: pointer;
    transition: background-color var(--dur-fast) var(--ease);
  }

  .chevron:hover:not(:disabled),
  .chevron[aria-expanded="true"] {
    background: var(--color-primary-hover);
  }

  .chevron:active:not(:disabled) {
    background: var(--color-ink);
    box-shadow:
      inset 1px 0 0 rgb(255 255 255 / 0.32),
      inset 0 0 0 var(--focus-w) var(--color-primary-hover);
  }

  .chevron:disabled {
    background: var(--color-secondary);
    color: var(--color-disabled);
    box-shadow: inset 1px 0 0 var(--color-panel);
    cursor: default;
  }
</style>
