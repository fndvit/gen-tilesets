/**
 * The preview's own state: its width, its backdrop, whether the grid shows, and
 * which load it previews.
 *
 * Shared by two surfaces: the top bar sets the width (presets, breakpoints)
 * and the backdrop, and `PreviewFrame` measures the column, drags the edges and
 * draws at the result. They are siblings in `App.svelte`, because the bar stays
 * put while the picture scrolls, so the state lives here rather
 * than in any one of them.
 *
 * **Transient UI state, never written to the file** (**E11**, §4.1, **E4**).
 * Session-scoped and gone on a reload, like `drafting.svelte.ts`. The arithmetic
 * is in `width.ts`, which is tested; this module only holds runes.
 */

import { roomFor, WHITE, widthFor, zoomFor } from "./width.js";

/** How much room the preview column has, from `PreviewFrame`'s track. */
let available = $state(0);

/** `null` means *fill the column*: a fresh editor's state, kept right by a window resize. */
let requested = $state<number | null>(null);

/**
 * The colour behind the picture, across the whole column (Pol, Stage 2).
 *
 * White is the default and stays the right one: `07` §4.5 makes the output
 * decorative, so a tileset is drawn over whatever a host page puts behind it,
 * and a tinted preview would have the author judging every tile's edge against
 * a colour no visitor gets. That is also why the control exists — a tileset for
 * a dark page cannot be judged against white either. The editor offers the
 * choice and decides nothing.
 */
let background = $state(WHITE);

/** Whether the grid behind the picture is drawn. On by default. */
let showGrid = $state(true);

/**
 * §8.5's load preview. **Writes no field** — §8.1's fourth row is the one that
 * is not an edit, so it lives here and reaches `<Tileset>` through its `options`.
 *
 * **R12** — one value per session, held for its duration. `08` **S7** makes
 * that structural rather than disciplinary: the component draws no random
 * number at all, so a regeneration has nothing to redraw. Only the footer's
 * Fresh load button moves it, which is what makes it a *preview of another load*
 * rather than noise under every edit.
 *
 * Here rather than in `App.svelte` because three surfaces read it that are not
 * nested in one another: `<Tileset>` and its overlay, the footer's Fresh load
 * button, and the palette's measured coverage (T3), which must count the same
 * load the picture draws.
 */
let loadSalt = $state(0);

/**
 * The operations hidden from the picture (batch 02 T-02, B-012), by id.
 *
 * **Only while the editor is open** (D-02 A), like everything here: never in the
 * file, so export, undo and a reload all show every operation. Here rather than
 * in `OperationsSection` because the card toggles it while `App.svelte` and
 * Export image draw through it (`visibility.ts` `withoutHidden`). Replaced, never
 * mutated, so a reader re-runs on a toggle and on nothing else.
 */
let hidden = $state.raw<ReadonlySet<string>>(new Set());

const room = $derived(roomFor(available));
const width = $derived(widthFor(requested, room));
const zoom = $derived(zoomFor(width, room, available));

export const preview = {
  get available(): number {
    return available;
  },
  set available(next: number) {
    available = next;
  },

  get requested(): number | null {
    return requested;
  },
  set requested(next: number | null) {
    requested = next;
  },

  get background(): string {
    return background;
  },
  set background(next: string) {
    background = next;
  },

  get showGrid(): boolean {
    return showGrid;
  },
  set showGrid(next: boolean) {
    showGrid = next;
  },

  get loadSalt(): number {
    return loadSalt;
  },
  set loadSalt(next: number) {
    loadSalt = next;
  },

  get hidden(): ReadonlySet<string> {
    return hidden;
  },
  set hidden(next: ReadonlySet<string>) {
    hidden = next;
  },

  /** The column less the handle gutters: what Fill fills. */
  get room(): number {
    return room;
  },

  /** `Wpx`. */
  get width(): number {
    return width;
  },

  /** The display zoom, at most 1. */
  get zoom(): number {
    return zoom;
  },
};
