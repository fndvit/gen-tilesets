<!--
  A closable popup for a report the author has to read after an action: an
  import that was refused, an export that failed.

  It is a native modal `<dialog>`, so focus moves into it, Esc closes it, and
  the page behind is inert while it is open. It appears only because of
  something the author just did, and it never takes space in the layout.

  Anatomy: a header row (a section's title over a divider), the body, then the
  buttons at the bottom right, on a floating paper panel. It is the one place
  a shadow is used: it is the one thing that sits above the page. The body is
  the caller's.

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
  }

  let { title, open = $bindable(false), onClose, children, actions }: Props = $props();

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

<dialog bind:this={dialog} class="popup theme-default" aria-labelledby={titleId} onclose={closed}>
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
    padding: 0;
    border: 0;
    border-radius: var(--radius);
    background: var(--color-paper);
    box-shadow: var(--shadow-float);
    color: var(--color-ink);
  }

  .popup[open] {
    display: flex;
    flex-direction: column;
  }

  .popup::backdrop {
    background: rgb(0 0 0 / 0.2);
  }

  /* The header row of a section: 13 semibold over a divider. */
  .bar {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    min-height: var(--preview-bar-h);
    padding: 0 var(--space-8);
    border-bottom: var(--divider);
  }

  h2 {
    margin: 0;
  }

  .body {
    overflow-y: auto;
    padding: var(--space-6) var(--space-8);
    line-height: var(--leading-hint);
  }

  .body :global(.t-body),
  .body :global(.t-console) {
    line-height: var(--leading-hint);
    text-box: none;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--chip-gap);
    padding: 0 var(--space-8) var(--space-6);
  }
</style>
