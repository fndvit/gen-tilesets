<!--
  One line of `.t-console` that scrolls when it does not fit: an operation
  tab's answer. A `<span>`, so it can sit inside a button.

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

<span
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
</span>

<style>
  /*
    `contain: inline-size`: the text never sets the strip's width, so a long
    summary scrolls inside the strip instead of widening its container. No
    frame or fill of its own: it takes the colour of what it sits in, and
    `--marquee-bg` paints the ellipsis to match.
  */
  .strip {
    position: relative;
    display: flex;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    contain: inline-size;
    color: inherit;
    white-space: nowrap;
  }

  .track {
    display: flex;
    flex: none;
  }

  .copy {
    flex: none;
    padding-inline: 0 var(--space-6);
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
    padding-inline: var(--space-1) 0;
    background: var(--marquee-bg, var(--color-paper));
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
