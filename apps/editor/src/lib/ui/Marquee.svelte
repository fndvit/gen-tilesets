<!--
  The Figma *console strip*: one line of `.t-console` on `--color-inactive`
  inside a 1px ink frame, used for an operation's summary.

  Text that fits stays still. Text that overflows scrolls right to left in a
  seamless loop, at the constant speed `--marquee-speed`, and pauses under the
  pointer so it can be read. A second copy makes the loop seamless; it is
  `aria-hidden`, so a screen reader reads the text once. Under
  `prefers-reduced-motion` nothing moves and the overflow is clipped.

  Text is shown as given. Figma capitalises the summary, but the summary holds
  ids and values (`tileId`, `[0.5 - 1]`) that a blanket text-transform would
  rewrite, so casing is the caller's.
-->
<script lang="ts">
  import { marqueeDuration } from "./marquee.js";

  interface Props {
    text: string;
  }

  let { text }: Props = $props();

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

<div class="strip t-console" bind:this={strip} bind:clientWidth={boxWidth} title={text}>
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
    display: flex;
    overflow: hidden;
    contain: inline-size;
    padding-block: var(--console-pad-y);
    border: var(--rule);
    background: var(--color-inactive);
    color: var(--color-ink);
    white-space: nowrap;
  }

  .track {
    display: flex;
    flex: none;
  }

  .copy {
    flex: none;
    padding-inline: var(--space-2) var(--space-6);
  }

  .run {
    animation: marquee var(--duration) linear infinite;
  }

  .strip:hover .run {
    animation-play-state: paused;
  }

  @keyframes marquee {
    to {
      transform: translateX(-50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .run {
      animation: none;
    }
  }
</style>
