import { describe, expect, it } from "vitest";

import { getRingPoint, getRingPoints } from "./layout";

describe("ring layout", () => {
  it("maps bead index to stable angle/position on circle", () => {
    const point0 = getRingPoint(0, 4, 10);
    const point1 = getRingPoint(1, 4, 10);

    expect(point0.x).toBeCloseTo(0, 5);
    expect(point0.y).toBeCloseTo(-10, 5);

    expect(point1.x).toBeCloseTo(10, 5);
    expect(point1.y).toBeCloseTo(0, 5);
  });

  it("returns expected count and ordering", () => {
    const points = getRingPoints(32, 8);
    expect(points).toHaveLength(32);
    expect(points[0].angle).toBeLessThan(points[10].angle);
  });
});
