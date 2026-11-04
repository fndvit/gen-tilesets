import type { Operation, Tile } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { newDraft } from "../../draft.svelte.js";
import { draftParts, labelFor, partsOf, summarize } from "./labels.js";

const tiles = [
  { id: "t1", name: "grass", assets: [] },
  { id: "t2", name: "sand", assets: [] },
] as unknown as Tile[];

describe("labelFor", () => {
  it("uses Figma's names where they differ from the registry's", () => {
    expect(labelFor("cellList")).toBe("Handpick");
    expect(labelFor("checkerboard")).toBe("Checkered");
    expect(labelFor("tileId")).toBe("Tile");
    expect(labelFor("valueNoise")).toBe("Noise");
  });

  it("title-cases any other name, so a later registration still reads", () => {
    expect(labelFor("everyNth")).toBe("Every Nth");
    expect(labelFor("scaleX")).toBe("Scale X");
    expect(labelFor("rect")).toBe("Rect");
  });
});

describe("summarize", () => {
  it("reads a numeric operation in step order", () => {
    const op: Operation = {
      id: "op1",
      selection: { type: "checkerboard", parity: 0 },
      source: { type: "random" },
      target: "opacity",
      mapping: { range: [0.5, 1] },
      blend: "set",
    };
    expect(summarize(partsOf(op), tiles)).toBe("Checkered * Opacity [0.5 - 1] * Random * Set");
  });

  it("shows steps only when present", () => {
    const op: Operation = {
      id: "op1",
      selection: { type: "all" },
      source: { type: "gradient" },
      target: "rotation",
      mapping: { range: [0, 90], steps: 4 },
      blend: "add",
    };
    expect(summarize(partsOf(op), tiles)).toBe("All * Rotation [0 - 90] × 4 * Gradient * Add");
  });

  it("names palette tiles, never ids, and calls an empty entry clear", () => {
    const op: Operation = {
      id: "op1",
      selection: { type: "all" },
      source: { type: "random" },
      target: "tileId",
      mapping: {
        palette: [
          { tileId: "t2", weight: 1 },
          { tileId: null, weight: 1 },
        ],
      },
      blend: "set",
    };
    expect(summarize(partsOf(op), tiles)).toBe("All * Tile [sand, clear] * Random * Set");
  });

  it("marks unanswered steps in a fresh draft", () => {
    expect(summarize(draftParts(newDraft("op1")), tiles)).toBe("— * — * — * —");
  });
});
