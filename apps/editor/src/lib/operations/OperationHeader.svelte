<!--
  One operation's bar — the Figma *Operation header* (Closed and Opened).

  Left to right: the index cell, a column with delete and re-seed, the summary
  above the step tabs, and a column with the reorder arrows. The summary is one
  console cell per step, each the width of the tab under it, so what a step
  answered sits over that step (Pol, Block F review). A cell that overflows ends
  in an ellipsis and scrolls while hovered (`Marquee scroll="hover"`). The
  cells are hidden from screen readers; each tab's name carries its answer. 56px tall (40 in Figma), so each column holds two 24px targets
  (WCAG 2.2, 2.5.8; Block F). Opened = one tab is active (ink); the body below it is
  the caller's.

  It has no surface of its own: it sits at the top of the operation's grey well
  (`OperationsSection`), the index in the group title style, the summary as a
  muted mono caption over a segmented tab row.

  The index is the stack position, shown because later operations blend onto
  earlier ones (`02` §9). It is not the operation's identity: randomness hangs
  on `id` and `salt` (`02` §6.3), so moving one changes the picture by
  composition only (**G3**, `DECISIONS.md` D44).

  The arrows are disabled at the ends rather than hidden, so the controls beside
  them never move under the pointer. Re-seed is offered on every operation, not
  only stochastic ones, because a `random` Selection consumes the salt too
  (`04` §4.3, `09` §8.3). It keeps the seed colour while open: the colour is a
  meaning, not a state.
-->
<script lang="ts">
  import { STEPS, type Step } from "../../draft.svelte.js";
  import IconButton from "../ui/IconButton.svelte";
  import Marquee from "../ui/Marquee.svelte";
  import TabBar from "../ui/TabBar.svelte";

  interface Props {
    /** 1-based stack position. */
    index: number;
    /** Each step's answer, from `summaryCells` in `labels.ts`. */
    cells: Record<Step, string>;
    /** The step whose body is open below, or `null` when closed. */
    active: Step | null;
    onSelect: (step: Step) => void;
    onDelete: () => void;
    /** Absent for an operation that is not in the file yet (nothing to re-seed). */
    onReseed?: (() => void) | undefined;
    onMoveUp: () => void;
    onMoveDown: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
    /** Id of the open body, for the active tab's `aria-controls`. */
    panelId?: string;
  }

  let {
    index,
    cells,
    active,
    onSelect,
    onDelete,
    onReseed,
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown,
    panelId,
  }: Props = $props();

  const tabs = $derived(STEPS.map((id) => ({ id, label: id, detail: cells[id] })));
</script>

<div class="header">
  <span class="index t-title" aria-label="Operation {index}">{index}</span>

  <div class="icons">
    <IconButton icon="trash" label="Delete operation {index}" onclick={onDelete} />
    <IconButton
      icon="reseed"
      tone="seed"
      label="Re-seed operation {index}"
      disabled={onReseed === undefined}
      onclick={() => onReseed?.()}
    />
  </div>

  <div class="middle">
    <div class="cells" aria-hidden="true">
      {#each STEPS as step (step)}
        <span class="cell"><Marquee text={cells[step]} scroll="hover" /></span>
      {/each}
    </div>
    <TabBar
      {tabs}
      {active}
      onSelect={(id) => onSelect(id as Step)}
      label="Steps of operation {index}"
      {...panelId ? { panelId } : {}}
    />
  </div>

  <div class="icons arrows">
    <IconButton
      icon="up"
      label="Move operation {index} earlier"
      disabled={!canMoveUp}
      onclick={onMoveUp}
    />
    <IconButton
      icon="down"
      label="Move operation {index} later"
      disabled={!canMoveDown}
      onclick={onMoveDown}
    />
  </div>
</div>

<style>
  .header {
    --marquee-ground: var(--color-well);
    --marquee-align: center;
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-height: var(--op-header-h);
    padding: var(--space-2) var(--space-2) var(--space-2) 0;
    color: var(--color-ink);
  }

  .index {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--control-h);
  }

  .icons {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .middle {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
    padding-inline: var(--space-1);
  }

  /* As the tabs: four equal columns, each caption over its own tab. */
  .cells {
    display: flex;
    gap: var(--space-1);
    padding-inline: var(--space-1);
  }

  .cell {
    flex: 1 1 0;
    min-width: 0;
  }
</style>
