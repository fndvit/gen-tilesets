<!--
  New tileset: a Form popup (`DESIGN_SYSTEM.md` *New tileset*, B-016 S3b).
  Opened by New in the top bar. It replaces the "Start a new tileset?"
  Dialog: the choice and the warning are one step, not a menu and then a
  Dialog (Pol, S1: 1B).

  **Start** is a described Radio list, Empty or From template, and opens on
  Empty, which is what New did before. Choosing From template shows the
  **Template** list under it, with its first template chosen.

  ## Nothing is fetched until From template is chosen

  The manifest is fetched the first time From template is chosen, and then
  shared for the session, with the Tile gallery too (`starters-client.ts`); a failed fetch is forgotten,
  so choosing it again retries. The template's files are fetched only on
  "Open <name>". Until then the list shows the committed thumbnail.

  ## A template opens exactly as an import of it would

  `loadTemplate` builds the same `Archive` an exported zip unpacks to, and it
  goes through `prepareArchive` and `adopt`, as Import does. So a template
  that would not open is reported by the same "Import refused" Popup
  (`ImportRefused.svelte`), naming the template, and changes nothing.

  While it loads, the verb reads "Opening…", is disabled, and the popup stays
  open. If the popup is closed during the load anyway (Esc), the load is
  abandoned: the author cancelled, so the document is not replaced behind
  their back.

  Empty calls the caller's `onEmpty`, `App.svelte`'s `newTileset`, which is
  unchanged.
-->
<script lang="ts">
  import type { ValidationError } from "@vit-foundation/gen-tilesets";
  import { adopt } from "../../adopt.js";
  import { prepareArchive } from "../../import.js";
  import { BASE, manifest } from "../../starters-client.js";
  import { loadTemplate, type TemplateEntry } from "../../starters.js";
  import ImportRefused from "../ImportRefused.svelte";
  import LossWarning from "../LossWarning.svelte";
  import Button from "../ui/Button.svelte";
  import Icon from "../ui/Icon.svelte";
  import Popup from "../ui/Popup.svelte";
  import RadioList from "../ui/RadioList.svelte";

  interface Props {
    open?: boolean;
    /** Starts an empty tileset: `App.svelte`'s `newTileset`. */
    onEmpty: () => Promise<void> | void;
  }

  let { open = $bindable(false), onEmpty }: Props = $props();

  type Start = "empty" | "template";

  let start = $state<Start>("empty");
  let templates = $state<TemplateEntry[] | null>(null);
  let loadError = $state<string | null>(null);
  let chosen = $state<string | null>(null);
  let busy = $state(false);

  const template = $derived(templates?.find((t) => t.id === chosen) ?? null);
  const verb = $derived(
    start === "empty" ? "Start new" : busy ? "Opening…" : template ? `Open ${template.label}` : "Open template",
  );
  const ready = $derived(!busy && (start === "empty" || template !== null));

  /** The refusal, shown once the popup has closed. */
  let reporting = $state(false);
  let subject = $state<string | undefined>(undefined);
  let failure = $state<string | null>(null);
  let newer = $state<number | null>(null);
  let errors = $state<ValidationError[]>([]);

  /**
   * Bumped whenever the popup closes. A template load compares it before it
   * acts, so a load the author closed the popup on does nothing.
   */
  let generation = 0;

  let body = $state<HTMLElement | undefined>(undefined);

  function choose(next: Start): void {
    start = next;
    if (next === "template" && templates === null) void showTemplates();
  }

  async function showTemplates(): Promise<void> {
    loadError = null;
    try {
      const loaded = (await manifest()).templates;
      templates = loaded;
      // "Its first template is chosen when it appears."
      chosen ??= loaded[0]?.id ?? null;
    } catch (cause) {
      loadError = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function confirm(close: () => void): Promise<void> {
    if (start === "empty") {
      await onEmpty();
      close();
      return;
    }
    if (template === null) return;

    const entry = template;
    const mine = generation;
    busy = true;
    try {
      const prepared = prepareArchive(await loadTemplate(entry, (url) => fetch(url), BASE));
      if (mine !== generation) return;
      if (prepared.kind === "ready") {
        await adopt(prepared);
        close();
        return;
      }
      close();
      report(entry, prepared.kind === "newer" ? { newer: prepared.declared } : { errors: prepared.errors });
    } catch (cause) {
      if (mine !== generation) return;
      close();
      report(entry, { failure: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      busy = false;
    }
  }

  function report(
    entry: TemplateEntry,
    what: { failure?: string; newer?: number; errors?: ValidationError[] },
  ): void {
    subject = entry.label;
    failure = what.failure ?? null;
    newer = what.newer ?? null;
    errors = what.errors ?? [];
    reporting = true;
  }

  function clearReport(): void {
    failure = null;
    newer = null;
    errors = [];
  }

  /** Every opening starts on Empty, as New did before (S2). */
  function closed(): void {
    generation += 1;
    start = "empty";
    loadError = null;
  }
</script>

<Popup
  title="New tileset"
  bind:open
  closable
  wide
  onClose={closed}
  initialFocus={() => body?.querySelector<HTMLElement>("input[type=radio]:checked")}
>
  <div class="form" bind:this={body}>
    <RadioList
      legend="Start"
      legendHidden
      name="new-tileset-start"
      options={[
        { key: "empty", label: "Empty", description: "A blank grid. Add your own tiles." },
        { key: "template", label: "From template", description: "A finished tileset to change and learn from." },
      ]}
      bind:value={() => start, choose}
    />

    {#if start === "template"}
      <fieldset class="templates">
        <legend class="t-label">Template</legend>
        {#if loadError !== null}
          <p class="status error t-body" role="status">
            <span class="mark"><Icon name="alert" /></span>
            <span>Couldn't load the templates: <span class="t-console">{loadError}</span></span>
          </p>
        {:else if templates === null}
          <p class="status muted t-body" role="status">Loading templates…</p>
        {:else}
          <div class="well">
            {#each templates as entry (entry.id)}
              <label class="card" class:chosen={entry.id === chosen}>
                <input
                  class="visually-hidden"
                  type="radio"
                  name="new-tileset-template"
                  value={entry.id}
                  bind:group={chosen}
                />
                <img class="thumb" src={BASE + entry.thumb} alt="" width="96" height="60" />
                <span class="text">
                  <span class="t-title">{entry.label}</span>
                  <!-- Unbreakable parts: a narrow popup wraps between them, never beside the "·". -->
                  <span class="t-console muted summary">
                    {#each entry.summary.split(" · ") as part, i (i)}
                      <span class="part">{i > 0 ? "· " : ""}{part}</span>
                    {/each}
                  </span>
                </span>
              </label>
            {/each}
          </div>
        {/if}
      </fieldset>
    {/if}

    <LossWarning />
  </div>

  {#snippet actions(close)}
    <Button label="Cancel" onclick={close} />
    <Button label={verb} variant="primary" disabled={!ready} onclick={() => confirm(close)} />
  {/snippet}
</Popup>

<ImportRefused bind:open={reporting} {subject} {failure} {newer} {errors} onClose={clearReport} />

<style>
  .form {
    display: grid;
    gap: var(--space-6);
  }

  p {
    margin: 0;
  }

  .templates {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    padding: 0;
    margin-bottom: var(--space-3);
  }

  .well {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    background: var(--color-field);
  }

  /*
    A card per template: white on the well, the 96 × 60 thumbnail, the name
    over its summary. Chosen is the glyph grid's 2px ink ring, not the accent:
    the accent only means "editing now" (S2).
  */
  .card {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-4);
    border-radius: calc(var(--radius-sm) - var(--space-1));
    background: var(--color-panel);
    color: var(--color-ink);
    cursor: pointer;
    transition: box-shadow var(--dur-fast) var(--ease);
  }

  .card:hover:not(.chosen) {
    box-shadow: inset 0 0 0 var(--rule-w) var(--color-ink);
  }

  .card.chosen {
    box-shadow: inset 0 0 0 var(--rule-strong) var(--color-ink);
    cursor: default;
  }

  .card:has(:focus-visible) {
    outline: var(--focus-w) solid var(--color-accent);
    outline-offset: 0;
  }

  .thumb {
    flex: none;
    width: var(--template-thumb-w);
    height: auto;
    aspect-ratio: 16 / 10;
    object-fit: cover;
    border-radius: var(--radius-xs);
    background: var(--color-field);
  }

  .text {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .muted {
    color: var(--color-muted);
  }

  .summary {
    display: flex;
    flex-wrap: wrap;
    column-gap: 1ch;
  }

  .part {
    white-space: nowrap;
  }

  .status {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    overflow-wrap: anywhere;
  }

  .mark {
    flex: none;
    display: inline-flex;
    color: var(--color-danger);
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
