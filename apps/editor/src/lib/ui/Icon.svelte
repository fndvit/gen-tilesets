<!--
  One icon from `icons.ts`, drawn at its native Figma size in `currentColor`.

  Icons are decorative by default (`aria-hidden`), because almost every icon
  sits inside a control that names itself (`IconButton`'s `label`). Pass
  `label` only for an icon that carries meaning on its own.
-->
<script lang="ts">
  import { ICONS, type IconName } from "./icons.js";

  interface Props {
    name: IconName;
    /** Accessible name. Leave unset for a decorative icon. */
    label?: string;
  }

  let { name, label }: Props = $props();

  const icon = $derived(ICONS[name]);
  const origin = $derived("origin" in icon ? icon.origin : ([0, 0] as const));
</script>

<svg
  class="icon"
  width={icon.w}
  height={icon.h}
  viewBox="{origin[0]} {origin[1]} {icon.w} {icon.h}"
  role={label ? "img" : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : "true"}
  focusable="false"
>
  {#if icon.mode === "fill"}
    <path d={icon.d} fill="currentColor" />
  {:else}
    <path
      d={icon.d}
      fill="none"
      stroke="currentColor"
      stroke-width={"strokeWidth" in icon ? icon.strokeWidth : 1}
      stroke-linecap={"round" in icon ? "round" : undefined}
      stroke-linejoin={"round" in icon ? "round" : undefined}
    />
  {/if}
</svg>

<style>
  .icon {
    display: block;
    flex: none;
    /* Figma lets the 2px chevron and the trash outline overflow their frame. */
    overflow: visible;
  }
</style>
