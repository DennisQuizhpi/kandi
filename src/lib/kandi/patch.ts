import { EditPatch, Bead } from "./types";

function normalizeLabel(label: string | undefined): string | undefined {
  if (label === undefined) {
    return undefined;
  }

  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return "";
  }

  return trimmed.slice(0, 1).toUpperCase();
}

export function applyPatchToBeads(beads: Bead[], selectedIds: Set<string>, patch: EditPatch): Bead[] {
  const hasColor = patch.color !== undefined;
  const hasLabel = patch.label !== undefined;
  const hasShape = patch.shape !== undefined;

  if (!hasColor && !hasLabel && !hasShape) {
    return beads;
  }

  const normalizedLabel = normalizeLabel(patch.label);
  let changed = false;

  const next = beads.map((bead) => {
    if (!selectedIds.has(bead.id)) {
      return bead;
    }

    const nextColor = hasColor && patch.color ? patch.color : bead.color;
    const nextShapeBase = hasShape && patch.shape ? patch.shape : bead.shape;
    const nextLabel = hasLabel ? (normalizedLabel ?? undefined) : bead.label;
    const nextShape = nextLabel && nextLabel.length > 0 ? "cube" : nextShapeBase;

    if (bead.color === nextColor && bead.shape === nextShape && bead.label === nextLabel) {
      return bead;
    }

    changed = true;
    const updated: Bead = {
      ...bead,
      color: nextColor,
      shape: nextShape,
    };
    if (nextLabel && nextLabel.length > 0) {
      updated.label = nextLabel;
    } else {
      delete updated.label;
    }
    return updated;
  });

  return changed ? next : beads;
}
