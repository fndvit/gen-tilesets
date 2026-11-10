/**
 * The first visit: Collage opens before the editor mounts, and the tour that
 * follows describes it (B-017, O0 and O3a).
 *
 * `main.ts` calls `openFirstVisit` only when `isFirstVisit` (`tour.ts`) holds:
 * nothing was kept and the tour has not been seen. Collage opens through the
 * same path as New → From template, `loadTemplate` → `prepareArchive` →
 * `adopt`, so it opens exactly as an import of it would, and `adopt`'s
 * `session.open` starts a fresh history: Undo cannot reach the empty skeleton,
 * as for a reload (After S4).
 *
 * Its loaders are arguments, so `first-visit.test.ts` runs it on fakes; the
 * real ones are bound in `main.ts`. It is apart from `tour.ts` because it
 * talks to loaders and stores, and `tour.ts` stays the step model.
 *
 * ## A failure is a notice, not a Popup
 *
 * New → From template reports a refusal in the Import refused Popup, because
 * the author asked for that template. On a first visit nobody asked, and a
 * Popup would stand between a new user and the tour (O0). So any failure
 * (the manifest, a picture, a refusal) pushes one failure notice, the editor
 * stays empty, and the tour runs as a replay does.
 */

import type { Archive, Prepared } from "./import.js";
import type { Notice } from "./notices.js";
import type { Manifest, TemplateEntry } from "./starters.js";
import type { TourRun } from "./tour.js";

/**
 * The template a first visit opens. By id, not "the first in the manifest":
 * the tour's step 6 describes Collage's operation 3, so another template
 * listed first must not take its place.
 */
export const FIRST_VISIT_TEMPLATE = "collage";

export interface FirstVisitDeps {
  manifest: () => Promise<Manifest>;
  loadTemplate: (entry: TemplateEntry) => Promise<Archive>;
  prepare: (archive: Archive) => Prepared;
  adopt: (prepared: Extract<Prepared, { kind: "ready" }>) => Promise<void>;
  push: (notice: Notice) => void;
}

/** The failure notice when Collage did not open; `data` says why. */
export function collageFailedNotice(data: readonly string[]): Notice {
  return {
    key: "first-visit-failed",
    signature: data.join("\n"),
    kind: "failure",
    title: "The example tileset couldn't be opened",
    data: [...data],
    body: "You're starting with an empty tileset. New → From template can open it later.",
  };
}

/**
 * Opens Collage. Returns the tour's run: `"first"` when it opened, `"replay"`
 * when it did not (and the notice is pushed). Never throws.
 */
export async function openFirstVisit(deps: FirstVisitDeps): Promise<TourRun> {
  let data: string[];
  try {
    const entry = (await deps.manifest()).templates.find((t) => t.id === FIRST_VISIT_TEMPLATE);
    if (entry === undefined) {
      data = [`starters.json lists no "${FIRST_VISIT_TEMPLATE}" template.`];
    } else {
      const prepared = deps.prepare(await deps.loadTemplate(entry));
      if (prepared.kind === "ready") {
        await deps.adopt(prepared);
        return "first";
      }
      data =
        prepared.kind === "newer"
          ? [`It was saved by a newer build (schemaVersion ${prepared.declared}). Update the editor.`]
          : prepared.errors.map((e) => `${e.path || "/"}: ${e.message}`);
    }
  } catch (cause) {
    data = [cause instanceof Error ? cause.message : String(cause)];
  }
  deps.push(collageFailedNotice(data));
  return "replay";
}
