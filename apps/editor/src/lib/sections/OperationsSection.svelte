<!--
  The Operations section — `09-editor.md` §4.1, §7; `02` §9; `04` §3.

  The list **is** `config.operations`, in array order, because that order *is*
  the stack order (`06` §7) and is never canonicalized. Each operation is an
  `OperationHeader`; clicking a step tab opens that operation's draft at that
  step, with the `OperationBody` under its header. A new operation is a header
  with the next index, between the stack and the add bar, until it is added.

  One draft at most is open (`drafting`). Opening another — a tab on another
  operation, or the add bar — while the open one has unsaved changes asks
  first, in a popup (Pol, Block E). With nothing changed it switches at once:
  discarding costs nothing because the draft was never in the file (Q7).

  **No `disabled` toggle** (§4.1): there is no field for one, and adding one is
  a `schemaVersion` bump. Reordering is arrows, not a drag (`DECISIONS.md`
  D44): one gesture is one transition and one undo entry (D32).
-->
<script lang="ts">
  import type { Operation } from "@vit-foundation/gen-tilesets";
  import { moveOperation, removeOperation, rerollOperation } from "../../document.js";
  import { draftDiffers, type Step } from "../../draft.svelte.js";
  import { drafting } from "../../drafting.svelte.js";
  import { nextOperationId } from "../../ids.js";
  import { session } from "../../session.svelte.js";
  import Section from "../Section.svelte";
  import OperationBody from "../operations/OperationBody.svelte";
  import OperationHeader from "../operations/OperationHeader.svelte";
  import { draftParts, partsOf, summaryCells } from "../operations/labels.js";
  import AddBar from "../ui/AddBar.svelte";
  import Button from "../ui/Button.svelte";
  import Popup from "../ui/Popup.svelte";

  const operations = $derived(session.file.config.operations);
  const tiles = $derived(session.file.config.tiles);
  const draft = $derived(drafting.draft);

  /**
   * The Operation an open **edit**-draft names, from `drafting.editing` and never
   * from "is this id in the stack?", which the mode flag exists to avoid
   * (`drafting.svelte.ts`).
   */
  const editingId = $derived(drafting.editing ? (draft?.id ?? null) : null);
  const creating = $derived(draft !== null && !drafting.editing);

  const bodyId = $props.id();

  /** The switch waiting on the popup's answer. */
  let pending = $state<(() => void) | null>(null);
  let asking = $state(false);

  /** What the popup names: "operation 2", or "the new operation". */
  const openName = $derived.by(() => {
    if (creating) return "the new operation";
    const index = operations.findIndex((op) => op.id === editingId);
    return `operation ${index + 1}`;
  });

  /** Runs `action` now, or after the author agrees to drop the open draft's changes. */
  function guard(action: () => void): void {
    if (draft !== null) {
      const committed = operations.find((op) => op.id === editingId) ?? null;
      if (draftDiffers(draft, drafting.editing ? committed : null)) {
        pending = action;
        asking = true;
        return;
      }
    }
    action();
  }

  function selectStep(op: Operation, step: Step): void {
    if (draft !== null && editingId === op.id) {
      draft.step = step;
      return;
    }
    guard(() => {
      drafting.edit(op);
      if (drafting.draft !== null) drafting.draft.step = step;
    });
  }

  function create(): void {
    guard(() => drafting.start(nextOperationId(operations.map((o) => o.id))));
  }

  /**
   * §8.3 — the reroll is a file edit, made at once. An open draft of the same
   * Operation takes the new salt too, so its Save does not undo the reroll.
   */
  function reseed(op: Operation): void {
    session.apply(rerollOperation(op.id));
    if (draft !== null && editingId === op.id) {
      const after = session.file.config.operations.find((o) => o.id === op.id);
      if (after) draft.salt = after.salt ?? 0;
    }
  }
</script>

<Section
  title="Operations"
  summary={operations.length === 0
    ? "None"
    : `${operations.length} ${operations.length === 1 ? "operation" : "operations"}`}
>
  <div class="stack">
    {#each operations as op, index (op.id)}
      {@const open = draft !== null && editingId === op.id}
      <div class="operation">
        <OperationHeader
          index={index + 1}
          cells={summaryCells(open && draft ? draftParts(draft) : partsOf(op), tiles)}
          active={open && draft ? draft.step : null}
          onSelect={(step) => selectStep(op, step)}
          onDelete={() => session.apply(removeOperation(op.id))}
          onReseed={() => reseed(op)}
          onMoveUp={() => session.apply(moveOperation(op.id, index - 1))}
          onMoveDown={() => session.apply(moveOperation(op.id, index + 1))}
          canMoveUp={index > 0}
          canMoveDown={index < operations.length - 1}
          {...open ? { panelId: bodyId } : {}}
        />
        {#if open && draft}
          <OperationBody {draft} editing id={bodyId} onClose={() => drafting.discard()} />
        {/if}
      </div>
    {/each}

    {#if creating && draft}
      <div class="operation">
        <OperationHeader
          index={operations.length + 1}
          cells={summaryCells(draftParts(draft), tiles)}
          active={draft.step}
          onSelect={(step) => (draft.step = step)}
          onDelete={() => drafting.discard()}
          onMoveUp={() => {}}
          onMoveDown={() => {}}
          canMoveUp={false}
          canMoveDown={false}
          panelId={bodyId}
        />
        <OperationBody {draft} editing={false} id={bodyId} onClose={() => drafting.discard()} />
      </div>
    {/if}

    <AddBar label="Add operation" onclick={create} />
  </div>
</Section>

<Popup title="Unsaved changes" bind:open={asking} onClose={() => (pending = null)}>
  <p class="t-body">Discard the changes to {openName}?</p>
  {#snippet actions(close)}
    <Button label="Keep editing" onclick={close} />
    <Button
      label="Discard"
      variant="primary"
      onclick={() => {
        const action = pending;
        drafting.discard();
        close();
        action?.();
      }}
    />
  {/snippet}
</Popup>

<style>
  /* `minmax(0, 1fr)`, not the implicit `auto` column, which would grow to a long summary's width. */
  .stack {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
  }

  /* Each operation is a grey well in the panel, header and open body together. */
  .operation {
    border-radius: var(--radius);
    background: var(--color-well);
  }
</style>
