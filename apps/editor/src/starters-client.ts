/**
 * The starters manifest as the running editor fetches it (B-016 S3c).
 *
 * `starters.ts` is pure and takes its `fetch` and base URL as arguments, so it
 * can be tested. This module binds them once for the app: the real `fetch` and
 * `import.meta.env.BASE_URL`. New tileset and the Tile gallery both read the
 * manifest through `manifest()`, so the two popups make one request between
 * them per session.
 *
 * It lived in `NewTileset.svelte`'s `<script module>` until the gallery needed
 * it too. Rejected: a second `once` in the gallery, which would have fetched
 * the same file twice.
 */

import { loadManifest, once } from "./starters.js";

/** The app's base URL, ending in `/`: where `public/` is served. */
export const BASE = import.meta.env.BASE_URL;

/** Fetched on first use, never at startup; shared by every popup and every opening. */
export const manifest = once(() => loadManifest((url) => fetch(url), BASE));
