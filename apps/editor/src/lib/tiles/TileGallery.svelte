<!--
  The Tile gallery: a Form popup that adds pictures as a new tile group, or
  as variants of one (`DESIGN_SYSTEM.md` *Tile gallery*, B-016 S3c).

  **Every Add in Tiles opens it** (Pol, S3c, replacing the planned Add menu):
  the section's "+", the "Add tile group" bar, and a group's square "+".
  Dropping files still adds at once, because a drop has already chosen.

  ## Two sources, one pick order

  The body holds two grids: **My tiles**, the pictures the author uploaded
  (`my-tiles.ts`, kept across reloads), then the editor's own collection
  (`starters.json`). **Upload…** at the footer's left puts files into My tiles,
  picked (Pol, S3c). One Add then adds every pick, from either grid, in the
  order picked, which becomes the variant order (`gallery.ts`).

  ## Nothing is fetched until it is needed

  Opening fetches the manifest (shared with New tileset, `starters-client.ts`)
  and the collection's small thumbnails. A picture's full file is fetched only
  on Add. My tiles' thumbnails are object URLs of the stored pictures, made on
  opening and revoked on closing.

  ## The name is checked on Add

  Never while typing (the editor's commit rule). An empty or taken name is a
  **Field error** under the field, focus goes back to it, and nothing is
  fetched. The section still re-checks after the fetch, since a group may have
  been made meanwhile, and falls back to "Mix 2" rather than refusing late.

  ## Adding

  The verb reads "Adding…" while the picks become files (`filesOf`), then the
  section's `onAdd` attaches them through the same path a drop takes. If the
  popup is closed during that (Esc), the add is abandoned, as New tileset's
  template load is: the author cancelled.

  Each grid is one Tab stop: the arrow keys, Home and End move between cells
  (TilePicker's pattern, with a roving tabindex), and Space or Enter toggles.

  ## The Collection is one grid

  Every picture, Collage's then the shapes, in manifest order. Rejected: tabs
  (Images and Shapes, batch 03 D-04). They were built and then removed by Pol,
  who wants every picture in the same place.
-->
<script lang="ts" module>
  import { once } from "../../starters.js";
  import { openShelf } from "../../my-tiles.js";

  /** Opened on first use and shared; `openShelf` never rejects (it falls back to memory). */
  const shelf = once(() => openShelf());
</script>

<script lang="ts">
  import { untrack } from "svelte";
  import { measure, tileNameOf } from "../../assets.js";
  import { fileOf, upload, type MyTile, type TileShelf } from "../../my-tiles.js";
  import { session } from "../../session.svelte.js";
  import { BASE, manifest } from "../../starters-client.js";
  import { loadGalleryFiles, type GalleryEntry } from "../../starters.js";
  import Button from "../ui/Button.svelte";
  import Dialog from "../ui/Dialog.svelte";
  import Icon from "../ui/Icon.svelte";
  import Popup from "../ui/Popup.svelte";
  import {
    checkName,
    countOf,
    filesOf,
    galleryKey,
    mineKey,
    pickAll,
    sourceOf,
    togglePick,
    verbOf,
    type GalleryMode,
    type PickedFiles,
    type PickKey,
  } from "./gallery.js";

  interface Props {
    open?: boolean;
    mode: GalleryMode;
    /**
     * Adds the picked pictures: the section attaches them. `files` may be
     * empty when every pick failed; the section then reports `failures`.
     */
    onAdd: (picked: { files: File[]; failures: string[]; name: string }) => Promise<void> | void;
  }

  let { open = $bindable(false), mode, onAdd }: Props = $props();

  let entries = $state<GalleryEntry[] | null>(null);
  let loadError = $state<string | null>(null);

  let store = $state<TileShelf | null>(null);
  let mine = $state<MyTile[]>([]);
  /** My tiles' thumbnails, by id. Made on opening, revoked on closing. */
  let thumbs = $state<Record<string, string>>({});
  let uploadFailures = $state<string[]>([]);

  let picked = $state<PickKey[]>([]);
  let name = $state("");
  let nameError = $state<string | null>(null);
  let busy = $state(false);
  let confirming = $state(false);

  let nameInput = $state<HTMLInputElement | undefined>(undefined);
  let fileInput = $state<HTMLInputElement | undefined>(undefined);
  let body = $state<HTMLElement | undefined>(undefined);

  const nameId = $props.id();
  const errorId = `${nameId}-error`;
  const title = $derived(mode.kind === "group" ? "Tile gallery" : `Add to ${mode.tileName}`);
  const hint = $derived(
    mode.kind === "group"
      ? "Pick one or more. They become one new tile group."
      : "Pick one or more to add as variants.",
  );
  const verb = $derived(busy ? "Adding…" : verbOf(mode, picked.length));
  const pickedMine = $derived(picked.filter((k) => sourceOf(k).source === "mine"));

  /** Bumped on every close, so an add the author closed the popup on does nothing. */
  let generation = 0;

  $effect(() => {
    // Only `open` is a dependency: what `opened` reads and writes must not re-run it.
    if (open) untrack(() => void opened());
  });

  async function opened(): Promise<void> {
    void showMine();
    if (entries !== null) return;
    loadError = null;
    try {
      entries = (await manifest()).gallery;
    } catch (cause) {
      loadError = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function showMine(): Promise<void> {
    store ??= await shelf();
    const listed = await store.list();
    const next: Record<string, string> = {};
    for (const tile of listed) next[tile.id] = thumbs[tile.id] ?? URL.createObjectURL(tile.blob);
    for (const [id, url] of Object.entries(thumbs)) if (!(id in next)) URL.revokeObjectURL(url);
    thumbs = next;
    mine = listed;
    // A picture removed elsewhere (another tab) can't stay picked.
    picked = picked.filter((k) => sourceOf(k).source !== "mine" || sourceOf(k).id in next);
  }

  /** The same measurement an attach makes, so a file that would fail on Add never reaches My tiles. */
  async function check(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    try {
      await measure(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function onUpload(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const files = input.files === null ? [] : Array.from(input.files);
    // Cleared so choosing the same file twice in a row fires `change` again.
    input.value = "";
    if (files.length === 0) return;
    store ??= await shelf();
    const { ids, failures } = await upload(store, files, check);
    uploadFailures = failures;
    await showMine();
    picked = pickAll(picked, ids.map(mineKey));
  }

  async function removePicked(): Promise<void> {
    if (store === null) return;
    const ids = pickedMine.map((k) => sourceOf(k).id);
    await store.remove(ids);
    picked = picked.filter((k) => sourceOf(k).source !== "mine");
    await showMine();
  }

  function load(key: PickKey): Promise<PickedFiles> {
    const { source, id } = sourceOf(key);
    if (source === "mine") {
      const tile = mine.find((t) => t.id === id);
      return Promise.resolve(
        tile ? { files: [fileOf(tile)], failures: [] } : { files: [], failures: [`${id}: no longer in My tiles`] },
      );
    }
    const entry = entries?.find((e) => e.id === id);
    if (entry === undefined) return Promise.resolve({ files: [], failures: [`${id}: not in the gallery`] });
    return loadGalleryFiles([entry], (url) => fetch(url), BASE);
  }

  async function add(close: () => void): Promise<void> {
    if (mode.kind === "group") {
      const problem = checkName(session.file, name);
      if (problem !== null) {
        nameError = problem;
        nameInput?.focus();
        return;
      }
    }
    const ticket = generation;
    busy = true;
    try {
      const { files, failures } = await filesOf(picked, load);
      if (ticket !== generation) return;
      close();
      await onAdd({ files, failures, name: name.trim() });
    } finally {
      busy = false;
    }
  }

  function closed(): void {
    generation += 1;
    picked = [];
    name = "";
    nameError = null;
    uploadFailures = [];
    for (const url of Object.values(thumbs)) URL.revokeObjectURL(url);
    thumbs = {};
    // A failed manifest is forgotten, so the next opening tries again.
    if (loadError !== null) entries = null;
  }

  /** Arrow keys, Home and End within one grid (TilePicker's pattern), with a roving tabindex. */
  function onkeydown(event: KeyboardEvent): void {
    const grid = event.currentTarget as HTMLElement;
    const all = Array.from(grid.querySelectorAll<HTMLButtonElement>(".cell"));
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    const top = all[0]?.offsetTop;
    const n = all.findIndex((c) => c.offsetTop !== top);
    const cols = n === -1 ? all.length : n;
    const go = (i: number) => all[Math.min(Math.max(i, 0), all.length - 1)]?.focus();
    if (event.key === "ArrowRight") go(at + 1);
    else if (event.key === "ArrowLeft") go(at - 1);
    else if (event.key === "ArrowDown") go(at + cols);
    else if (event.key === "ArrowUp") go(at - cols);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(all.length - 1);
    else return;
    event.preventDefault();
  }

  /** The cell that has focus becomes its grid's Tab stop, however it got focus (arrows, click). */
  function onfocusin(event: FocusEvent): void {
    const grid = event.currentTarget as HTMLElement;
    const focused = event.target as HTMLElement;
    if (!focused.classList.contains("cell")) return;
    for (const cell of Array.from(grid.querySelectorAll<HTMLButtonElement>(".cell"))) cell.tabIndex = cell === focused ? 0 : -1;
  }

  function firstCell(): HTMLElement | null | undefined {
    return body?.querySelector<HTMLElement>(".cell");
  }
</script>

{#snippet cell(key: PickKey, label: string, src: string, first: boolean)}
  {@const on = picked.includes(key)}
  <button
    type="button"
    class="cell"
    class:on
    aria-pressed={on}
    aria-label={label}
    title={label}
    tabindex={first ? 0 : -1}
    onclick={() => (picked = togglePick(picked, key))}
  >
    <img class="thumb" {src} alt="" width="52" height="52" loading="lazy" />
    {#if on}<span class="badge"><Icon name="check" /></span>{/if}
  </button>
{/snippet}

{#snippet grid(label: string, cells: { key: PickKey; label: string; src: string }[])}
  <!--
    The first cell is the grid's one Tab stop until focus moves within it. The
    keys are handled on the group because they move between its cells; each
    cell is itself a button, so nothing here is reachable only by pointer.
  -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="grid" role="group" aria-label={label} {onkeydown} {onfocusin}>
    {#each cells as c, i (c.key)}
      {@render cell(c.key, c.label, c.src, i === 0)}
    {/each}
  </div>
{/snippet}

<Popup
  {title}
  bind:open
  closable
  wide
  divided
  onClose={closed}
  initialFocus={() => (mode.kind === "group" ? nameInput : firstCell())}
>
  <div class="form" bind:this={body}>
    <p class="t-body muted">{hint}</p>

    {#if mode.kind === "group"}
      <div class="field">
        <label class="t-label" for={nameId}>Name</label>
        <input
          id={nameId}
          class="t-body"
          type="text"
          spellcheck="false"
          autocomplete="off"
          aria-invalid={nameError !== null}
          aria-describedby={nameError !== null ? errorId : undefined}
          bind:this={nameInput}
          bind:value={name}
          oninput={() => (nameError = null)}
        />
        {#if nameError !== null}
          <p class="field-error t-body" id={errorId}>
            <span class="mark"><Icon name="alert" /></span>
            <span>{nameError}</span>
          </p>
        {/if}
      </div>
    {/if}

    <div class="shelves">
      <section class="shelf" aria-labelledby="{nameId}-mine">
        <div class="shelf-head">
          <h3 class="t-label" id="{nameId}-mine">My tiles</h3>
          {#if mine.length > 0}
            <Button
              label="Remove picked…"
              variant="tertiary"
              disabled={pickedMine.length === 0 || busy}
              onclick={() => (confirming = true)}
            />
          {/if}
        </div>
        {#if store !== null && !store.persistent}
          <p class="t-body muted">Your uploads can't be saved in this browser and will be gone when you reload.</p>
        {/if}
        {#if mine.length === 0}
          <p class="t-body muted">Pictures you upload appear here.</p>
        {:else}
          {@render grid(
            "My tiles",
            mine.map((t) => ({ key: mineKey(t.id), label: tileNameOf(t.name), src: thumbs[t.id] ?? "" })),
          )}
        {/if}
      </section>

      <section class="shelf" aria-labelledby="{nameId}-collection">
        <div class="shelf-head">
          <h3 class="t-label" id="{nameId}-collection">Collection</h3>
        </div>
        {#if loadError !== null}
          <p class="status t-body" role="status">
            <span class="mark"><Icon name="alert" /></span>
            <span>Couldn't load the gallery: <span class="t-console">{loadError}</span></span>
          </p>
        {:else if entries === null}
          <p class="t-body muted" role="status">Loading the gallery…</p>
        {:else}
          {@render grid(
            "Collection",
            entries.map((e) => ({ key: galleryKey(e.id), label: e.label, src: BASE + e.thumb })),
          )}
        {/if}
      </section>
    </div>

    {#if uploadFailures.length > 0}
      <div class="status t-body" role="status">
        <span class="mark"><Icon name="alert" /></span>
        <div>
          <p>{uploadFailures.length === 1 ? "This file wasn't uploaded:" : "These files weren't uploaded:"}</p>
          {#each uploadFailures as failure, i (i)}
            <p class="t-console">{failure}</p>
          {/each}
        </div>
      </div>
    {/if}

    <input
      class="picker"
      type="file"
      multiple
      accept="image/*"
      tabindex="-1"
      aria-hidden="true"
      bind:this={fileInput}
      onchange={onUpload}
    />
  </div>

  {#snippet actions(close)}
    <div class="footer">
      <span class="lead">
        <Button label="Upload…" icon="upload" disabled={busy} onclick={() => fileInput?.click()} />
        <span class="count t-console muted" role="status">{countOf(picked.length)}</span>
      </span>
      <span class="verbs">
        <Button label="Cancel" onclick={close} />
        <Button label={verb} variant="primary" disabled={busy || picked.length === 0} onclick={() => add(close)} />
      </span>
    </div>
  {/snippet}
</Popup>

<Dialog
  title={pickedMine.length === 1 ? "Remove 1 picture from My tiles?" : `Remove ${pickedMine.length} pictures from My tiles?`}
  bind:open={confirming}
  confirmLabel="Remove"
  onConfirm={() => void removePicked()}
>
  <p class="t-body">
    They stay in any tileset they were already added to. Removing them from My tiles can't be undone.
  </p>
</Dialog>

<style>
  .form {
    display: grid;
    gap: var(--space-6);
  }

  p {
    margin: 0;
  }

  .muted {
    color: var(--color-muted);
  }

  .field {
    display: grid;
    gap: var(--space-3);
  }

  /* The seed field's filled box (`SidebarFooter.svelte`), full width. */
  input[type="text"] {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    height: var(--control-h);
    padding: 0 var(--space-4);
    border: 0;
    border-radius: var(--radius-sm);
    background: var(--color-field);
    box-shadow: inset 0 calc(-1 * var(--rule-w)) 0 var(--color-edge);
    color: var(--color-ink);
    line-height: normal;
    text-box: none;
    transition: background-color var(--dur-fast) var(--ease);
  }

  input[type="text"]:hover {
    background: var(--color-field-hover);
  }

  input[type="text"]:focus-visible {
    outline-offset: 0;
  }

  /* A Field error: the colour is only on the icon, so the words and the shape carry it. */
  .field-error,
  .status {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    color: var(--color-ink);
    overflow-wrap: anywhere;
  }

  .status > div {
    display: grid;
    gap: var(--space-2);
  }

  .mark {
    flex: none;
    display: inline-flex;
    color: var(--color-danger);
  }

  /*
    The grids scroll on their own, so the name above and the footer below stay
    put (Popup's body would otherwise scroll as a whole). The height leaves the
    popup's bar, name and footer on a short window.
  */
  .shelves {
    display: grid;
    gap: var(--space-7);
    max-height: max(calc(var(--gallery-cell) * 2), calc(100dvh - 360px));
    overflow-y: auto;
    overscroll-behavior: contain;
    margin: 0 calc(-1 * var(--space-2));
    padding: var(--space-2);
  }

  .shelf {
    display: grid;
    gap: var(--space-4);
  }

  .shelf-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    min-height: var(--control-h);
  }

  h3 {
    margin: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, var(--gallery-cell));
    gap: var(--space-3);
  }

  .cell {
    position: relative;
    display: grid;
    place-items: center;
    width: var(--gallery-cell);
    height: var(--gallery-cell);
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    cursor: pointer;
    transition: background-color var(--dur-fast) var(--ease);
  }

  .cell:hover {
    background: var(--color-hover);
  }

  .cell:focus-visible {
    outline-offset: calc(-1 * var(--focus-w));
  }

  /* Picked: the glyph grid's 2px ink ring. */
  .cell.on {
    box-shadow: inset 0 0 0 var(--rule-strong) var(--color-selected);
  }

  /* Field grey until the thumbnail arrives, as a template card's does. */
  .thumb {
    display: block;
    box-sizing: border-box;
    width: var(--gallery-thumb);
    height: var(--gallery-thumb);
    border-radius: var(--radius-xs);
    object-fit: cover;
    background: var(--color-field);
    box-shadow: 0 0 0 var(--rule-w) var(--black-12);
  }

  .badge {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    display: grid;
    place-items: center;
    width: var(--gallery-badge);
    height: var(--gallery-badge);
    border-radius: var(--radius-round);
    background: var(--color-selected);
    color: var(--color-panel);
  }

  .badge :global(svg) {
    width: 12px;
    height: 12px;
  }

  /*
    Upload… and the count on the left, Cancel and the verb on the right. On a
    narrow window the verbs wrap onto their own line, still at the right.
  */
  .footer {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .lead,
  .verbs {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .verbs {
    margin-left: auto;
  }

  .count {
    white-space: nowrap;
  }

  .picker {
    display: none;
  }
</style>
