import { describe, expect, it } from "vitest";

import {
  adjacentBeadId,
  mergeSelectionIds,
  normalizeRect,
  selectByRect,
  toggleId,
} from "./selection";
import { Bead } from "./types";

const beads: Bead[] = [
  { id: "a", index: 0, shape: "round", color: "#111" },
  { id: "b", index: 1, shape: "round", color: "#222" },
  { id: "c", index: 2, shape: "round", color: "#333" },
];

describe("selection helpers", () => {
  it("toggles single selection with additive modifier", () => {
    expect(toggleId([], "a", false)).toEqual(["a"]);
    expect(toggleId(["a"], "b", true).sort()).toEqual(["a", "b"]);
    expect(toggleId(["a", "b"], "a", true)).toEqual(["b"]);
  });

  it("merges marquee ids with inclusion/exclusion behavior", () => {
    expect(mergeSelectionIds(["a"], ["b", "c"], false).sort()).toEqual(["b", "c"]);
    expect(mergeSelectionIds(["a"], ["b", "c"], true).sort()).toEqual(["a", "b", "c"]);
  });

  it("returns ids within marquee rectangle", () => {
    const rect = normalizeRect(10, 10, 45, 50);
    const selected = selectByRect(
      beads,
      {
        a: { x: 12, y: 14 },
        b: { x: 30, y: 48 },
        c: { x: 60, y: 80 },
      },
      rect,
    );
    expect(selected.sort()).toEqual(["a", "b"]);
  });

  it("advances selection along bead index with wrap and empty anchor", () => {
    expect(adjacentBeadId(beads, [], "next")).toBe("a");
    expect(adjacentBeadId(beads, [], "prev")).toBe("c");
    expect(adjacentBeadId(beads, ["a"], "next")).toBe("b");
    expect(adjacentBeadId(beads, ["b"], "prev")).toBe("a");
    expect(adjacentBeadId(beads, ["c"], "next")).toBe("a");
    expect(adjacentBeadId(beads, ["a"], "prev")).toBe("c");
    expect(adjacentBeadId(beads, ["a", "c"], "next")).toBe("b");
  });
});
