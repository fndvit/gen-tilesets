<!--
  One line of `.t-console` in the muted colour, with no frame: an operation's
  summary, read as a caption over its step tabs.

  Text that fits stays still. Text that overflows scrolls right to left in a
  seamless loop, at the constant speed `--marquee-speed`, and pauses under the
  pointer so it can be read. A second copy makes the loop seamless; it is
  `aria-hidden`, so a screen reader reads the text once. Under
  `prefers-reduced-motion` nothing moves and the overflow is clipped.

  `scroll="hover"` keeps overflowing text still, cut with an ellipsis, and
  scrolls it only while the pointer is over the strip, for strips that sit side
  by side (an operation header's one per step), where four running at once
  would be noise.

  Text is shown as given. Figma capitalises the summary, but the summary holds
  ids and values (`tileId`, `[0.5 - 1]`) that a blanket text-transform would
  rewrite, so casing is the caller's.
-->
<script lang="ts">
  import { marqueeDuration } from "./marquee.js";

  interface Props {
    text: string;
    /** `always`: overflow loops on its own. `hover`: an ellipsis at rest, scrolling under the pointer. */
    scroll?: "always" | "hover";
  }

  let { text, scroll = "always" }: Props = $props();

  let boxWidth = $state(0);
  let copyWidth = $state(0);
  let strip: HTMLElement | undefined = $state();

  /** px per second, read once from the token so the speed lives in `tokens.css`. */
  const speed = $derived.by(() => {
    if (!strip) return 0;
    return parseFloat(getComputedStyle(strip).getPropertyValue("--marquee-speed")) || 0;
  });

  // The copy carries its trailing gap, so it overflows only when the text plus
  // the gap is wider than the strip. That keeps text that just fits still.
  const overflows = $derived(copyWidth > boxWidth && boxWidth > 0);
  const duration = $derived(overflows ? marqueeDuration(copyWidth, speed) : 0);
</script>

<div
  class="strip t-console {scroll}"
  class:clip={overflows}
  bind:this={strip}
  bind:clientWidth={boxWidth}
  title={text}
>
  <span class="track" class:run={duration > 0} style:--duration="{duration}s">
    <span class="copy" bind:offsetWidth={copyWidth}>{text}</span>
    {#if duration > 0}<span class="copy" aria-hidden="true">{text}</span>{/if}
  </span>
</div>

<style>
  /*
    `contain: inline-size`: the text never sets the strip's width, so a long
    summary scrolls inside the strip instead of widening its container.
  */
  .strip {
    position: relative;
    display: flex;
    overflow: hidden;
    contain: inline-size;
    padding-block: var(--console-pad-y);
    color: var(--color-muted);
    white-space: nowrap;
  }

  .track {
    display: flex;
    flex: none;
  }

  /* Text that fits can be centred by the caller (an operation's captions, over centred tabs). */
  .strip:not(.clip) {
    justify-content: var(--marquee-align, flex-start);
  }

  .strip:not(.clip) .copy {
    padding-inline: var(--space-2);
  }

  .copy {
    flex: none;
    padding-inline: var(--space-2) var(--space-6);
    line-height: var(--leading-title);
    text-box: none;
  }

  .always .run,
  .hover:hover .run {
    animation: marquee var(--duration) linear infinite;
  }

  .always:hover .run {
    animation-play-state: paused;
  }

  /* A `hover` strip that overflows ends in an ellipsis over the cut text, until it scrolls. */
  .hover.clip::after {
    content: "…";
    position: absolute;
    inset-block: 0;
    right: 0;
    display: flex;
    align-items: center;
    padding-inline: var(--space-1) var(--space-2);
    background: var(--marquee-ground, var(--color-panel));
  }

  @media (prefers-reduced-motion: no-preference) {
    .hover.clip:hover::after {
      content: none;
    }
  }

  @keyframes marquee {
    to {
      transform: translateX(-50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .run,
    .hover:hover .run {
      animation: none;
    }
  }
</style>
