import { beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEY } from "./constants";
import { loadDesign, saveDesign } from "./persistence";
import { createDefaultDesign } from "./store";

describe("persistence round-trip", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("serializes and deserializes design correctly", () => {
    const design = createDefaultDesign(32);
    saveDesign(design);

    const loaded = loadDesign();
    expect(loaded).not.toBeNull();
    expect(loaded?.beadCount).toBe(32);
    expect(loaded?.beads).toHaveLength(32);
  });

  it("returns null when payload is invalid", () => {
    window.localStorage.setItem(STORAGE_KEY, "{bad json");
    expect(loadDesign()).toBeNull();
  });
});
