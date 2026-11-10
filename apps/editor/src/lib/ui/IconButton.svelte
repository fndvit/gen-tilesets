<!--
  A bare square button holding one icon: delete, re-seed, move, close, more.

  It has no fill of its own. At rest the icon is muted, so a row of icons stays
  quiet beside the values; under the pointer it turns ink on a grey wash, and
  the wash deepens while pressed. The box is `--icon-button` square, above the
  WCAG 2.2 target floor (2.5.8). `label` is required because the icon is the
  only thing a sighted user sees; a screen reader needs the words, and the same
  words show as a tooltip.

  `strong` draws the icon in ink at rest, for the one icon action a row leads
  with (an operation's re-seed). There is no colour tone: the re-seed shape
  says "draw again" on its own (iteration 2).
-->
<script lang="ts">
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons.js";

  interface Props {
    icon: IconName;
    label: string;
    onclick: (event: MouseEvent) => void;
    disabled?: boolean;
    strong?: boolean;
    /** For a menu trigger. */
    expanded?: boolean | undefined;
    /**
     * For a toggle (batch 02 T-02: hide an operation). Absent, the button is a
     * plain action and says nothing; given, it is `aria-pressed` and the icon is
     * drawn in ink while pressed, so the state is not only in the icon's shape.
     */
    pressed?: boolean | undefined;
    haspopup?: "menu" | "dialog" | undefined;
    element?: HTMLButtonElement | undefined;
    /** `data-tour`, for the onboarding tour to find it (`Section.svelte` says why). */
    tour?: string | undefined;
  }

  let {
    icon,
    label,
    onclick,
    disabled = false,
    strong = false,
    expanded,
    pressed,
    haspopup,
    element = $bindable(),
    tour,
  }: Props = $props();
</script>

<button
  bind:this={element}
  type="button"
  class="icon-button"
  class:strong
  aria-label={label}
  aria-expanded={expanded}
  aria-pressed={pressed}
  aria-haspopup={haspopup}
  title={label}
  data-tour={tour}
  {disabled}
  {onclick}
>
  <Icon name={icon} />
</button>

<style>
  .icon-button {
    box-sizing: border-box;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--icon-button);
    height: var(--icon-button);
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .strong {
    color: var(--color-ink);
  }

  .icon-button:hover:not(:disabled),
  .icon-button[aria-expanded="true"] {
    background: var(--color-hover);
    color: var(--color-ink);
  }

  /* A pressed toggle keeps the ink the hover gives, at rest too. */
  .icon-button[aria-pressed="true"] {
    color: var(--color-ink);
  }

  .icon-button:active:not(:disabled) {
    background: var(--color-pressed);
  }

  .icon-button:focus-visible {
    outline-offset: 0;
  }

  .icon-button:disabled {
    color: var(--color-disabled);
    cursor: default;
  }
</style>
