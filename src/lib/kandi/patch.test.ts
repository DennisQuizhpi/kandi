import { describe, expect, it } from "vitest";

import { applyPatchToBeads } from "./patch";
import { Bead } from "./types";

const beads: Bead[] = [
  { id: "a", index: 0, shape: "round", color: "#000000" },
  { id: "b", index: 1, shape: "cube", color: "#ffffff" },
];

describe("applyPatchToBeads", () => {
  it("applies the same patch contract for color and shape", () => {
    const result = applyPatchToBeads(beads, new Set(["a"]), { color: "#ff00ff", shape: "star" });
    expect(result[0].color).toBe("#ff00ff");
    expect(result[0].shape).toBe("star");
    expect(result[1]).toEqual(beads[1]);
  });

  it("normalizes labels and supports clearing label", () => {
    const withLabel = applyPatchToBeads(beads, new Set(["a"]), { label: "p" });
    expect(withLabel[0].label).toBe("P");
    expect(withLabel[0].shape).toBe("cube");

    const cleared = applyPatchToBeads(withLabel, new Set(["a"]), { label: "" });
    expect(cleared[0].label).toBeUndefined();
  });
});
