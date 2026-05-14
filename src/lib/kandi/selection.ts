import { Bead, Rect } from "./types";

export function normalizeRect(startX: number, startY: number, endX: number, endY: number): Rect {
  return {
    left: Math.min(startX, endX),
    right: Math.max(startX, endX),
    top: Math.min(startY, endY),
    bottom: Math.max(startY, endY),
  };
}

export function toggleId(current: string[], beadId: string, additive: boolean): string[] {
  if (!additive) {
    return [beadId];
  }

  const set = new Set(current);
  if (set.has(beadId)) {
    set.delete(beadId);
  } else {
    set.add(beadId);
  }

  return [...set];
}

export function mergeSelectionIds(current: string[], next: string[], additive: boolean): string[] {
  if (additive === false) {
    return [...new Set(next)];
  }

  const set = new Set(current);
  next.forEach((id) => {
    set.add(id);
  });
  return [...set];
}

/** Bead id just outside the current selection on the ring (for shift+arrow range extend). */
export function selectionExtentBoundaryId(
  beads: Bead[],
  selectedIds: string[],
  direction: "next" | "prev",
): string | null {
  const n = beads.length;
  if (n === 0 || selectedIds.length === 0) {
    return null;
  }

  const indices: number[] = [];
  for (const id of selectedIds) {
    const bead = beads.find((b) => b.id === id);
    if (bead !== undefined) {
      indices.push(bead.index);
    }
  }
  if (indices.length === 0) {
    return null;
  }

  if (direction === "next") {
    const maxIdx = Math.max(...indices);
    return beads[(maxIdx + 1) % n]?.id ?? null;
  }

  const minIdx = Math.min(...indices);
  return beads[(minIdx - 1 + n) % n]?.id ?? null;
}

/** Next/prior bead along ring index order (matches layout increasing angle). */
export function adjacentBeadId(
  beads: Bead[],
  selectedIds: string[],
  direction: "next" | "prev",
): string | null {
  const n = beads.length;
  if (n === 0) {
    return null;
  }

  if (selectedIds.length === 0) {
    return direction === "next" ? beads[0]?.id ?? null : beads[n - 1]?.id ?? null;
  }

  const indices: number[] = [];
  for (const id of selectedIds) {
    const bead = beads.find((b) => b.id === id);
    if (bead !== undefined) {
      indices.push(bead.index);
    }
  }
  if (indices.length === 0) {
    return direction === "next" ? beads[0]?.id ?? null : beads[n - 1]?.id ?? null;
  }
  const anchor = Math.min(...indices);
  const nextIndex =
    direction === "next" ? (anchor + 1) % n : (anchor - 1 + n) % n;
  return beads[nextIndex]?.id ?? null;
}

export function selectByRect(
  beads: Bead[],
  positionsById: Record<string, { x: number; y: number }>,
  rect: Rect,
): string[] {
  return beads
    .filter((bead) => {
      const point = positionsById[bead.id];
      if (!point) {
        return false;
      }

      return (
        point.x >= rect.left &&
        point.x <= rect.right &&
        point.y >= rect.top &&
        point.y <= rect.bottom
      );
    })
    .map((bead) => bead.id);
}

/** Inclusive shortest-arc range between two bead ids on the bracelet ring. */
export function rangeIdsBetween(beads: Bead[], startId: string, endId: string): string[] {
  const start = beads.find((bead) => bead.id === startId);
  const end = beads.find((bead) => bead.id === endId);
  if (!start || !end) {
    return end ? [end.id] : [];
  }
  const n = beads.length;
  if (n === 0) {
    return [];
  }
  const cwDist = (end.index - start.index + n) % n;
  const ccwDist = (start.index - end.index + n) % n;
  const step = cwDist <= ccwDist ? 1 : -1;
  const length = Math.min(cwDist, ccwDist);
  const ids: string[] = [];
  for (let i = 0; i <= length; i += 1) {
    const idx = (start.index + step * i + n) % n;
    const bead = beads[idx];
    if (bead) {
      ids.push(bead.id);
    }
  }
  return ids;
}
