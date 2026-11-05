<!--
  One operation in the stack, as a card that reads as what it does (iteration 2).

  It replaces `OperationHeader`'s four repeated step tabs. A collapsed stack
  used to show "Selection Attribute Source Blend" on every row and squeeze the
  real answers into clipped captions above them, so nothing said what an
  operation did. Now the card leads with its answers.

  - **Index square.** The stack position, in the tile's shape. Ink at rest, the
    accent while the operation is open. Later operations blend onto earlier ones
    (`02` §6.3), which is why the number shows; it is not the operation's
    identity, since randomness hangs on `id` and `salt` (**G3**, D44).
  - **Title: what it writes.** The Attribute in the group-title style, then the
    mapping: the palette's tile thumbnails and names, or a numeric range in mono
    (`writesOf`). Clicking it opens the Attribute step.
  - **Chips: where and how.** One per other step: Selection, Source and Blend,
    each a muted step name over its answer. A chip opens its own step. They wrap
    rather than clip, so a long answer or a narrow sidebar never hides one.
  - **Actions, right.** Re-seed stays visible because it is the operation's
    everyday action. Move earlier, Move later and Delete sit in a "more" menu,
    so they are a click away without crowding every row; the moves are still
    arrows, one gesture and one undo entry each (D44). Open, a close button
    joins them.

  Open, the card lifts to white with an accent edge, and `children` (the
  stepper, `OperationBody`) replaces the chips: every answer is then on the
  stepper's own rows.
-->
<script lang="ts">
  import { canonicalAssets, type Tile } from "@vit-foundation/gen-tilesets";
  import type { Snippet } from "svelte";
  import { stored } from "../../assets.js";
  import type { Step } from "../../draft.svelte.js";
  import IconButton from "../ui/IconButton.svelte";
  import Menu from "../ui/Menu.svelte";
  import { labelFor, summaryCells, UNANSWERED, writesOf, type SummaryParts } from "./labels.js";

  interface Props {
    /** 1-based stack position. */
    index: number;
    parts: SummaryParts;
    tiles: readonly Tile[];
    /** Whether this operation's draft is open below its head. */
    open: boolean;
    onSelect: (step: Step) => void;
    onClose: () => void;
    onDelete: () => void;
    /** Absent for an operation that is not in the file yet (nothing to re-seed). */
    onReseed?: (() => void) | undefined;
    onMoveUp: () => void;
    onMoveDown: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
    /** Id of the open body, for `aria-controls`. */
    panelId?: string | undefined;
    /** The stepper, shown while open. */
    children?: Snippet | undefined;
  }

  let {
    index,
    parts,
    tiles,
    open,
    onSelect,
    onClose,
    onDelete,
    onReseed,
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown,
    panelId,
    children,
  }: Props = $props();

  const writes = $derived(writesOf(parts, tiles));
  const cells = $derived(summaryCells(parts, tiles));
  const chips = ["selection", "source", "blend"] as const;

  /** Up to four palette thumbnails: the tile's first asset, or `null` for clear or a missing picture. */
  const thumbs = $derived(
    (writes?.tileIds ?? []).slice(0, 4).map((id) => {
      const tile = id === null ? undefined : tiles.find((t) => t.id === id);
      const asset = tile ? canonicalAssets(tile)[0] : undefined;
      return { clear: id === null, url: tile && asset ? (stored(tile.id, asset.id)?.url ?? null) : null };
    }),
  );

  const name = $derived(`operation ${index}`);
</script>

<article class="card" class:open aria-label="Operation {index}">
  <div class="head">
    <span class="index t-console" aria-hidden="true">{index}</span>
    <button
      type="button"
      class="title"
      aria-expanded={open}
      aria-controls={panelId}
      title={writes === null ? undefined : `${writes.target} ${writes.detail}`}
      onclick={() => onSelect("attribute")}
    >
      <span class="visually-hidden">Operation {index}:</span>
      <span class="target t-title">{writes?.target ?? "New operation"}</span>
      {#if thumbs.length > 0}
        <span class="thumbs" aria-hidden="true">
          {#each thumbs as thumb, i (i)}
            {#if thumb.url}
              <img class="thumb" src={thumb.url} alt="" />
            {:else}
              <span class="thumb" class:clear={thumb.clear}></span>
            {/if}
          {/each}
        </span>
      {/if}
      {#if writes !== null && writes.detail !== ""}
        <span class="detail t-console">{writes.detail}</span>
      {/if}
    </button>
    <span class="actions">
      {#if onReseed}
        <IconButton icon="reseed" strong label="Re-seed {name}" onclick={onReseed} />
      {/if}
      <Menu
        label="More actions for {name}"
        items={[
          { label: "Move earlier", icon: "up", disabled: !canMoveUp, onSelect: onMoveUp },
          { label: "Move later", icon: "down", disabled: !canMoveDown, onSelect: onMoveDown },
          { label: onReseed ? "Delete" : "Discard", icon: "trash", onSelect: onDelete },
        ]}
      />
      {#if open}
        <IconButton icon="close" label="Close {name}" onclick={onClose} />
      {/if}
    </span>
  </div>

  {#if open}
    {@render children?.()}
  {:else}
    <ul class="chips" aria-label="Steps of {name}">
      {#each chips as step (step)}
        <li>
          <button type="button" class="chip" onclick={() => onSelect(step)}>
            <span class="key">{labelFor(step)}</span>
            <span class="value t-console" class:unset={cells[step] === UNANSWERED}>{cells[step]}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</article>

<style>
  .card {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    border-radius: var(--radius);
    background: var(--color-well);
    transition:
      background-color var(--dur-fast) var(--ease),
      box-shadow var(--dur-fast) var(--ease);
  }

  /* Open: lifted to white, with the accent edge that says "editing this". */
  .card.open {
    background: var(--color-panel);
    box-shadow:
      inset var(--accent-edge) 0 0 var(--color-accent),
      0 0 0 var(--rule-w) var(--color-track);
  }

  .head {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-height: var(--group-h);
    padding: var(--space-3) var(--space-3) var(--space-3) var(--space-5);
  }

  .index {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--op-index);
    height: var(--op-index);
    border-radius: var(--radius-xs);
    background: var(--color-ink);
    color: var(--color-paper);
    text-box: none;
  }

  .open .index {
    background: var(--color-accent);
  }

  .title {
    display: flex;
    flex: 1 1 0;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
    min-height: var(--icon-button);
    padding: 0 var(--space-2);
    margin-left: calc(-1 * var(--space-2));
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color var(--dur-fast) var(--ease);
  }

  .title:hover {
    background: var(--color-hover);
  }

  .target {
    flex: none;
    line-height: var(--leading-title);
    text-box: none;
  }

  .thumbs {
    display: flex;
    flex: none;
    gap: var(--space-1);
  }

  .thumb {
    display: block;
    width: var(--thumb-sm);
    height: var(--thumb-sm);
    border-radius: var(--radius-xs);
    background: var(--color-track);
    box-shadow: 0 0 0 var(--rule-w) var(--black-12);
    object-fit: cover;
  }

  /* An empty palette entry: a hollow square with a slash, the "clear" tile. */
  .thumb.clear {
    box-sizing: border-box;
    border: var(--rule-w) solid var(--color-edge);
    background: linear-gradient(
      to top right,
      transparent calc(50% - 0.5px),
      var(--color-edge) 50%,
      transparent calc(50% + 0.5px)
    );
  }

  .detail {
    min-width: 0;
    overflow: hidden;
    color: var(--color-muted);
    line-height: var(--leading-title);
    text-box: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions {
    display: flex;
    flex: none;
    align-items: center;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    padding: 0 var(--space-5) var(--space-5) calc(var(--space-5) + var(--op-index) + var(--space-4));
    margin-top: calc(-1 * var(--space-1));
    list-style: none;
  }

  /* A step's answer: its name, muted, then the answer in mono. */
  .chip {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    min-height: var(--target-min);
    padding: var(--space-2) var(--space-4);
    border: 0;
    border-radius: var(--radius-sm);
    background: var(--color-panel);
    color: var(--color-ink);
    font: inherit;
    cursor: pointer;
    transition: background-color var(--dur-fast) var(--ease);
  }

  .chip:hover {
    background: var(--color-field-hover);
  }

  .chip:active {
    background: var(--color-secondary-hover);
  }

  .key {
    color: var(--color-muted);
    font-family: var(--font-ui);
    font-size: var(--text-console-size);
  }

  .value {
    line-height: var(--leading-title);
    text-box: none;
  }

  .value.unset {
    color: var(--color-muted);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
