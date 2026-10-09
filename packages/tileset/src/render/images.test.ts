/**
 * The natural-size check — `./images.ts` `requireNaturalSize`.
 *
 * The probe is injected: Node has no `createImageBitmap`, and what is under test
 * is how its answer is read, which is where a viewBox-only SVG is told apart
 * from a picture that merely failed to probe.
 */

import { describe, expect, it, vi } from "vitest";
import { NaturalSizeChecks, NO_NATURAL_SIZE, requireNaturalSize } from "./images.js";

const img = (w: number, h: number) =>
  ({ naturalWidth: w, naturalHeight: h }) as unknown as HTMLImageElement;

const named = (name: string) => Object.assign(new Error(name), { name });

describe("requireNaturalSize — a picture must declare its size", () => {
  it("passes a picture the probe accepts, and closes the bitmap", async () => {
    const close = vi.fn();
    await expect(requireNaturalSize(img(100, 100), async () => ({ close }))).resolves.toBeUndefined();
    expect(close).toHaveBeenCalledOnce();
  });

  it("refuses what Chrome reports as 150 × 150 but cannot bitmap — a viewBox-only SVG", async () => {
    const probe = () => Promise.reject(named("InvalidStateError"));
    await expect(requireNaturalSize(img(150, 150), probe)).rejects.toThrow(NO_NATURAL_SIZE);
  });

  it("refuses a picture that reports no size at all, without probing", async () => {
    const probe = vi.fn();
    await expect(requireNaturalSize(img(0, 0), probe)).rejects.toThrow(NO_NATURAL_SIZE);
    expect(probe).not.toHaveBeenCalled();
  });

  it("passes when the probe fails for any other reason, or does not exist", async () => {
    // A question about the probe, not the picture: a working tile must not become a hole.
    await expect(requireNaturalSize(img(100, 100), () => Promise.reject(named("SecurityError")))).resolves.toBeUndefined();
    await expect(requireNaturalSize(img(100, 100), undefined)).resolves.toBeUndefined();
  });
});

describe("NaturalSizeChecks — once per src", () => {
  it("probes each src once, however many cells load it", async () => {
    const require = vi.fn(async () => {});
    const checks = new NaturalSizeChecks(require);
    await Promise.all([checks.check("a.svg", img(1, 1)), checks.check("a.svg", img(1, 1))]);
    await checks.check("b.svg", img(1, 1));
    expect(require).toHaveBeenCalledTimes(2);
  });
});
