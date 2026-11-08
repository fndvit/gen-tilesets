/**
 * The shape of an `Explainer` popover's content — `DESIGN_SYSTEM.md`
 * *Explainer popover*. The popover is a frame; what it says is data from the
 * caller (`lib/operations/noise-explainer.ts`), so it never learns what it is
 * explaining.
 */

/** One param, as a `.t-title` name over a muted explanation. */
export interface ExplainedParam {
  name: string;
  text: string;
}

/** One row of share bars: a mono label, then each part's share (any unit; drawn by ratio). */
export interface ShareRow {
  label: string;
  shares: readonly number[];
}

export interface ExplainerContent {
  title: string;
  /** Running text under the heading. */
  intro: string;
  params: readonly ExplainedParam[];
  /** Measured figures, drawn as small bars after the params. */
  shares: readonly ShareRow[];
  /** What a row's label counts, said before it to assistive tech ("Octaves 2: …"). */
  sharesBy: string;
  /** Running text after the bars. */
  advice: string;
  /** A muted note under a hairline, last. */
  note: string;
}
