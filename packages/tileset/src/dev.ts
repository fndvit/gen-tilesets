/**
 * Development-build detection.
 *
 * `05` §6.3 splits behaviour on it: development builds assert `0 <= t < 1` after
 * every Source evaluation and throw on violation; production builds do neither.
 * The same split governs `07` §4.3's asset-failure reporting.
 *
 * **`08` open question 3 is genuinely open** — "How does the component know
 * whether it is a development or a production build? A bundler flag ties the
 * package to one toolchain; a prop makes it a host lie waiting to happen; always
 * throwing loses `07` §4.3's deliberate production posture. Resolve during
 * implementation."
 *
 * This is a provisional answer, not that resolution. It reads the two signals
 * every mainstream toolchain sets and defaults to *off*, so a host that sets
 * neither gets production behaviour rather than throwing in front of a visitor.
 * Both branches are statically analysable, so a bundler can eliminate the
 * assertions from a production build.
 */
export const DEV: boolean = (() => {
  try {
    // Vite / SvelteKit.
    const meta = import.meta as unknown as { env?: { DEV?: boolean } };
    if (typeof meta.env?.DEV === "boolean") return meta.env.DEV;
  } catch {
    /* import.meta unavailable */
  }
  try {
    // Node, and bundlers that define process.env.NODE_ENV.
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    if (env?.NODE_ENV !== undefined) return env.NODE_ENV !== "production";
  } catch {
    /* process unavailable */
  }
  return false;
})();
