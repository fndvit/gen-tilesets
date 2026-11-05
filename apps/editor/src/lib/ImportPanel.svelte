<!--
  Import — `09-editor.md` §12.4, and **E14**'s inverse.

  Export writes a zip; this reads one back. It takes the exported `.zip` or the
  unzipped folder dragged in, because those are the two things the author
  actually has after an export, and both reduce to the same map of path → bytes
  before anything else happens.

  ## §12.4 is strict, and this obeys it exactly

  On a non-empty `ValidationError[]` **the file is not opened**: no partial
  import, no automatic repair, and no preview on the import screen — **S3**
  forbids mounting `<Tileset>` on a file that has not validated. The current
  document is untouched, so a refused import costs the author nothing.

  ## Older files are migrated; newer ones are refused

  `06` §4.3 pairs a bump with a **migration**, not with a rejection — "the
  migration table gains a row saying *nothing to do*". So an older file runs
  through `migrate()` first and opens, with an advisory saying it was upgraded.

  The *update the editor, not the file* screen is reserved for a file from a
  **newer** build, which is what §12.4 describes and the only case where that is
  the right advice. Reading it out of a `SCHEMA_VERSION_UNKNOWN` in the error
  list is what once told an author with an *old* file that their editor was at
  fault.

  ## The gestures are `sections/TilesSection.svelte`'s

  The same drop-plus-hidden-picker pattern, deliberately: `09` §10.3 fixes what
  an attach *writes* and leaves what starts one alone, so the two surfaces that
  take files from the author should take them the same way. On screen this is
  only the Import button in the sidebar footer; the caller passes the element
  that takes drops (`target`, the sidebar's top bar) and styles it from the bindable `over`.

  ## Reports appear after an attempt, in a popup

  A refusal, a newer-version file, or an import that opened with notes is shown
  in a closable `ui/Popup` once the attempt ends, and never takes space in the
  footer (Pol, 2026-11-04). Closing it clears the report.
-->
<script lang="ts">
  import { migrate, validate, type TilesetFile, type ValidationError } from "@vit-foundation/gen-tilesets";
  import { unzipSync } from "fflate";
  import { replaceAll, type Incoming } from "../assets.js";
  import { drafting } from "../drafting.svelte.js";
  import { mimeOf, nameOf, readArchive, type Archive } from "../import.js";
  import { session } from "../session.svelte.js";
  import Button from "./ui/Button.svelte";
  import Popup from "./ui/Popup.svelte";

  interface Props {
    /** The element that takes dropped zips and folders. */
    target?: HTMLElement | null;
    /** Whether a drag is over `target`. Purely visual, as in the tile library. */
    over?: boolean;
  }

  let { target = null, over = $bindable(false) }: Props = $props();

  let busy = $state(false);

  /** Whether the report popup is showing. Opened only at the end of an attempt. */
  let reporting = $state(false);

  /** The one refusal message, or the validation list. Never both. */
  let failure = $state<string | null>(null);
  let errors = $state<ValidationError[]>([]);
  /**
   * The version a file from a **newer** build declared — §12.4's case, and the
   * only one the author cannot fix by editing the file.
   *
   * Held as its own state rather than sniffed out of a `SCHEMA_VERSION_UNKNOWN`
   * in the error list. That code fires for an absent, fractional or unreachable
   * version too, and reading "update the editor" out of it was how an *older*
   * file came to be told the editor was at fault.
   */
  let newer = $state<number | null>(null);
  /** Non-fatal: an upgrade that happened, and pictures the archive did not carry. */
  let advisories = $state<string[]>([]);

  let picker = $state<HTMLInputElement | null>(null);

  function reset(): void {
    failure = null;
    errors = [];
    newer = null;
    advisories = [];
  }

  // -------------------------------------------------------------------------
  // Getting to a path → bytes map
  // -------------------------------------------------------------------------

  /**
   * A zip, unpacked. `fflate` is already the repo's one runtime dependency,
   * taken on at Step 11 because a browser cannot *write* a folder unaided; it
   * cannot read one back unaided either, and this is the other half of the same
   * call.
   */
  async function fromZip(file: File): Promise<Archive> {
    const zipped = new Uint8Array(await file.arrayBuffer());
    const flat = unzipSync(zipped);
    const out = new Map<string, Uint8Array>();
    for (const [path, bytes] of Object.entries(flat)) {
      // Directory entries carry a trailing slash and no bytes.
      if (!path.endsWith("/")) out.set(path, bytes);
    }
    return out;
  }

  /**
   * A dropped folder, walked.
   *
   * **The entries must be taken synchronously from the drop event.** A
   * `DataTransferItem` is invalidated once the handler yields, so
   * `webkitGetAsEntry()` is called on every item before the first `await` and the
   * traversal runs against the entry objects afterwards.
   *
   * `readEntries` returns in **batches** and must be called until it yields an
   * empty array — a directory of more than a hundred files silently truncates
   * otherwise, which would present as an import that lost half its pictures with
   * no error anywhere. That is the failure shape this package keeps refusing.
   */
  function entriesOf(event: DragEvent): FileSystemEntry[] {
    const items = event.dataTransfer?.items;
    if (items === undefined) return [];
    const out: FileSystemEntry[] = [];
    for (const item of Array.from(items)) {
      const entry = item.webkitGetAsEntry?.();
      if (entry !== null && entry !== undefined) out.push(entry);
    }
    return out;
  }

  function fileOf(entry: FileSystemFileEntry): Promise<File> {
    return new Promise((resolve, reject) => entry.file(resolve, reject));
  }

  function batchOf(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
  }

  async function walk(entry: FileSystemEntry, prefix: string, out: Map<string, Uint8Array>) {
    if (entry.isFile) {
      const file = await fileOf(entry as FileSystemFileEntry);
      out.set(prefix + entry.name, new Uint8Array(await file.arrayBuffer()));
      return;
    }
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const batch = await batchOf(reader);
      if (batch.length === 0) break;
      for (const child of batch) await walk(child, `${prefix}${entry.name}/`, out);
    }
  }

  /**
   * The dropped folder as an archive, rooted at the folder the author dragged.
   *
   * The folder's own name is **not** part of the paths, because `meta.src` is
   * relative to the export root (§11.1) and the author may have renamed the
   * folder. Dropping the contents rather than the folder works for the same
   * reason: what matters is that `tiles/…` resolves.
   */
  async function fromFolder(entries: FileSystemEntry[]): Promise<Archive> {
    const out = new Map<string, Uint8Array>();
    for (const entry of entries) {
      if (entry.isDirectory && entries.length === 1) {
        // One folder dropped: its contents are the root.
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        for (;;) {
          const batch = await batchOf(reader);
          if (batch.length === 0) break;
          for (const child of batch) await walk(child, "", out);
        }
      } else {
        await walk(entry, "", out);
      }
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // The import itself
  // -------------------------------------------------------------------------

  /**
   * §12.4's sequence, in order, with no partial states.
   *
   * Read → parse → **migrate** → **validate** → attach → swap. Nothing before
   * the last two lines touches the document, so every refusal above them leaves
   * the author exactly where they were.
   *
   * **Migration precedes validation** and is a separate function — `06` §9.2
   * forbids validation from coercing anything, and rewriting a `schemaVersion`
   * is a coercion. `validate()` therefore still knows exactly one version, and
   * sees a file that already claims it.
   */
  async function open(archive: Archive): Promise<void> {
    const { file: read, assets, missing } = readArchive(archive);

    const outcome = migrate(read);
    // §12.4's case, and the only one where *update the editor, not the file* is
    // the right advice. An **older** file is migrated below, not refused.
    if (outcome.kind === "newer") {
      newer = outcome.declared;
      return;
    }
    // Absent, non-integer, or a past version with no path. Left to `validate()`,
    // which reports it at `/schemaVersion` like any other error rather than
    // getting a screen of its own for a problem it does not have.
    const file = outcome.kind === "migrated" ? outcome.file : read;

    const found = validate(file);
    if (found.length > 0) {
      errors = found;
      return;
    }

    const incoming: Incoming[] = assets.map((asset) => ({
      tileId: asset.tileId,
      assetId: asset.assetId,
      file: new File([asset.bytes as BlobPart], nameOf(asset.path), { type: mimeOf(asset.path) }),
    }));

    const failed = await replaceAll(incoming);

    // Validated above, so this is a `TilesetFile` by the only test there is.
    session.open(file as TilesetFile);
    // A draft built against the outgoing document names ids the incoming one
    // does not have.
    drafting.discard();

    advisories = [
      // **E16** — it never blocks, and the upgrade already happened. The second
      // clause is the part the author cannot infer: the document now in the
      // editor differs from the file still on their disk.
      ...(outcome.kind === "migrated"
        ? outcome.steps.map(
            (step) =>
              `Upgraded from schemaVersion ${step.from} — ${step.note}. ` +
              `Export to save the new form; older builds will not read it.`,
          )
        : []),
      ...missing.map((path) => `${path} — the archive carries no such file. That cell draws nothing.`),
      ...failed.map((f) => `${f.tileId}/${f.assetId} — ${f.reason}`),
    ];
  }

  async function run(archive: Promise<Archive>): Promise<void> {
    reset();
    busy = true;
    try {
      await open(await archive);
    } catch (cause) {
      failure = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busy = false;
      reporting = failure !== null || errors.length > 0 || newer !== null || advisories.length > 0;
    }
  }

  /** "Refused" when the document was not touched, "Imported" when it opened with notes. */
  const reportTitle = $derived(advisories.length > 0 ? "Imported, with notes" : "Import refused");

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    over = false;

    // Taken before any `await` — see `entriesOf`.
    const entries = entriesOf(event);
    const files = Array.from(event.dataTransfer?.files ?? []);

    if (entries.some((entry) => entry.isDirectory)) {
      void run(fromFolder(entries));
      return;
    }
    if (files.length > 0) {
      void run(fromZip(files[0]!));
      return;
    }
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    over = true;
  }

  // Listeners on the caller's element, so the whole footer takes a drop.
  $effect(() => {
    const el = target;
    if (el === null) return;
    const leave = (): void => {
      over = false;
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", leave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", leave);
      el.removeEventListener("drop", onDrop);
    };
  });

  function onPick(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file !== undefined) void run(fromZip(file));
    // Cleared so choosing the same file twice in a row fires `change` again.
    input.value = "";
  }
</script>

<Button
  label={busy ? "Importing…" : "Import"}
  icon="import"
  disabled={busy}
  onclick={() => picker?.click()}
/>
<input
  class="picker"
  type="file"
  accept=".zip,application/zip"
  bind:this={picker}
  onchange={onPick}
  tabindex="-1"
  aria-hidden="true"
/>

<Popup title={reportTitle} bind:open={reporting} onClose={reset}>
  {#if failure !== null}
    <p class="t-body">Not opened. Nothing in the current document has changed.</p>
    <p class="t-console detail">{failure}</p>
  {/if}

  <!--
    §12.4's own case: the file was written by a **newer** build, and the action
    is to update the editor rather than to fix the file. It is the one failure
    the author cannot repair by editing anything.

    It is its own message rather than a row in the error list because there is
    nothing to list: no field is wrong, and `06` **C2** forbids inferring a shape
    from the keys present, so the file was never walked.
  -->
  {#if newer !== null}
    <p class="t-body">
      This file was written by a newer build (schemaVersion {newer}). Update the editor, not the
      file.
    </p>
  {/if}

  <!--
    **C6**: no partial load and no severity axis. The file was not opened; the
    document on screen is the one that was already there.
  -->
  {#if errors.length > 0}
    <p class="t-body">Not opened. Nothing in the current document has changed.</p>
    <ul class="t-console">
      {#each errors.slice(0, 12) as error, i (i)}
        <li><strong>{error.path || "/"}</strong> {error.code} {error.message}</li>
      {/each}
      {#if errors.length > 12}
        <li>…and {errors.length - 12} more</li>
      {/if}
    </ul>
  {/if}

  <!--
    Opened, with holes. A document whose pictures are absent is still a legal
    file and the author can repair it by dropping the images back in. Refusing
    would throw away the operations, the seed and the layout over a picture.
  -->
  {#if advisories.length > 0}
    <ul class="t-console">
      {#each advisories as advisory, i (i)}
        <li>{advisory}</li>
      {/each}
    </ul>
  {/if}
</Popup>

<style>
  .picker {
    display: none;
  }

  p {
    margin: 0 0 var(--space-4);
  }

  .detail {
    overflow-wrap: anywhere;
  }

  ul {
    display: grid;
    gap: var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
    line-height: var(--leading-hint);
    text-box: none;
    overflow-wrap: anywhere;
  }

  strong {
    font-weight: inherit;
    text-decoration: underline;
  }
</style>
