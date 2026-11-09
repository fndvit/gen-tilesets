<!--
  A blocking question with one answer that acts: "Change columns to 8?",
  "Discard your changes?". (New tileset was one until B-016 made it a Form
  popup, `sections/NewTileset.svelte`.)

  It is a `Popup` announced as an `alertdialog`. The title is the question. The
  body says what changes and how to undo it, and lists anything affected.
  Buttons: Cancel (secondary), then the verb that names the action (primary,
  at the far right). Danger is said in the words, never in red.

  Cancel comes first in the DOM, so `showModal()` puts focus on it: the safe
  answer is the one Enter gives. Esc cancels, and the native `<dialog>` returns
  focus to whatever opened it.

  Ask it only once a value is committed (blur or Enter), and only when the value
  really changed, never while the author is typing (Pol, W1, 2026-11-06).
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Button from "./Button.svelte";
  import Popup from "./Popup.svelte";

  interface Props {
    /** The question. */
    title: string;
    open?: boolean;
    /** The verb that names the action: "Change columns", never "OK". */
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    /** Cancel, Esc, or `open = false` from outside. */
    onCancel?: () => void;
    children: Snippet;
  }

  let {
    title,
    open = $bindable(false),
    confirmLabel,
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    children,
  }: Props = $props();

  /** Set by the verb, so the close that follows is not read as a cancel. */
  let confirmed = false;

  function closed(): void {
    if (!confirmed) onCancel?.();
    confirmed = false;
  }
</script>

<Popup {title} bind:open alert onClose={closed}>
  {@render children()}
  {#snippet actions(close)}
    <Button label={cancelLabel} onclick={close} />
    <Button
      label={confirmLabel}
      variant="primary"
      onclick={() => {
        confirmed = true;
        close();
        onConfirm();
      }}
    />
  {/snippet}
</Popup>
