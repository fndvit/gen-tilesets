<!--
  The Explainer popover — `DESIGN_SYSTEM.md` *Explainer popover* (item 12).

  A non-modal popover for an explanation too long for a hint and needed
  without a mouse ("How noise works"). It explains and never holds a control,
  so it is a `role="dialog"` that takes focus itself, not a focus trap: Tab
  moves on and closes it, as the tile picker does.

  Placed `fixed`, by rules in `popover.ts` (shared with `TilePicker`), from
  its measured size. In the sidebar it opens beside it, over the preview, level
  with its trigger (`placeBeside`, batch 02 D-04 A), because an explainer is
  taller than the room above or below a trigger at common window heights.
  Where there is no room beside the sidebar (the stacked layout below 40rem),
  or outside the sidebar, it hangs above or below the trigger, whichever side
  fits or has more room (`placeOnLargerSide`), right edge to the trigger's
  right edge, because its triggers sit at the right of a bar. Esc, ✕ or a
  press outside closes it; Esc and ✕ return focus to the trigger.

  What it says is `content`, data from the caller (`explainer.ts`), so this
  file knows nothing about noise.
-->
<script lang="ts">
  import type { ExplainerContent } from "./explainer.js";
  import IconButton from "./IconButton.svelte";
  import { placeBeside, placeOnLargerSide, pressedOutside, type BesidePlacement } from "./popover.js";

  interface Props {
    anchor: HTMLElement;
    content: ExplainerContent;
    /** `refocus` is false when focus or the pointer went elsewhere: focus stays where it went. */
    onClose: (refocus: boolean) => void;
  }

  let { anchor, content, onClose }: Props = $props();

  const titleId = $props.id();
  let panel = $state<HTMLElement | undefined>(undefined);
  let place = $state({ top: 0, left: 0, right: 0, up: false });
  let beside = $state<BesidePlacement | undefined>(undefined);

  /** A length token in px, read from the panel so the rules and the CSS share one number. */
  const px = (el: HTMLElement, token: string): number => parseFloat(getComputedStyle(el).getPropertyValue(token)) || 0;

  $effect(() => {
    if (panel === undefined) return;
    // Measured once mounted, before the first paint: `scrollHeight` is the
    // whole content even while `max-height` cuts it, and the width is the
    // same in every placement, so nothing reflows after placing.
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const size = { width: panel.offsetWidth, height: panel.scrollHeight };
    const box = anchor.getBoundingClientRect();
    const sidebar = anchor.closest("aside");
    const margin = px(panel, "--space-4");
    // A local, not `beside`: reading state an effect writes would make it rerun itself.
    const nextTo = sidebar === null ? undefined : placeBeside(sidebar.getBoundingClientRect(), box, viewport, size, margin);
    // Above or below, it also needs its gap to the trigger and the window margin.
    if (nextTo === undefined) place = placeOnLargerSide(box, viewport, size.height + px(panel, "--space-2") + margin);
    beside = nextTo;
    panel.focus();
  });

  function onkeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    onClose(true);
  }

  function onfocusout(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && pressedOutside(next, [panel, anchor])) onClose(false);
  }

  function onpointerdown(event: PointerEvent): void {
    if (pressedOutside(event.target as Node, [panel, anchor])) onClose(false);
  }

  /** Each part's width as a share of its row, so the bars need no unit. */
  const widths = (shares: readonly number[]): number[] => {
    const total = shares.reduce((a, b) => a + b, 0);
    return shares.map((s) => (total > 0 ? s / total : 0));
  };
</script>

<svelte:window {onpointerdown} onresize={() => onClose(false)} />

<div
  class="explainer"
  class:up={beside === undefined && place.up}
  class:beside={beside !== undefined}
  role="dialog"
  aria-labelledby={titleId}
  tabindex="-1"
  bind:this={panel}
  style={beside === undefined
    ? `--top: ${place.top}px; --right: ${place.right}px;`
    : `--top: ${beside.top}px; --left: ${beside.left}px; --max-h: ${beside.maxHeight}px;`}
  {onkeydown}
  {onfocusout}
>
  <div class="head">
    <h3 class="t-title" id={titleId}>{content.title}</h3>
    <IconButton icon="close" label="Close" onclick={() => onClose(true)} />
  </div>
  <p class="t-body">{content.intro}</p>
  <dl>
    {#each content.params as param (param.name)}
      <div>
        <dt class="t-title">{param.name}</dt>
        <dd class="t-body">{param.text}</dd>
      </div>
    {/each}
  </dl>
  {#if content.shares.length > 0}
    <!-- The figures in words for assistive tech; the bars are their picture. -->
    <ul class="shares">
      {#each content.shares as row (row.label)}
        <li>
          <span class="label t-console" aria-hidden="true">{row.label}</span>
          <span class="bar" aria-hidden="true">
            {#each widths(row.shares) as w, i (i)}
              <span class:middle={i > 0 && i < row.shares.length - 1} style="flex: {w}"></span>
            {/each}
          </span>
          <span class="sr">{content.sharesBy} {row.label}: {row.shares.map((s) => `${s}%`).join(", ")}</span>
        </li>
      {/each}
    </ul>
  {/if}
  <p class="t-body">{content.advice}</p>
  <p class="note t-body">{content.note}</p>
</div>

<style>
  /*
    Right edge to the trigger's right edge, but never past the window's left
    margin: at 320px the trigger sits near the right and the panel, at full
    width less the margins, would start 2px off-screen.
  */
  .explainer {
    --w: min(var(--explainer-w), calc(100vw - 2 * var(--space-7)));
    position: fixed;
    top: calc(var(--top) + var(--space-2));
    right: max(0px, min(var(--right), calc(100vw - var(--space-7) - var(--w))));
    z-index: 20;
    display: grid;
    gap: var(--space-5);
    box-sizing: border-box;
    width: var(--w);
    max-height: calc(100vh - var(--top) - 2 * var(--space-4));
    overflow-y: auto;
    padding: var(--space-6);
    border-radius: var(--radius-lg);
    background: var(--color-panel);
    box-shadow: var(--shadow-float);
    color: var(--color-ink);
  }

  .explainer.up {
    top: auto;
    bottom: calc(100vh - var(--top) + var(--space-2));
    max-height: calc(var(--top) - 2 * var(--space-4));
  }

  /* Beside the sidebar: `placeBeside` has already kept it inside the window. */
  .explainer.beside {
    top: var(--top);
    right: auto;
    left: var(--left);
    max-height: var(--max-h);
  }

  .explainer:focus-visible {
    outline-offset: calc(-1 * var(--focus-w));
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    margin-right: calc(-1 * var(--space-3));
  }

  h3 {
    margin: 0;
  }

  p,
  dd {
    margin: 0;
    line-height: var(--leading-hint);
    text-box: none;
  }

  dl {
    display: grid;
    gap: var(--space-4);
    margin: 0;
  }

  dt {
    margin: 0 0 var(--space-2);
  }

  dd,
  .note {
    color: var(--color-muted);
  }

  .shares {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-2) var(--space-4);
    align-items: center;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .shares li {
    display: contents;
  }

  .label {
    color: var(--color-muted);
  }

  .bar {
    display: flex;
    gap: var(--space-1);
    height: 10px;
  }

  .bar span {
    border-radius: 2px;
    background: var(--grey-500);
  }

  .bar span.middle {
    background: var(--color-ink);
  }

  .note {
    padding-top: var(--space-4);
    border-top: var(--rule-w) solid var(--color-track);
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
