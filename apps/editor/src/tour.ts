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
 * The first visit opens Mosaic and runs every step. A replay ("?") runs over
 * whatever is open, so it leaves out the steps that rebuild Mosaic, says
 * "seven" rather than "thirteen" on Welcome, and its last step says "this one"
 * rather than Mosaic. A first visit whose Mosaic failed to open runs as a
 * replay, because there is no Mosaic to describe (`first-visit.ts`); so does
 * one whose operations are not Mosaic's three (`runFor`).
 *
 * ## Building Mosaic
 *
 * On a first visit, steps 5 to 11 (`build`) empty the preview and draw it
 * again one operation at a time, with operation 1's card open at each of its
 * four steps (Pol, 2026-11-12: a novice user did not understand operations
 * from one step over the finished picture). A step says what to draw (`ops`)
 * and which card to open (`open`); `Tour.svelte` does it. The preview stage
 * is a function of the step, so Back rewinds it with no state of its own.
 * Rejected: a separate sub-tour with its own index, which would need its own
 * Back and count; one flat list keeps "5 of 14" true.
 */

import type { Operation } from "@vit-foundation/gen-tilesets";
import type { Step } from "./draft.svelte.js";

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
  | "op-1"
  | "op-2"
  | "op-3"
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
  /**
   * A closing line, its own paragraph: the run's note on Welcome, a by-the-way
   * elsewhere. Drawn in ink like the rest (Pol, 2026-11-10: no grey text in the
   * tour); it was muted before.
   */
  aside?: string;
  /** Empty on Welcome, which is a centred card. Two on each build step. */
  targets: readonly TargetKey[];
  /**
   * One of the steps that rebuild Mosaic (5 to 11): first visit only, Skip
   * operations is shown on it, and the bubble stays in the sidebar column.
   */
  build?: true;
  /** How many of the file's operations the preview draws. Absent: all of them. */
  ops?: number;
  /**
   * The card to open, by position among Mosaic's three (`mosaicOperations`),
   * and the step of it to show. Absent: no card open.
   */
  open?: { op: 0 | 1 | 2; stage: Step };
  /**
   * Cut out instead when the first target is missing (O0): no tile groups → the
   * Tiles header; an operation's card not drawn → the Operations "+".
   */
  fallback?: TargetKey;
  /**
   * Cut out alone where the targets can't be seen in one window (`oneWindow`):
   * a build step stacked, where the card fills the window and the picture is
   * below it (O4).
   */
  alone?: TargetKey;
}

const WELCOME_SHARED = [
  "This is the generative tileset editor. A tileset is a grid of pictures, laid out by operations that each change part of the grid, one on top of another.",
  "Use the gallery's pictures or upload your own, then export the tileset for a website or as an image.",
];

/** Welcome's aside. */
const WELCOME_SECOND: Record<TourRun, string> = {
  first: "This is Mosaic, an example tileset. The next thirteen steps show how it is made. You can skip the tour at any time.",
  replay: "The next seven steps show how a tileset is made. You can skip the tour at any time.",
};

/** The last step names Mosaic only when Mosaic is what is open (Pol, after O3a). */
const OWN_TEXT: Record<TourRun, string> = {
  first: "Start building your own tileset with **New**, or close this and keep exploring Mosaic.",
  replay: "Start building your own tileset with **New**, or close this and keep working on this one.",
};

const OPERATIONS_TEXT = [
  "Operations fill the grid. Each one changes some cells: their tile, or its rotation, scale, offset or opacity.",
  "They run **from top to bottom**, and a later one paints over an earlier one.",
];

/** Before the operations, in order. */
const BEFORE: readonly TourStep[] = [
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
];

/** A replay's one Operations step: it can't describe what is open. */
const OPERATIONS: TourStep = { id: "operations", title: "Operations", text: OPERATIONS_TEXT, targets: ["ops-add"] };

/**
 * The first visit's steps 5 to 11: Mosaic emptied, then drawn again. Every one
 * cuts out the picture beside what it is about, and the picture alone stacked.
 */
const BUILD: readonly TourStep[] = (
  [
    {
      id: "operations",
      title: "Operations",
      text: OPERATIONS_TEXT,
      aside: "Mosaic has three. Let's empty the picture and build it again, one at a time.",
      targets: ["ops-add", "preview"],
      ops: 0,
    },
    {
      id: "op1-selection",
      title: "Operation 1: Selection",
      text: [
        "Every operation has four steps. **Selection** picks the cells it changes.",
        "Operation 1 picks All: every cell, marked on the picture.",
      ],
      targets: ["op-1", "preview"],
      ops: 0,
      open: { op: 0, stage: "selection" },
    },
    {
      id: "op1-pattern",
      title: "Operation 1: Pattern",
      text: [
        "**Pattern** gives each selected cell a value from 0 to 1.",
        "Operation 1 uses Noise, which gives nearby cells similar values, so they form patches.",
      ],
      targets: ["op-1", "preview"],
      ops: 0,
      open: { op: 0, stage: "source" },
    },
    {
      id: "op1-attribute",
      title: "Operation 1: Attribute",
      text: [
        "**Attribute** says what the values change, here the tile.",
        "The palette turns low values into its first tiles and high values into its last.",
      ],
      targets: ["op-1", "preview"],
      ops: 1,
      open: { op: 0, stage: "attribute" },
    },
    {
      id: "op1-blend",
      title: "Operation 1: Blend",
      text: ["**Blend** says how the new value meets what earlier operations wrote.", "**Set**, used here, replaces it."],
      targets: ["op-1", "preview"],
      ops: 1,
      open: { op: 0, stage: "blend" },
    },
    {
      id: "op2",
      title: "Operation 2",
      text: ["Operation 2 selects every cell again and gives each a random **rotation**: 0, 90, 180 or 270 degrees."],
      targets: ["op-2", "preview"],
      ops: 2,
    },
    {
      id: "op3",
      title: "Operation 3",
      text: ["Operation 3 selects about 3 in every 100 cells at random and gives them the tile 'Special', painted over what was there."],
      targets: ["op-3", "preview"],
      ops: 3,
    },
  ] satisfies Omit<TourStep, "build" | "fallback" | "alone">[]
).map((step) => ({ ...step, build: true, fallback: "ops-add", alone: "preview" }));

/** After the operations, in order, up to the last step. */
const AFTER: readonly TourStep[] = [
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
    aside: "Click on the ⓘ buttons to know more info.",
    targets: ["footer"],
  },
];

/** The run's steps, Welcome first: fourteen on a first visit, eight on a replay. */
export function stepsFor(run: TourRun): TourStep[] {
  const welcome: TourStep = { id: "welcome", title: "Welcome", text: WELCOME_SHARED, aside: WELCOME_SECOND[run], targets: [] };
  const own: TourStep = { id: "own", title: "Your own tileset", text: [OWN_TEXT[run]], targets: ["new"] };
  return [welcome, ...BEFORE, ...(run === "first" ? BUILD : [OPERATIONS]), ...AFTER, own];
}

export interface Span {
  text: string;
  strong: boolean;
  /**
   * Set on an `INFO` mark: `Tour.svelte` draws the editor's `info` icon in its
   * place, the same picture as the (i) buttons the text is about, and `text`
   * is what a screen reader says for it.
   */
  icon?: "info";
}

/**
 * Where the text shows the (i) buttons' icon (Pol, 2026-11-10: the words "ⓘ How
 * randomness works" read as a button, and "i" in words reads as a letter). The
 * character itself, so the copy here and in DESIGN_SYSTEM.md still reads right.
 * Rejected: a Unicode ⓘ left as text, which is drawn in the font, not as the
 * icon on the buttons.
 */
export const INFO = "ⓘ";

/** What the live region says for the icon. */
const INFO_SPOKEN = "information";

/**
 * A paragraph cut at its `**` marks, in order, empty parts left out, with each
 * `INFO` mark its own icon span. An odd number of `**` throws: a term left open
 * would draw the rest of the paragraph bold, and the copy is ours, so the
 * mistake should fail a test.
 */
export function spans(paragraph: string): Span[] {
  const parts = paragraph.split("**");
  if (parts.length % 2 === 0) throw new Error(`Unbalanced ** in tour text: ${paragraph}`);
  return parts
    .flatMap((part, i) =>
      part.split(INFO).flatMap((text, k): Span[] => {
        const span = { text, strong: i % 2 === 1 };
        return k === 0 ? [span] : [{ text: INFO_SPOKEN, strong: span.strong, icon: "info" }, span];
      }),
    )
    .filter((span) => span.text !== "");
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

/** "3 of 14". The count includes Welcome, so the pointing steps are 2 to 14 (2 to 8 on a replay). */
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

/** Skip operations is shown on the build steps, 5 to 11, and nowhere on a replay. */
export function showsSkipOperations(state: TourState): boolean {
  return current(state).build === true;
}

/**
 * Past the build, to Breakpoints. Back from there goes to the last build step,
 * as it would after Next: the list is flat. Off a build step it does nothing.
 */
export function skipOperations(state: TourState): TourState {
  if (!showsSkipOperations(state)) return state;
  let index = state.index;
  while (state.steps[index]?.build) index++;
  return { ...state, index };
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

type MosaicShape = Pick<Operation, "id" | "selection" | "source" | "target">;

/** What each of Mosaic's operations must be for the build steps' text to be true of it. */
const MOSAIC: readonly { id: string; selection: string; source: string; target: string }[] = [
  { id: "op1", selection: "all", source: "valueNoise", target: "tileId" },
  { id: "op4", selection: "all", source: "random", target: "rotation" },
  { id: "op5", selection: "random", source: "constant", target: "tileId" },
];

/**
 * The ids of Mosaic's three operations, in order, when the file's operations
 * are those three as the build steps describe them; `null` otherwise, and the
 * tour runs as a replay (`runFor`). Checked by position **and** by id, kind of
 * Selection, Source and Attribute, so a Mosaic edited later can't have the
 * tour describe operations it no longer has. Rejected: by id alone, which
 * would survive a reorder that makes "operation 2" wrong.
 */
export function mosaicOperations(operations: readonly MosaicShape[]): [string, string, string] | null {
  if (operations.length !== MOSAIC.length) return null;
  const fits = MOSAIC.every((want, i) => {
    const op = operations[i]!;
    return (
      op.id === want.id &&
      op.selection.length === 1 &&
      op.selection[0]!.type === want.selection &&
      op.source.type === want.source &&
      op.target === want.target
    );
  });
  return fits ? [MOSAIC[0]!.id, MOSAIC[1]!.id, MOSAIC[2]!.id] : null;
}

/** The run a tour starts as: a first visit with no Mosaic to rebuild runs as a replay. */
export function runFor(run: TourRun, operations: readonly MosaicShape[]): TourRun {
  return run === "first" && mosaicOperations(operations) === null ? "replay" : run;
}

/**
 * The file as a build step's preview draws it: its first `kept` operations.
 * Each is exactly the finished picture's first layers, because the engine
 * hashes by position and each operation has its own salt. The same object when
 * nothing is cut, so a derived value downstream doesn't change for nothing.
 */
export function stagedFile<F extends { config: { operations: readonly unknown[] } }>(file: F, kept: number): F {
  if (kept >= file.config.operations.length) return file;
  return { ...file, config: { ...file.config, operations: file.config.operations.slice(0, kept) } };
}

/** A first visit: nothing was kept from an earlier one, and the tour has not been seen. */
export function isFirstVisit(keptSomething: boolean, seen: boolean): boolean {
  return !keptSomething && !seen;
}
