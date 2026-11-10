import { mount } from "svelte";
import App from "./App.svelte";
import { adopt } from "./adopt.js";
import { openFirstVisit } from "./first-visit.js";
import { prepareArchive } from "./import.js";
import { keeping } from "./keeping.svelte.js";
import { notices } from "./notices.svelte.js";
import { BASE, manifest } from "./starters-client.js";
import { loadTemplate } from "./starters.js";
import { isFirstVisit, seenStore, type TourRun } from "./tour.js";
// Tokens first: base.css and every component read them.
import "./styles/tokens.css";
import "./styles/base.css";

/**
 * Before the editor mounts: the tileset kept from the last visit is reopened
 * (`keeping.svelte.ts`), or, on a first visit, Collage is opened
 * (`first-visit.ts`). Either way the empty skeleton never shows and never
 * reaches undo.
 *
 * The tour's run goes to `App` as a mount prop: `"first"` when Collage opened,
 * `"replay"` when it failed (the tour still runs, as a replay does), `null` when
 * this is not a first visit. A prop, because it is read once at mount. Rejected:
 * an exported store in `tour.ts`, which would put state in a pure module.
 */
async function boot(): Promise<TourRun | null> {
  const kept = await keeping.restore();
  if (!isFirstVisit(kept, seenStore().get())) return null;
  return openFirstVisit({
    manifest,
    loadTemplate: (entry) => loadTemplate(entry, (url) => fetch(url), BASE),
    prepare: prepareArchive,
    adopt,
    push: (notice) => notices.push(notice),
  });
}

// A promise rather than a top-level await, so the build target need not support one.
void boot().then((tourRun) => mount(App, { target: document.getElementById("app")!, props: { tourRun } }));
