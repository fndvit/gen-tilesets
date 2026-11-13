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

  A refusal or a newer-version file is shown in `ImportRefused.svelte`, a
  closable `ui/Popup`, once the attempt ends, and never takes space in the
  layout (Pol, 2026-11-04). Closing it clears the report. The New tileset
  popup reports a template that fails to open in the same component.

  An import that opened with notes (an upgrade, unreadable pictures)
  opens: there is nothing to answer, so its notes are notices in the preview's
  stack instead (Stage 2, W3), beside the picture they are about.

  ## It asks first, unless there is nothing to lose

  An import cannot be undone (`session.open` says why), so a file that is
  ready to open waits on a Dialog with New tileset's warning line
  (`LossWarning.svelte`). It asks only once the file has validated: a refused
  file changes nothing, and a question before the refusal would guard nothing.
  When the current tileset `isBlank` (`document.ts`), it opens at once (Pol,
  2026-11-09).
-->
<script lang="ts">
  import type { ValidationError } from "@vit-foundation/gen-tilesets";
  import { unzipSync } from "fflate";
  import { adopt } from "../adopt.js";
  import { isBlank } from "../document.js";
  import { prepareArchive, type Archive, type Prepared } from "../import.js";
  import { session } from "../session.svelte.js";
  import ImportRefused from "./ImportRefused.svelte";
  import LossWarning from "./LossWarning.svelte";
  import Button from "./ui/Button.svelte";
  import Dialog from "./ui/Dialog.svelte";

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

  let picker = $state<HTMLInputElement | null>(null);

  /** A validated file waiting on the author's answer, and whether the question shows. */
  let pending = $state.raw<Extract<Prepared, { kind: "ready" }> | null>(null);
  let asking = $state(false);

  function reset(): void {
    failure = null;
    errors = [];
    newer = null;
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
   * `prepareArchive` (`import.ts`) reads, migrates and validates, and touches
   * nothing; `adopt` (`adopt.ts`) swaps the document in. So every refusal leaves
   * the author exactly where they were. The New tileset popup's templates go
   * through the same pair (B-016).
   */
  async function open(archive: Archive): Promise<void> {
    const prepared = prepareArchive(archive);
    if (prepared.kind === "newer") {
      newer = prepared.declared;
      return;
    }
    if (prepared.kind === "invalid") {
      errors = prepared.errors;
      return;
    }
    if (isBlank(session.file)) {
      await adopt(prepared);
      return;
    }
    pending = prepared;
    asking = true;
  }

  /** The Dialog's verb. The file was validated before the question, so this only swaps it in. */
  async function confirmImport(): Promise<void> {
    const prepared = pending;
    pending = null;
    if (prepared !== null) await adopt(prepared);
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
      reporting = failure !== null || errors.length > 0 || newer !== null;
    }
  }


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

<ImportRefused bind:open={reporting} {failure} {newer} {errors} onClose={reset} />

<Dialog
  title="Replace the current tileset?"
  bind:open={asking}
  confirmLabel="Import"
  wide
  onConfirm={() => void confirmImport()}
  onCancel={() => (pending = null)}
>
  <LossWarning />
</Dialog>

<style>
  .picker {
    display: none;
  }
</style>
