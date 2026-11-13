<!--
  "Import refused": the report for a tileset that was not opened — §12.4.

  It was ImportPanel's own Popup. It is a component now because a template
  that fails to open (the New tileset popup, B-016) is reported by the same
  Popup (`DESIGN_SYSTEM.md` *New tileset*): a template opens through the same
  sequence as an import, so it fails the same ways and should read the same.

  It shows at most one kind of report, in the caller's state: a thrown
  `failure`, a `newer` version, or the validation `errors`. `subject` names
  what was not opened when that is not obvious from the gesture: a template
  ("Collage"). An import leaves it out, because the author just picked the
  file.
-->
<script lang="ts">
  import type { ValidationError } from "@vit-foundation/gen-tilesets";
  import Popup from "./ui/Popup.svelte";

  interface Props {
    open?: boolean;
    /** A thrown message: a bad zip, no tileset.json, a picture that would not load. */
    failure?: string | null;
    /** The version a file from a newer build declared. */
    newer?: number | null;
    errors?: ValidationError[];
    /** What was not opened, when the gesture does not say: a template's name. */
    subject?: string | undefined;
    /** Clears the caller's report. */
    onClose: () => void;
  }

  let { open = $bindable(false), failure = null, newer = null, errors = [], subject, onClose }: Props = $props();

  const notOpened = $derived(
    subject === undefined
      ? "Not opened. Nothing in the current document has changed."
      : `${subject} was not opened. Nothing in the current document has changed.`,
  );
</script>

<Popup title="Import refused" bind:open {onClose}>
  {#if failure !== null}
    <p class="t-body">{notOpened}</p>
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
      {subject === undefined ? "This file" : subject} was written by a newer build (schemaVersion {newer}).
      Update the editor, not the file.
    </p>
  {/if}

  <!--
    **C6**: no partial load and no severity axis. The file was not opened; the
    document on screen is the one that was already there.
  -->
  {#if errors.length > 0}
    <p class="t-body">{notOpened}</p>
    <ul class="t-console">
      {#each errors.slice(0, 12) as error, i (i)}
        <li><strong>{error.path || "/"}</strong> {error.code} {error.message}</li>
      {/each}
      {#if errors.length > 12}
        <li>…and {errors.length - 12} more</li>
      {/if}
    </ul>
  {/if}
</Popup>

<style>
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
