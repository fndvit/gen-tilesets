import type { Operation, Tile } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { newDraft } from "../../draft.svelte.js";
import {
  draftParts,
  labelFor,
  partsOf,
  summarize,
  summaryCells,
  writesOf,
  writesText,
} from "./labels.js";

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

describe("summaryCells", () => {
  it("gives each step its own answer, for the cell above its tab", () => {
    const op: Operation = {
      id: "op1",
      selection: { type: "checkerboard", parity: 0 },
      source: { type: "random" },
      target: "opacity",
      mapping: { range: [0.5, 1] },
      blend: "set",
    };
    expect(summaryCells(partsOf(op), tiles)).toEqual({
      selection: "Checkered",
      attribute: "Opacity [0.5 - 1]",
      source: "Random",
      blend: "Set",
    });
  });

  it("marks every unanswered step of a new draft", () => {
    const cells = summaryCells(draftParts(newDraft("op9")), tiles);
    expect(Object.values(cells)).toEqual(["—", "—", "—", "—"]);
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

describe("writesOf", () => {
  it("names a tile palette's tiles and keeps their ids, clear included", () => {
    const op: Operation = {
      id: "op1",
      selection: { type: "all" },
      source: { type: "random" },
      target: "tileId",
      mapping: { palette: [{ tileId: "t1", weight: 1 }, { tileId: null, weight: 1 }] },
      blend: "set",
    } as Operation;
    const writes = writesOf(partsOf(op), tiles);
    expect(writes).toEqual({ target: "Tile", detail: "grass, clear", tileIds: ["t1", null] });
    expect(writesText(writes)).toBe("Tile · grass, clear");
  });

  it("gives a numeric range, its steps, and a single value when it collapses", () => {
    const base = {
      id: "op1",
      selection: { type: "all" },
      source: { type: "random" },
      target: "rotation",
      blend: "set",
    };
    const stepped = { ...base, mapping: { range: [0, 270], steps: 4 } } as Operation;
    expect(writesOf(partsOf(stepped), tiles)).toEqual({
      target: "Rotation",
      detail: "0 – 270 · 4 steps",
      tileIds: [],
    });
    const fixed = { ...base, mapping: { range: [90, 90] } } as Operation;
    expect(writesOf(partsOf(fixed), tiles)?.detail).toBe("90");
  });

  it("is null, and reads as unanswered, before a target is chosen", () => {
    const draft = newDraft("op1");
    expect(writesOf(draftParts(draft), tiles)).toBeNull();
    expect(writesText(null)).toBe("—");
  });
});
