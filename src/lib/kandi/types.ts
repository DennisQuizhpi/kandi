export type BeadShape = "round" | "cube" | "heart" | "star";

export interface Bead {
  id: string;
  index: number;
  shape: BeadShape;
  color: string;
  label?: string;
}

export interface KandiDesign {
  id: string;
  name: string;
  beadCount: number;
  beads: Bead[];
  createdAt: string;
  updatedAt: string;
}

export type SelectionMode = "single" | "marquee";

export interface EditPatch {
  color?: string;
  label?: string;
  shape?: BeadShape;
}

export interface SelectionState {
  selectedIds: string[];
  mode: SelectionMode;
  pendingPatch: EditPatch | null;
}

export interface KandiState {
  design: KandiDesign;
  selection: SelectionState;
  history: StateSnapshot[];
  future: StateSnapshot[];
}

export interface StateSnapshot {
  design: KandiDesign;
  selection: SelectionState;
}

export interface RingPoint {
  x: number;
  y: number;
  z: number;
  angle: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
