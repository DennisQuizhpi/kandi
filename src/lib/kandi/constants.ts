import { BeadShape } from "./types";

export const DEFAULT_BEAD_COUNT = 32;
export const MIN_BEAD_COUNT = 8;
export const MAX_BEAD_COUNT = 40;
export const EDITOR_MAX_BEAD_COUNT = MAX_BEAD_COUNT;

/** Strand circle radius in world units when the design has {@link DEFAULT_BEAD_COUNT} beads. */
export const RING_RADIUS = 5.5;
const BEAD_SPACING_FACTOR = 0.7;

/** Torus tube radius at {@link DEFAULT_BEAD_COUNT}; scales with bead count alongside {@link braceletRingRadius}. */
export const BRACELET_STRAND_TUBE_RADIUS = 0.028;

export function braceletScaleForBeadCount(beadCount: number): number {
  return Math.max(beadCount, 1) / DEFAULT_BEAD_COUNT;
}

/** Keeps approximate arc spacing between bead centers stable as bead count changes. */
export function braceletRingRadius(beadCount: number): number {
  return RING_RADIUS * BEAD_SPACING_FACTOR * braceletScaleForBeadCount(beadCount);
}

export function braceletStrandTubeRadius(beadCount: number): number {
  return BRACELET_STRAND_TUBE_RADIUS * braceletScaleForBeadCount(beadCount);
}

export const DEFAULT_SHAPE: BeadShape = "round";

export const BASE_COLORS = [
  "#ff5c8a",
  "#49d9ff",
  "#ffd84d",
  "#72ff7a",
  "#c687ff",
  "#ffffff",
  "#ff934f",
  "#8fd3ff",
];

export const STORAGE_KEY = "kandi:v1:design";

/** Matches `:root` `--elevated-surface-*` (keyboard-shortcuts panel reference). */
export const kandiElevatedSurfaceClassName =
  "border border-[var(--elevated-surface-border)] bg-[var(--elevated-surface-bg)] shadow-[var(--elevated-surface-shadow)]";

/** Same tokens with `!` so classes win over `KandiButton` variant defaults. */
export const kandiElevatedSurfaceForcedClassName =
  "!border !border-[var(--elevated-surface-border)] !bg-[var(--elevated-surface-bg)] !shadow-[var(--elevated-surface-shadow)]";

export const LABEL_CHAR_LIMIT = 1;
