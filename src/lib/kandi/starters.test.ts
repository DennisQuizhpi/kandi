import { describe, expect, it } from "vitest";

import { STARTER_PRESETS, starterPresetToDesign } from "./starters";

describe("starterPresetToDesign", () => {
  it("creates a valid design envelope with normalized beads", () => {
    const design = starterPresetToDesign(STARTER_PRESETS[0]!);

    expect(design.id).toMatch(/^kandi-/);
    expect(design.name).toBe(STARTER_PRESETS[0]!.label);
    expect(design.beadCount).toBe(28);
    expect(design.beads).toHaveLength(design.beadCount);
    expect(design.createdAt).toMatch(/T/);
    expect(design.updatedAt).toMatch(/T/);

    design.beads.forEach((bead, index) => {
      expect(bead.id).toMatch(/^bead-/);
      expect(bead.index).toBe(index);
      if (bead.label && bead.label.length > 0) {
        expect(bead.shape).toBe("cube");
        expect(bead.label).toBe(bead.label.toUpperCase());
      }
    });
  });
});
