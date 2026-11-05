<!--
  One operation's row in the stack.

  Left to right: the index, the four step tabs (each tab shows its step and,
  under it in mono, what that step answered, so a closed operation reads as a
  sentence across the strip), then a 2×2 block of icons: re-seed and delete
  over the reorder arrows. A long answer ends in an ellipsis and scrolls while
  hovered; each tab's accessible name carries the whole answer. Opened = one
  tab is black; the body below it is the caller's.

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

  const tabs = $derived(STEPS.map((id) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1), detail: cells[id] })));
</script>

<div class="header" class:open={active !== null}>
  <span class="index t-console" aria-label="Operation {index}">{index}</span>

  <div class="middle">
    <TabBar
      {tabs}
      {active}
      onSelect={(id) => onSelect(id as Step)}
      label="Steps of operation {index}"
      {...panelId ? { panelId } : {}}
    />
  </div>

  <div class="icons">
    <IconButton
      icon="reseed"
      tone="seed"
      label="Re-seed operation {index}"
      disabled={onReseed === undefined}
      onclick={() => onReseed?.()}
    />
    <IconButton icon="trash" label="Delete operation {index}" onclick={onDelete} />
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
    align-items: stretch;
    gap: var(--space-2);
    min-height: var(--op-header-h);
  }

  /* The stack position in the gutter a nested row's triangle would use. */
  .index {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--target-min);
    color: var(--color-label);
  }

  .open .index {
    color: var(--color-ink);
  }

  /* A size container, so the tabs can go two by two when the row is narrow. */
  .middle {
    display: flex;
    flex: 1 1 0;
    min-width: 0;
    container-type: inline-size;
  }

  .middle :global(.tabs) {
    flex: 1;
  }

  /* Re-seed and delete over the arrows, in the label role. */
  .icons {
    display: grid;
    grid-template-columns: repeat(2, auto);
    align-content: center;
    align-items: center;
    justify-items: center;
    color: var(--color-label);
  }
</style>
