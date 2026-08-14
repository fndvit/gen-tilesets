/**
 * The reference image — a picture of the page the tileset is destined for,
 * drawn behind (or over) the render box so the author can judge the fit
 * without exporting first.
 *
 * ## It writes no field
 *
 * **E11**, and the same category as `PreviewFrame`'s backdrop colour: a control
 * that changes what the author is looking at and writes nothing. `09` §4.1 puts
 * such state beside the file, never in it and never in `meta` (**E4**). So no
 * `schemaVersion` moves, `validate()`'s strict key set is untouched, nothing
 * joins the export zip, and nothing enters the undo stack. Like the asset store
 * it is session-scoped and does not survive a reload (`09` §15 Q8).
 *
 * ## Why the image is drawn at `Wpx` and not fitted to the panel
 *
 * `07` §5.3 makes every horizontal quantity a fixed fraction of `Wpx`, so the
 * render box at `Wpx = 1440` is precisely what a 1440px viewport shows. Drawing
 * a 1440px screenshot at the same width puts the two in the same coordinate
 * space — one image px to one design px — which is the whole comparison. Fitting
 * the image into whatever room the panel has would break that correspondence for
 * a number the author never chose, and `07` §3's worst outcome is approving a
 * picture the file does not produce.
 *
 * The arithmetic lives here rather than in the component because a module
 * holding a rune cannot be imported by a test — `apps/editor/vitest.config.ts`
 * drops the Svelte plugin deliberately.
 */

import { measure } from "./assets.js";

/** One loaded reference. `url` is an object URL over the author's own file. */
export interface Reference {
  /** Object URL. Revoked when the reference is replaced or cleared. */
  url: string;
  /** The file's name, for the readout. */
  name: string;
  /** Intrinsic dimensions, from `measure`. */
  width: number;
  height: number;
}

/**
 * Loads a dropped or picked file, or rejects.
 *
 * **`measure` is reused rather than rewritten** — it is the editor's one answer
 * to "can this be decoded, and how big is it" (**E13**), and it already refuses
 * an SVG carrying only a `viewBox`, which would otherwise be drawn at whatever
 * width the layout gave it and silently misreport the alignment. Mirrors
 * `attach()`: the URL is revoked before the throw escapes, so a refused file
 * leaves nothing behind.
 */
export async function loadReference(file: File): Promise<Reference> {
  const url = URL.createObjectURL(file);
  try {
    const { width, height } = await measure(url);
    return { url, name: file.name, width, height };
  } catch (cause) {
    URL.revokeObjectURL(url);
    throw cause;
  }
}

/**
 * The layer's height in frame px, drawn at the render box's width.
 *
 * Proportional and never cropped: the image keeps its aspect ratio and the
 * preview grows to hold it, rather than the image being trimmed to a band it
 * was never about.
 */
export function layerHeight(frameWidth: number, ref: Reference): number {
  if (ref.width <= 0) return 0;
  return (frameWidth * ref.height) / ref.width;
}

/** A vertical span in frame px, measured from the render box's own top edge. */
export interface Extent {
  /** `<= 0`. How far above the render box the picture reaches. */
  top: number;
  /** `>= frameHeight`. How far below it reaches. */
  bottom: number;
}

/**
 * The union of the render box and the image layer.
 *
 * The viewport reserves this instead of the render box's own height, and the
 * frame is pushed down by `-top`, so an image offset upward is *shown* rather
 * than clipped away by the track's `overflow: hidden`. With no reference loaded
 * the caller passes a zero height at a zero offset and gets `{0, frameHeight}`
 * back — exactly the height the viewport reserved before this existed.
 */
export function frameExtent(frameHeight: number, imageHeight: number, yOffset: number): Extent {
  return {
    top: Math.min(0, yOffset),
    bottom: Math.max(frameHeight, yOffset + imageHeight),
  };
}
