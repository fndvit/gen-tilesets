<!--
  The operation stack — `09-editor.md` §4.1; `02` §9; `04` §3.

  The list **is** `config.operations`, in array order, because that array's order
  *is* the stack order (`06` §7) and is never canonicalized. Rendering it in any
  other order would be showing the author a different program from the one that
  runs.

  **`04` §3 says how to read one**, and the summary below is that sentence:

  > for the cells in `selection`, take a number from `source`, interpret it
  > through `mapping`, and combine it into `target` with `blend`.

  ## What is absent, and why it stays absent

  **No `disabled` toggle** (§4.1). There is no field for one and adding one is a
  `schemaVersion` bump. Muting is removal held in session state, and this version
  ships neither — so what is here is a field that does not exist, rather than a
  feature that is missing.

  **No drag to reorder** in this version. Unlike a Tile's asset list, where a
  drag would be a gesture with *no* effect (**D3**), a drag here would have a
  very real one — `02` §6.3 makes reordering change output "for a reason the
  author can see". It is left out because it is not in this version's scope, not
  because it is meaningless.
-->
<script lang="ts">
  import { TARGETS, type Operation } from "@tileset/core";
  import { removeOperation, rerollOperation, setReseedOnLoad } from "../document.js";
  import { offersReseedOnLoad } from "../reseed.js";
  import { session } from "../session.svelte.js";

  interface Props {
    /** Opens the create-operation workflow. Step 6 supplies it. */
    onCreate: () => void;

    /**
     * Reopens an existing Operation in the same workflow.
     *
     * The whole Operation is passed rather than its id: `fromOperation` needs
     * the value, and this component already holds it. Looking it up again by id
     * would be a second read of the same array with a `find` that cannot fail.
     */
    onEdit: (op: Operation) => void;
  }

  let { onCreate, onEdit }: Props = $props();

  const operations = $derived(session.file.config.operations);

  /**
   * `04` §3's sentence, compressed.
   *
   * The Blend is shown for every Target **except `tileId`**, which accepts only
   * `set` (`04` §7.2) — §7.7: "a control with one option is a control that
   * teaches the author nothing", and the same holds for a readout.
   */
  function summarize(op: Operation): string {
    const blend = TARGETS[op.target].type === "tile" ? "" : ` (${op.blend})`;
    return `${op.selection.type} · ${op.source.type} → ${op.target}${blend}`;
  }

  /**
   * `04` §6.2, §6.3 — the mapping is what gives the Source's bare `[0, 1)` its
   * units, so a summary without it says nothing about what the Operation does.
   */
  function mappingOf(op: Operation): string {
    if (op.target === "tileId") {
      const palette = (op.mapping as { palette: { tileId: string | null }[] }).palette;
      return palette.map((e) => e.tileId ?? "∅").join(" · ");
    }
    const m = op.mapping as { range: [number, number]; steps?: number };
    // §7.4: `steps` absent is a *meaning* — continuous — not a default value.
    return `[${m.range[0]}, ${m.range[1]}]${m.steps === undefined ? "" : ` × ${m.steps}`}`;
  }
</script>

{#if operations.length === 0}
  <p class="empty">
    Nothing is drawn yet. A fresh document generates a grid of
    <code>tileId: null</code> — legal, and renders nothing
    (<code>02</code>&nbsp;§8.1, <strong>G4</strong>).
  </p>
{:else}
  <ol class="stack">
    {#each operations as op, index (op.id)}
      <li>
        <!--
          The index is shown because the stack runs in this order and later
          Operations blend onto earlier ones (`02` §9). It is **not** the
          Operation's identity: `02` §6.3 attaches randomness to `id` and
          `salt`, never to position, which is what makes a future reorder
          move the picture only where the author expects.
        -->
        <span class="index">{index + 1}</span>
        <div class="body">
          <span class="summary">{summarize(op)}</span>
          <span class="mapping">{mappingOf(op)}</span>
        </div>
        <code class="id">{op.id}</code>

        <!--
          §4.3 — the id survives the edit, and with it this Operation's hash
          channels, its index in the stack and its salt. Changing one parameter
          moves the picture by that parameter and by nothing else, which is what
          rebuilding the Operation from scratch could not do: a rebuild gets a
          new id, and **G3** attaches the randomness to it.
        -->
        <button
          class="edit"
          onclick={() => onEdit(op)}
          title="Edit — reopens this operation in the same four-step panel, keeping its id and salt"
          aria-label="Edit operation {op.id}"
        >
          ✎
        </button>

        <!--
          §8.3 — **offered on every Operation**, not only stochastic ones,
          because the Operation's `random` Selection consumes the salt even
          where the Source does not (`04` §4.3). One click moves both channels.
        -->
        <button
          class="reroll"
          onclick={() => session.apply(rerollOperation(op.id))}
          title="Reroll — increments salt, moving this Operation's Source and Selection together"
          aria-label="Reroll operation {op.id}"
        >
          ⟳
        </button>

        <button
          class="remove"
          onclick={() => session.apply(removeOperation(op.id))}
          aria-label="Remove operation"
        >
          ×
        </button>

        <div class="flags">
          <span class="salt">salt <code>{op.salt ?? 0}</code></span>

          <!--
            §8.4 — the flag is offered **only where the Source is stochastic**,
            read from the registry's `stochastic` declaration and never from a
            list of Source names. `05` §6.1: a reroll control doing nothing
            "reads as a broken engine rather than a mislabelled Source".

            An imported file carrying the flag over a non-stochastic Source is
            left alone and reported, never silently cleared — the advisory is
            in the panel below, not a correction here.
          -->
          {#if offersReseedOnLoad(op)}
            <label>
              <input
                type="checkbox"
                checked={op.reseedOnLoad === true}
                onchange={(e) => session.apply(setReseedOnLoad(op.id, e.currentTarget.checked))}
              />
              reseed on load
            </label>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
{/if}

<button class="create" onclick={onCreate}>
  {operations.length === 0 ? "Create the first operation" : "Add operation"}
</button>

<style>
  /* The panel shell and its heading belong to `lib/Section.svelte`, which wraps
     this component in the sidebar. */

  .empty {
    margin: 0 0 0.75rem;
    font-size: 0.78rem;
    line-height: 1.5;
    color: #a0aec0;
  }

  .stack {
    list-style: none;
    margin: 0 0 0.75rem;
    padding: 0;
    display: grid;
    gap: 0.35rem;
  }

  .stack li {
    display: grid;
    grid-template-columns: 1.4rem 1fr auto auto auto auto;
    align-items: center;
    gap: 0.5rem;
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 0.45rem 0.55rem;
  }

  .index {
    font-size: 0.7rem;
    color: #a0aec0;
    text-align: right;
  }

  .body {
    display: grid;
    min-width: 0;
  }

  .summary {
    font-size: 0.82rem;
    color: #1a202c;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mapping {
    font-size: 0.7rem;
    color: #5a6b80;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .id {
    font-size: 0.7rem;
    color: #a0aec0;
  }

  /* Spans every column, so the flags sit under the summary rather than
     squeezing it. */
  .flags {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.7rem;
    color: #a0aec0;
  }

  .flags label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
  }

  .flags input {
    margin: 0;
  }

  /* Edit and reroll are the two non-destructive row actions and read as a pair;
     remove is the destructive one and keeps its own weight (§9.2). */
  .edit,
  .reroll {
    background: transparent;
    border: 0;
    color: #5a6b80;
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1;
    padding: 0 0.2rem;
  }

  .edit:hover,
  .reroll:hover {
    color: #3182ce;
  }

  .remove {
    background: transparent;
    border: 0;
    color: #a0aec0;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0 0.25rem;
  }

  .remove:hover {
    color: #c53030;
  }

  .create {
    width: 100%;
    background: #cbd5e0;
    border: 1px solid #a0aec0;
    color: inherit;
    border-radius: 4px;
    padding: 0.4rem 0.7rem;
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .create:hover {
    background: #a0aec0;
  }

  code {
    font-family: ui-monospace, monospace;
    font-size: 0.85em;
    color: #2b6cb0;
  }
</style>
