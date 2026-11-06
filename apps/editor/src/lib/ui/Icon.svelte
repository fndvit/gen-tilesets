<!--
  One icon from `icons.ts`, drawn at 16px in `currentColor`, outline only.

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
</script>

<svg
  class="icon"
  width={icon.w}
  height={icon.h}
  viewBox="0 0 {icon.box} {icon.box}"
  role={label ? "img" : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : "true"}
  focusable="false"
>
  <path
    d={icon.d}
    fill="none"
    stroke="currentColor"
    stroke-width={icon.strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>

<style>
  .icon {
    display: block;
    flex: none;
  }
</style>
