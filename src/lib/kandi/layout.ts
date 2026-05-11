import { RingPoint } from "./types";

export function getRingPoint(index: number, count: number, radius: number): RingPoint {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  return {
    x,
    y,
    z: 0,
    angle,
  };
}

export function getRingPoints(count: number, radius: number): RingPoint[] {
  return Array.from({ length: count }, (_, index) => getRingPoint(index, count, radius));
}
