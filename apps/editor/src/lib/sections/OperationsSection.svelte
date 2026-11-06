<!--
  The Operations section — `09-editor.md` §4.1, §7; `02` §9; `04` §3.

  The list **is** `config.operations`, in array order, because that order *is*
  the stack order (`06` §7) and is never canonicalized. Each operation is an
  `OperationCard` that reads as what it does; clicking its title or a step
  chip opens that operation's draft at that step, with the `OperationBody`
  stepper inside the card. A new operation is a card with the next index,
  between the stack and the add bar, until it is added. The section header's
  "+" adds one too, so a long stack never needs a scroll to its end.

  One draft at most is open (`drafting`). Opening another — a tab on another
  operation, or the add bar — while the open one has unsaved changes asks
  first, "Discard your changes?" in a `Dialog` (Pol, Block E; Stage 2 W4). With
  nothing changed it switches at once: discarding costs nothing because the
  draft was never in the file (Q7). The guard is `opening.svelte.ts`'s, shared
  with the orphan notice's "Open op-2"; this section draws its question, and
  unfolds when `opening.open` asks to show an operation.

  **No `disabled` toggle** (§4.1): there is no field for one, and adding one is
  a `schemaVersion` bump. Reordering is arrows, not a drag (`DECISIONS.md`
  D44): one gesture is one transition and one undo entry (D32).
-->
<script lang="ts">
  import { tick } from "svelte";
  import type { Operation } from "@vit-foundation/gen-tilesets";
  import { moveOperation, removeOperation, rerollOperation } from "../../document.js";
  import { type Step } from "../../draft.svelte.js";
  import { drafting } from "../../drafting.svelte.js";
  import { nextOperationId } from "../../ids.js";
  import { opening } from "../../opening.svelte.js";
  import { session } from "../../session.svelte.js";
  import Section from "../Section.svelte";
  import OperationBody from "../operations/OperationBody.svelte";
  import OperationCard from "../operations/OperationCard.svelte";
  import { draftParts, partsOf } from "../operations/labels.js";
  import AddBar from "../ui/AddBar.svelte";
  import Dialog from "../ui/Dialog.svelte";

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

  /** What the dialog names: "operation 2", or "the new operation". */
  const openName = $derived.by(() => {
    if (creating) return "the new operation";
    const index = operations.findIndex((op) => op.id === editingId);
    return `operation ${index + 1}`;
  });

  const guard = opening.guard;

  /** After `opening.open`, bring the opened card into view once the section has unfolded. */
  $effect(() => {
    if (opening.revealed === 0) return;
    void tick().then(() =>
      document.getElementById(bodyId)?.closest("article")?.scrollIntoView({ block: "nearest" }),
    );
  });

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
  addLabel="Add operation"
  onAdd={create}
  reveal={opening.revealed}
>
  <div class="stack">
    {#each operations as op, index (op.id)}
      {@const open = draft !== null && editingId === op.id}
      <OperationCard
        index={index + 1}
        parts={open && draft ? draftParts(draft) : partsOf(op)}
        {tiles}
        {open}
        onSelect={(step) => selectStep(op, step)}
        onClose={() => guard(() => drafting.discard())}
        onDelete={() => session.apply(removeOperation(op.id))}
        onReseed={() => reseed(op)}
        onMoveUp={() => session.apply(moveOperation(op.id, index - 1))}
        onMoveDown={() => session.apply(moveOperation(op.id, index + 1))}
        canMoveUp={index > 0}
        canMoveDown={index < operations.length - 1}
        panelId={open ? bodyId : undefined}
      >
        {#if open && draft}
          <OperationBody {draft} editing id={bodyId} onClose={() => drafting.discard()} />
        {/if}
      </OperationCard>
    {/each}

    {#if creating && draft}
      <OperationCard
        index={operations.length + 1}
        parts={draftParts(draft)}
        {tiles}
        open
        onSelect={(step) => (draft.step = step)}
        onClose={() => guard(() => drafting.discard())}
        onDelete={() => drafting.discard()}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        canMoveUp={false}
        canMoveDown={false}
        panelId={bodyId}
      >
        <OperationBody {draft} editing={false} id={bodyId} onClose={() => drafting.discard()} />
      </OperationCard>
    {/if}

    <AddBar label="Add operation" onclick={create} />
  </div>
</Section>

<Dialog
  title="Discard your changes?"
  cancelLabel="Keep editing"
  confirmLabel="Discard"
  bind:open={opening.asking}
  onConfirm={opening.confirm}
  onCancel={opening.cancel}
>
  <p class="t-body">The changes to {openName} haven't been saved. Discarding them can't be undone.</p>
</Dialog>

<style>
  /* `minmax(0, 1fr)`, not the implicit `auto` column, which would grow to a long summary's width. */
  .stack {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
  }
</style>
