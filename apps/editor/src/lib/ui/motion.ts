/**
 * How long a JavaScript-driven transition lasts.
 *
 * Svelte's transitions (`slide` in `Collapsible`) run in JavaScript, so the
 * CSS rule in `base.css` that zeroes durations under `prefers-reduced-motion`
 * never reaches them. This reads the same `--dur-*` token the CSS uses and
 * returns 0 when the user asked for less motion, so both kinds of motion obey
 * one setting.
 */

/** A CSS time (`120ms`, `0.3s`) in milliseconds; `0` for anything else. */
export function parseDuration(value: string): number {
  const match = /^\s*(-?[\d.]+)(ms|s)\s*$/.exec(value);
  if (!match) return 0;
  const n = Number(match[1]) * (match[2] === "s" ? 1000 : 1);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** The duration of token `name` on `element`, or 0 under reduced motion or outside a browser. */
export function motionDuration(element: Element, name = "--dur-fast"): number {
  if (typeof window === "undefined") return 0;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return 0;
  return parseDuration(getComputedStyle(element).getPropertyValue(name));
}
