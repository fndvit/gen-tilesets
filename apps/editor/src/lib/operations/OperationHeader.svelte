<!--
  One operation's bar — the Figma *Operation header* (Closed and Opened).

  Left to right: the index cell, a column with delete and re-seed, the console
  strip with the summary above the step tabs, and a column with the reorder
  arrows. 40px tall. Opened = one tab is active (paper); the body below it is
  the caller's.

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
    summary: string;
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
    summary,
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

  const tabs = STEPS.map((id) => ({ id, label: id }));
</script>

<div class="header on-bar">
  <span class="index t-section" aria-label="Operation {index}">{index}</span>

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
    <Marquee text={summary} />
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
    display: flex;
    min-height: var(--op-header-h);
    background: var(--color-bar);
    color: var(--color-on-bar);
  }

  .index {
    display: flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
  }

  .icons {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-5);
    padding: var(--space-2);
  }

  .middle {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-width: 0;
  }

  /* The tab row takes what the strip leaves of the 40px. */
  .middle :global(.tabs) {
    flex: 1;
  }
</style>
