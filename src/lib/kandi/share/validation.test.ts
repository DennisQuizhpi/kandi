import { describe, expect, it } from "vitest";

import { createDefaultDesign } from "@/lib/kandi/store";

import { normalizeShareText, ShareValidationError, validateDesignSnapshot } from "./validation";

describe("share validation", () => {
  it("normalizes title/message and preserves optional background id", () => {
    const normalized = normalizeShareText({
      design: createDefaultDesign(),
      title: "  My Card  ",
      message: "  Hi there  ",
      backgroundAssetId: "  asset-123  ",
    });

    expect(normalized).toEqual({
      title: "My Card",
      message: "Hi there",
      backgroundAssetId: "asset-123",
    });
  });

  it("rejects blank titles", () => {
    expect(() =>
      normalizeShareText({
        design: createDefaultDesign(),
        title: "   ",
        message: "",
      }),
    ).toThrow(ShareValidationError);
  });

  it("validates design payload shape", () => {
    const design = createDefaultDesign(16);
    expect(() => validateDesignSnapshot(design)).not.toThrow();
    expect(() => validateDesignSnapshot({ ...design, beads: [] })).toThrow(ShareValidationError);
  });
});
