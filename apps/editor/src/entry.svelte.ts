/**
 * Whether the author is in the middle of entering a value.
 *
 * A numeric field commits on every keystroke that parses (**E5**), and a range
 * input on every step of a drag, so the document, and everything derived from
 * it, changes while the author is still typing or dragging. Warnings must wait
 * until the value is committed, so the author is not interrupted twice (Pol,
 * Stage 2 W1, 2026-11-06). The notice stack and the inline advisories hold
 * their last state while this is true.
 *
 * An entry starts with an `input` event from a text field, a number field, a
 * range or a contenteditable, and ends with `change` (a range let go, a field
 * committed), focus leaving, or Enter or Escape. `App.svelte` wires these on
 * `<svelte:window>`.
 *
 * `input` is listened to in the **capture** phase. The field's own handler
 * commits the value, and Svelte's delegated handler runs before a bubbling
 * listener on `window` would, so the document would already have changed by
 * the time `active` was set.
 */

let active = $state(false);

function isEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export const entry = {
  /** True from the first `input` until the value is committed. */
  get active(): boolean {
    return active;
  },

  input(event: Event): void {
    if (isEntry(event.target)) active = true;
  },

  /** `change` and `focusout`. */
  done(): void {
    active = false;
  },

  keydown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === "Escape") active = false;
  },
};
