/**
 * The tour's model: its steps, where it is, and whether it has been seen
 * (B-017, O3a). Pure: no Svelte and no DOM, so `tour.test.ts` can import it.
 * `lib/Tour.svelte` (O3b) draws it.
 *
 * The steps and their text are DESIGN_SYSTEM.md § "Onboarding: the tour",
 * "Steps", which is the source. They are copied here, not read from it, and no
 * test pins the two together (Pol, O3a plan): a change to the text is made in
 * the doc first, then here.
 *
 * ## Bold
 *
 * `**…**` in a paragraph marks a term, drawn semibold (Pol, O3c: run-in bold
 * rather than subheaders). The text stays plain strings, so it reads beside
 * the doc's table, and a term can sit mid-sentence ("The **sliders** set…"),
 * which a `{ term, text }` record could not hold. Rejected: HTML in the
 * strings and `{@html}`, an injection path for two tags. `spans` splits a
 * paragraph; `plain` drops the marks for the live region.
 *
 * ## Two runs
 *
 * The first visit opens Collage and runs every step. A replay ("?") runs over
 * whatever is open, so it leaves out the step that describes Collage's
 * operation 4, says "seven" rather than "eight" on Welcome, and its last step
 * says "this one" rather than Collage. A first visit
 * whose Collage failed to open runs as a replay, because there is no Collage
 * to describe (`first-visit.ts`).
 */

import type { Operation } from "@vit-foundation/gen-tilesets";

/**
 * What a step cuts out, as the `data-tour` value O3b looks for. Each names one
 * element; `tiles-header` is only a fallback.
 */
export type TargetKey =
  | "grid"
  | "tiles-add"
  | "tiles-header"
  | "tile-group"
  | "ops-add"
  | "op-example"
  | "preview"
  | "breakpoints"
  | "footer"
  | "new";

export type TourRun = "first" | "replay";

export interface TourStep {
  id: string;
  title: string;
  /** One string per paragraph, `**…**` marking bold (`spans`). */
  text: readonly string[];
  /** A closing line, drawn muted: the run's note on Welcome, a by-the-way elsewhere. */
  aside?: string;
  /** Empty on Welcome, which is a centred card. Two on "An operation". */
  targets: readonly TargetKey[];
  /** Describes Collage, so it is left out of a replay. */
  firstVisitOnly?: true;
  /**
   * Cut out instead when the first target is missing (O0): no tile groups → the
   * Tiles header; no Collage operation 4 → the Operations "+".
   */
  fallback?: TargetKey;
}

const WELCOME_SHARED = [
  "This is the generative tileset editor. A tileset is a grid of pictures, laid out by operations that each change part of the grid, one on top of another.",
  "Use the gallery's pictures or upload your own, then export the tileset for a website or as an image.",
];

/** Welcome's aside. */
const WELCOME_SECOND: Record<TourRun, string> = {
  first: "This is Collage, an example tileset. The next eight steps show how it is made. You can skip the tour at any time.",
  replay: "The next seven steps show how a tileset is made. You can skip the tour at any time.",
};

/** The last step names Collage only when Collage is what is open (Pol, after O3a). */
const OWN_TEXT: Record<TourRun, string> = {
  first: "Start building your own tileset with **New**, or close this and keep exploring Collage.",
  replay: "Start building your own tileset with **New**, or close this and keep working on this one.",
};

/** Every step after Welcome, in order. */
const POINTING: readonly TourStep[] = [
  {
    id: "grid",
    title: "Grid & size",
    text: [
      "Set the cell size and the number of rows.",
      "**Design width** is the page width you design for: the grid gets just enough columns to cover it, and the whole tileset scales with the page at other widths.",
    ],
    targets: ["grid"],
  },
  {
    id: "tiles",
    title: "Tiles",
    text: ["Add tile groups. Pick pictures from the gallery, or upload your own."],
    targets: ["tiles-add"],
  },
  {
    id: "tile-group",
    title: "Tile group",
    text: [
      "A tile group is one tile with one or more pictures, its **variants**.",
      "Operations decide where the tile goes, and each of those cells draws one of its pictures.",
      "The **sliders** set how often each picture is drawn.",
    ],
    targets: ["tile-group"],
    fallback: "tiles-header",
  },
  {
    id: "operations",
    title: "Operations",
    text: [
      "Operations fill the grid. Each one changes some cells: their tile, or its rotation, scale, offset or opacity.",
      "They run **from top to bottom**, and a later one paints over an earlier one.",
    ],
    targets: ["ops-add"],
  },
  {
    id: "operation",
    title: "An operation",
    text: [
      "This is operation 4.",
      "Its **Selection** is a rectangle in the middle of the grid, outlined on the picture.",
      "Its **Pattern**, Random, gives each of those cells a tile: mostly Yellow, sometimes Blue, Pink or Grey.",
    ],
    aside: "The new tiles keep the rotation and opacity that operations 2 and 3 gave every cell.",
    targets: ["op-example", "preview"],
    firstVisitOnly: true,
    // Only Collage's own operation 4 carries `op-example` (`exampleOperation`).
    // In a Collage changed since this text was written, point at the stack instead.
    fallback: "ops-add",
  },
  {
    id: "breakpoints",
    title: "Breakpoints",
    text: ["Change how the tileset looks at different screen sizes."],
    aside: "Only useful if you export it for a website.",
    targets: ["breakpoints"],
  },
  {
    id: "randomness",
    title: "Randomness",
    text: [
      "Everything random follows from the seed: the same seed always gives the same picture.",
      "**New seed** redraws every operation.",
      "**Re-seed**, on an operation's card, redraws only that one.",
      "**Reroll assets** only swaps pictures within each tile group.",
    ],
    aside: "ⓘ How randomness works has the rest.",
    targets: ["footer"],
  },
];

/** The run's steps, Welcome first: nine on a first visit, eight on a replay. */
export function stepsFor(run: TourRun): TourStep[] {
  const welcome: TourStep = { id: "welcome", title: "Welcome", text: WELCOME_SHARED, aside: WELCOME_SECOND[run], targets: [] };
  const own: TourStep = { id: "own", title: "Your own tileset", text: [OWN_TEXT[run]], targets: ["new"] };
  return [welcome, ...POINTING.filter((step) => run === "first" || !step.firstVisitOnly), own];
}

export interface Span {
  text: string;
  strong: boolean;
}

/**
 * A paragraph cut at its `**` marks, in order, empty parts left out. An odd
 * number of marks throws: a term left open would draw the rest of the
 * paragraph bold, and the copy is ours, so the mistake should fail a test.
 */
export function spans(paragraph: string): Span[] {
  const parts = paragraph.split("**");
  if (parts.length % 2 === 0) throw new Error(`Unbalanced ** in tour text: ${paragraph}`);
  return parts.map((text, i) => ({ text, strong: i % 2 === 1 })).filter((span) => span.text !== "");
}

/** The step's text without marks, the aside last: what the live region says. */
export function plain(step: TourStep): string {
  const paragraphs = step.aside === undefined ? step.text : [...step.text, step.aside];
  return paragraphs.map((p) => spans(p).map((span) => span.text).join("")).join(" ");
}

/** Where a tour is. `null` is a tour that has ended (or never started). */
export interface TourState {
  run: TourRun;
  steps: readonly TourStep[];
  /** 0 is Welcome. */
  index: number;
}

export function start(run: TourRun): TourState {
  return { run, steps: stepsFor(run), index: 0 };
}

export function current(state: TourState): TourStep {
  return state.steps[state.index]!;
}

export function isLast(state: TourState): boolean {
  return state.index === state.steps.length - 1;
}

/** The next step, or `null` past the last: Done ends the tour as Skip does. */
export function next(state: TourState): TourState | null {
  return isLast(state) ? null : { ...state, index: state.index + 1 };
}

/** The step before. Back on Grid & size goes to Welcome (Pol, O1); Welcome has no Back. */
export function back(state: TourState): TourState {
  return state.index === 0 ? state : { ...state, index: state.index - 1 };
}

/** "3 of 9". The count includes Welcome, so the pointing steps are 2 to 9 (2 to 8 on a replay). */
export function count(state: TourState): string {
  return `${state.index + 1} of ${state.steps.length}`;
}

/** The primary button's label. */
export function primaryLabel(state: TourState): "Start tour" | "Next" | "Done" {
  return state.index === 0 ? "Start tour" : isLast(state) ? "Done" : "Next";
}

/** Skip tour is shown on every step but the last, where Done ends the tour the same way. */
export function showsSkip(state: TourState): boolean {
  return !isLast(state);
}

/**
 * Where the seen flag lives. Namespaced like the package, because a
 * `localStorage` key is shared by everything on the origin, and the editor may
 * be served beside other apps. Rejected: IndexedDB beside the kept tileset
 * (`browser-db.ts`). The flag is one boolean read before mount, and a
 * synchronous read keeps the boot path short.
 */
export const SEEN_KEY = "gen-tilesets.editor.tourSeen";

export interface SeenStore {
  /** True once the tour has been finished or skipped. False when storage is blocked. */
  get(): boolean;
  /** Records it. Silent when storage is blocked: the tour shows again next visit. */
  set(): void;
}

/**
 * The seen flag, behind try/catch on every access. `localStorage` can be
 * missing, or throw on a read or a write (a blocked or private window, a full
 * quota). The tour must never break the editor, so a blocked store reads as
 * "not seen" and a failed write is ignored (DESIGN_SYSTEM.md, "When it
 * shows"). `storage` is a function so that even reaching `localStorage`, which
 * itself can throw, is inside the try.
 */
export function seenStore(storage: () => Pick<Storage, "getItem" | "setItem"> = () => globalThis.localStorage): SeenStore {
  return {
    get() {
      try {
        return storage().getItem(SEEN_KEY) === "1";
      } catch {
        return false;
      }
    },
    set() {
      try {
        storage().setItem(SEEN_KEY, "1");
      } catch {
        // Nothing to do: the tour shows again on the next visit.
      }
    },
  };
}

/**
 * Ends the tour, by Done, Skip tour or Esc alike: each sets the flag
 * (DESIGN_SYSTEM.md), so there is one way out and nothing to keep in step.
 */
export function end(seen: SeenStore): null {
  seen.set();
  return null;
}

/**
 * The operation "An operation" opens: Collage's operation 4, `op6`, a
 * rectangle Selection, as the step's text describes it. Found by position
 * **and** checked by id and Selection, so that a Collage edited later can't
 * have the tour open a card the text doesn't describe; `null` then, and the
 * step points at the Operations "+" (its `fallback`). Rejected: by id alone,
 * which would survive a reorder that makes "operation 4" wrong.
 */
export function exampleOperation(operations: readonly Pick<Operation, "id" | "selection">[]): string | null {
  const op = operations[3];
  return op !== undefined && op.id === "op6" && op.selection.type === "rect" ? op.id : null;
}

/** A first visit: nothing was kept from an earlier one, and the tour has not been seen. */
export function isFirstVisit(keptSomething: boolean, seen: boolean): boolean {
  return !keptSomething && !seen;
}
