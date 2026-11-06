<!--
  A closable popup for a report the author has to read after an action: an
  import that was refused, an export that failed.

  It is a native modal `<dialog>`, so focus moves into it, Esc closes it, and
  the page behind is inert while it is open. It appears only because of
  something the author just did, and it never takes space in the layout.

  Anatomy: a white panel floating on a shadow, the title in the section
  header's style, the body, and the actions at the bottom right (Close, as
  a secondary button). No frame and no bar: the lift does the separating.

  `open` is bindable. Closing by Esc, by the button or by the caller all end in
  `onClose`, once.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Button from "./Button.svelte";

  interface Props {
    title: string;
    open?: boolean;
    onClose?: () => void;
    children: Snippet;
    /**
     * Buttons in place of Close, for a popup that asks something. Receives
     * `close`, so a choice can act and then close the dialog.
     */
    actions?: Snippet<[() => void]>;
    /** For a question that interrupts (`Dialog`): announced as an `alertdialog`. */
    alert?: boolean;
  }

  let { title, open = $bindable(false), onClose, children, actions, alert = false }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  const titleId = $props.id();

  $effect(() => {
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });

  /** The dialog's own `close` event: Esc, the button, or `open = false`. */
  function closed(): void {
    open = false;
    onClose?.();
  }
</script>

<dialog
  bind:this={dialog}
  class="popup theme-default"
  role={alert ? "alertdialog" : undefined}
  aria-labelledby={titleId}
  onclose={closed}
>
  <div class="bar">
    <h2 class="t-section" id={titleId}>{title}</h2>
  </div>
  <div class="body">
    {@render children()}
  </div>
  <div class="actions">
    {#if actions}
      {@render actions(() => dialog?.close())}
    {:else}
      <Button label="Close" onclick={() => dialog?.close()} />
    {/if}
  </div>
</dialog>

<style>
  .popup {
    width: min(480px, calc(100vw - 2 * var(--space-6)));
    max-height: calc(100dvh - 2 * var(--space-6));
    /* The UA centres a modal dialog with `margin: auto`; a page reset (Starlight's) undoes it. */
    margin: auto;
    padding: 0;
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--color-panel);
    box-shadow: var(--shadow-float);
    color: var(--color-ink);
  }

  .popup[open] {
    display: flex;
    flex-direction: column;
  }

  .popup::backdrop {
    background: color-mix(in srgb, var(--color-ink) 24%, transparent);
  }

  .bar {
    padding: var(--space-7) var(--space-7) var(--space-4);
  }

  h2 {
    margin: 0;
  }

  .body {
    overflow-y: auto;
    padding: var(--space-4) var(--space-7);
    line-height: var(--leading-hint);
  }

  .body :global(.t-body) {
    line-height: var(--leading-hint);
    text-box: none;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-7) var(--space-7);
  }
</style>
