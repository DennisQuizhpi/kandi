import {
  BASE_COLORS,
  DEFAULT_BEAD_COUNT,
  DEFAULT_SHAPE,
  MAX_BEAD_COUNT,
  MIN_BEAD_COUNT,
} from "./constants";
import { applyPatchToBeads } from "./patch";
import { adjacentBeadId, toggleId } from "./selection";
import { Bead, EditPatch, KandiDesign, KandiState, SelectionState, StateSnapshot } from "./types";

export type KandiAction =
  | { type: "hydrate"; design: KandiDesign }
  | { type: "selectSingle"; id: string; additive: boolean }
  | { type: "setSelection"; ids: string[]; mode: SelectionState["mode"] }
  | { type: "clearSelection" }
  | { type: "applyPatch"; patch: EditPatch }
  | { type: "removeBead"; beadId: string }
  | { type: "removeSelectedBeads" }
  | { type: "insertBeadBefore"; beadId: string }
  | { type: "insertBeadAfter"; beadId: string }
  | { type: "duplicateBead"; beadId: string }
  | { type: "duplicateSelection"; ids: string[] }
  | { type: "moveSelectionToTarget"; ids: string[]; targetId: string }
  | { type: "moveSelectionStep"; ids: string[]; direction: "left" | "right" }
  | { type: "addWord"; word: string }
  | { type: "setBeadCount"; beadCount: number }
  | { type: "renameDesign"; name: string }
  | { type: "undo" }
  | { type: "redo" };

const HISTORY_LIMIT = 20;

function makeBead(index: number, color?: string): Bead {
  return {
    id: `bead-${index}-${Math.random().toString(36).slice(2, 9)}`,
    index,
    shape: DEFAULT_SHAPE,
    color: color ?? BASE_COLORS[index % BASE_COLORS.length],
  };
}

function normalizeWordCharacters(word: string): string[] {
  return Array.from(word.trim().toUpperCase()).filter((char) => /\S/.test(char));
}

function makeLetterBead(index: number, label: string): Bead {
  return {
    id: `bead-${index}-${Math.random().toString(36).slice(2, 9)}`,
    index,
    shape: "cube",
    color: "#ffffff",
    label,
  };
}

function makeInsertedRoundBead(index: number, color: string): Bead {
  return {
    id: `bead-${index}-${Math.random().toString(36).slice(2, 9)}`,
    index,
    shape: "round",
    color,
  };
}

function coerceLetterBeadShape(bead: Bead): Bead {
  if (!bead.label?.length) {
    return bead;
  }
  return bead.shape === "cube" ? bead : { ...bead, shape: "cube" };
}

function cloneBead(bead: Bead, index = bead.index): Bead {
  const next: Bead = {
    id: bead.id,
    index,
    shape: bead.shape,
    color: bead.color,
  };
  if (bead.label !== undefined) {
    next.label = bead.label;
  }
  return next;
}

function normalizeDesign(design: KandiDesign): KandiDesign {
  const beadCount = clampBeadCount(design.beadCount);
  const beads = resizeBeadArray(
    design.beads.map((bead, index) =>
      coerceLetterBeadShape({
        ...cloneBead(bead),
        index,
        color: bead.color ?? BASE_COLORS[index % BASE_COLORS.length],
        shape: bead.shape ?? DEFAULT_SHAPE,
      }),
    ),
    beadCount,
  );

  return {
    ...design,
    beadCount,
    beads,
    updatedAt: new Date().toISOString(),
  };
}

function snapshot(state: KandiState): StateSnapshot {
  return {
    design: state.design,
    selection: state.selection,
  };
}

function withHistory(state: KandiState, updater: (state: KandiState) => KandiState): KandiState {
  const next = updater(state);
  if (next.design === state.design && next.selection === state.selection) {
    return state;
  }

  return {
    ...next,
    history: [...state.history, snapshot(state)].slice(-HISTORY_LIMIT),
    future: [],
  };
}

function cloneDesign(design: KandiDesign): KandiDesign {
  return {
    ...design,
    beads: design.beads.map((bead) => cloneBead(bead)),
  };
}

function cloneSelection(selection: SelectionState): SelectionState {
  return {
    ...selection,
    selectedIds: [...selection.selectedIds],
    pendingPatch: selection.pendingPatch ? { ...selection.pendingPatch } : null,
  };
}

function clampBeadCount(beadCount: number): number {
  return Math.max(MIN_BEAD_COUNT, Math.min(MAX_BEAD_COUNT, beadCount));
}

export function resizeBeadArray(beads: Bead[], nextCount: number): Bead[] {
  const clampedCount = clampBeadCount(nextCount);
  if (beads.length === clampedCount) {
    return beads.map((bead, index) => cloneBead(bead, index));
  }

  if (beads.length > clampedCount) {
    return beads.slice(0, clampedCount).map((bead, index) => cloneBead(bead, index));
  }

  const output = [...beads.map((bead, index) => cloneBead(bead, index))];
  for (let i = output.length; i < clampedCount; i += 1) {
    output.push(makeBead(i));
  }
  return output;
}

export function createDefaultDesign(beadCount = DEFAULT_BEAD_COUNT): KandiDesign {
  const now = new Date().toISOString();
  const clampedCount = clampBeadCount(beadCount);

  return {
    id: `kandi-${Math.random().toString(36).slice(2, 9)}`,
    name: "Untitled Kandi",
    beadCount: clampedCount,
    beads: Array.from({ length: clampedCount }, (_, index) => makeBead(index)),
    createdAt: now,
    updatedAt: now,
  };
}

export function createInitialState(design = createDefaultDesign()): KandiState {
  const normalized = normalizeDesign(design);
  return {
    design: normalized,
    selection: {
      selectedIds: [],
      mode: "single",
      pendingPatch: null,
    },
    history: [],
    future: [],
  };
}

export function kandiReducer(state: KandiState, action: KandiAction): KandiState {
  switch (action.type) {
    case "hydrate": {
      return createInitialState(action.design);
    }
    case "selectSingle": {
      const selectedIds = toggleId(state.selection.selectedIds, action.id, action.additive);
      return {
        ...state,
        selection: {
          ...state.selection,
          selectedIds,
          mode: "single",
        },
      };
    }
    case "setSelection": {
      const selectedIds = [...new Set(action.ids)];
      return {
        ...state,
        selection: {
          ...state.selection,
          selectedIds,
          mode: action.mode,
        },
      };
    }
    case "clearSelection": {
      return {
        ...state,
        selection: {
          ...state.selection,
          selectedIds: [],
        },
      };
    }
    case "applyPatch": {
      if (state.selection.selectedIds.length === 0) {
        return state;
      }

      return withHistory(state, (currentState) => {
        const selectedIds = new Set(currentState.selection.selectedIds);
        const beads = applyPatchToBeads(currentState.design.beads, selectedIds, action.patch);
        const updatedDesign: KandiDesign = {
          ...currentState.design,
          beads,
          updatedAt: new Date().toISOString(),
        };

        return {
          ...currentState,
          design: updatedDesign,
          selection: {
            ...currentState.selection,
            pendingPatch: action.patch,
          },
        };
      });
    }
    case "setBeadCount": {
      return withHistory(state, (currentState) => {
        const nextCount = clampBeadCount(action.beadCount);
        const resized = resizeBeadArray(currentState.design.beads, nextCount);
        const selectedSet = new Set(resized.map((bead) => bead.id));
        const selectedIds = currentState.selection.selectedIds.filter((id) => selectedSet.has(id));

        return {
          ...currentState,
          design: {
            ...currentState.design,
            beadCount: nextCount,
            beads: resized,
            updatedAt: new Date().toISOString(),
          },
          selection: {
            ...currentState.selection,
            selectedIds,
          },
        };
      });
    }
    case "removeBead": {
      return withHistory(state, (currentState) => {
        const currentBeads = currentState.design.beads;
        if (currentBeads.length <= MIN_BEAD_COUNT) {
          return currentState;
        }

        const targetIndex = currentBeads.findIndex((bead) => bead.id === action.beadId);
        if (targetIndex === -1) {
          return currentState;
        }

        const nextBeads = currentBeads
          .filter((bead) => bead.id !== action.beadId)
          .map((bead, index) => cloneBead(bead, index));
        const remainingIds = new Set(nextBeads.map((bead) => bead.id));
        const removedWasSelected = currentState.selection.selectedIds.includes(action.beadId);
        const fallbackSelectedId = adjacentBeadId(currentBeads, [action.beadId], "prev");
        const selectedIds = removedWasSelected
          ? fallbackSelectedId && remainingIds.has(fallbackSelectedId)
            ? [fallbackSelectedId]
            : []
          : currentState.selection.selectedIds.filter((id) => remainingIds.has(id));

        return {
          ...currentState,
          design: {
            ...currentState.design,
            beadCount: nextBeads.length,
            beads: nextBeads,
            updatedAt: new Date().toISOString(),
          },
          selection: {
            ...currentState.selection,
            selectedIds,
          },
        };
      });
    }
    case "removeSelectedBeads": {
      return withHistory(state, (currentState) => {
        const currentBeads = currentState.design.beads;
        const selectedSet = new Set(currentState.selection.selectedIds);
        if (selectedSet.size === 0) {
          return currentState;
        }

        const keepMinimum = MIN_BEAD_COUNT;
        const removableCount = Math.max(0, currentBeads.length - keepMinimum);
        if (removableCount === 0) {
          return currentState;
        }

        const selectedInOrder = currentBeads.filter((bead) => selectedSet.has(bead.id));
        const toRemove = new Set(selectedInOrder.slice(0, removableCount).map((bead) => bead.id));
        if (toRemove.size === 0) {
          return currentState;
        }

        const remaining = currentBeads.filter((bead) => !toRemove.has(bead.id));
        const nextBeads = remaining.map((bead, index) => cloneBead(bead, index));

        return {
          ...currentState,
          design: {
            ...currentState.design,
            beadCount: nextBeads.length,
            beads: nextBeads,
            updatedAt: new Date().toISOString(),
          },
          selection: {
            ...currentState.selection,
            selectedIds: [],
          },
        };
      });
    }
    case "insertBeadBefore":
    case "insertBeadAfter": {
      return withHistory(state, (currentState) => {
        const currentBeads = currentState.design.beads;
        if (currentBeads.length >= MAX_BEAD_COUNT) {
          return currentState;
        }
        const targetIndex = currentBeads.findIndex((bead) => bead.id === action.beadId);
        if (targetIndex === -1) {
          return currentState;
        }
        const insertAt = action.type === "insertBeadBefore" ? targetIndex : targetIndex + 1;
        const targetBead = currentBeads[targetIndex];
        const nextBeads: Bead[] = [];
        for (let i = 0; i < currentBeads.length + 1; i += 1) {
          if (i === insertAt) {
            const inserted = makeInsertedRoundBead(i, targetBead.color);
            nextBeads.push(inserted);
            continue;
          }
          const src = currentBeads[i > insertAt ? i - 1 : i];
          nextBeads.push(cloneBead(src, i));
        }

        return {
          ...currentState,
          design: {
            ...currentState.design,
            beadCount: nextBeads.length,
            beads: nextBeads,
            updatedAt: new Date().toISOString(),
          },
          selection: {
            ...currentState.selection,
            selectedIds: currentState.selection.selectedIds,
          },
        };
      });
    }
    case "duplicateBead": {
      return withHistory(state, (currentState) => {
        const currentBeads = currentState.design.beads;
        if (currentBeads.length >= MAX_BEAD_COUNT) {
          return currentState;
        }
        const targetIndex = currentBeads.findIndex((bead) => bead.id === action.beadId);
        if (targetIndex === -1) {
          return currentState;
        }
        const insertAt = targetIndex + 1;
        const target = currentBeads[targetIndex];
        const duplicated: Bead = {
          ...cloneBead(target, insertAt),
          id: `bead-${insertAt}-${Math.random().toString(36).slice(2, 9)}`,
        };
        const nextBeads: Bead[] = [];
        for (let i = 0; i < currentBeads.length + 1; i += 1) {
          if (i === insertAt) {
            nextBeads.push(duplicated);
            continue;
          }
          const src = currentBeads[i > insertAt ? i - 1 : i];
          nextBeads.push(cloneBead(src, i));
        }

        return {
          ...currentState,
          design: {
            ...currentState.design,
            beadCount: nextBeads.length,
            beads: nextBeads,
            updatedAt: new Date().toISOString(),
          },
          selection: {
            ...currentState.selection,
            selectedIds: [duplicated.id],
            mode: "single",
          },
        };
      });
    }
    case "duplicateSelection": {
      return withHistory(state, (currentState) => {
        const currentBeads = currentState.design.beads;
        if (currentBeads.length >= MAX_BEAD_COUNT) {
          return currentState;
        }
        const selectedSet = new Set(action.ids);
        const selectedInOrder = currentBeads.filter((bead) => selectedSet.has(bead.id));
        if (selectedInOrder.length === 0) {
          return currentState;
        }

        const room = Math.max(0, MAX_BEAD_COUNT - currentBeads.length);
        const duplicable = selectedInOrder.slice(0, room);
        if (duplicable.length === 0) {
          return currentState;
        }
        const insertAfterIndex = Math.max(...duplicable.map((bead) => bead.index));
        const nextBeads: Bead[] = [];
        const duplicatedIds: string[] = [];
        for (let i = 0; i < currentBeads.length; i += 1) {
          nextBeads.push(cloneBead(currentBeads[i], nextBeads.length));
          if (i !== insertAfterIndex) {
            continue;
          }
          for (const source of duplicable) {
            const duplicated: Bead = {
              ...cloneBead(source, nextBeads.length),
              id: `bead-${nextBeads.length}-${Math.random().toString(36).slice(2, 9)}`,
            };
            duplicatedIds.push(duplicated.id);
            nextBeads.push(duplicated);
          }
        }

        return {
          ...currentState,
          design: {
            ...currentState.design,
            beadCount: nextBeads.length,
            beads: nextBeads,
            updatedAt: new Date().toISOString(),
          },
          selection: {
            ...currentState.selection,
            selectedIds: duplicatedIds,
            mode: duplicatedIds.length > 1 ? "marquee" : "single",
          },
        };
      });
    }
    case "moveSelectionToTarget": {
      return withHistory(state, (currentState) => {
        const currentBeads = currentState.design.beads;
        const selectedSet = new Set(action.ids);
        if (selectedSet.size === 0) {
          return currentState;
        }
        const selectedInOrder = currentBeads.filter((bead) => selectedSet.has(bead.id));
        if (selectedInOrder.length === 0) {
          return currentState;
        }
        const targetIndex = currentBeads.findIndex((bead) => bead.id === action.targetId);
        if (targetIndex === -1 || selectedSet.has(action.targetId)) {
          return currentState;
        }

        // Single-bead shift move swaps source/target positions.
        if (selectedInOrder.length === 1) {
          const sourceId = selectedInOrder[0].id;
          const sourceIndex = currentBeads.findIndex((bead) => bead.id === sourceId);
          if (sourceIndex === -1 || sourceIndex === targetIndex) {
            return currentState;
          }
          const nextBeads = currentBeads.map((bead, index) => cloneBead(bead, index));
          const source = nextBeads[sourceIndex];
          nextBeads[sourceIndex] = { ...cloneBead(nextBeads[targetIndex], sourceIndex) };
          nextBeads[targetIndex] = { ...cloneBead(source, targetIndex) };
          nextBeads.forEach((bead, index) => {
            bead.index = index;
          });
          return {
            ...currentState,
            design: {
              ...currentState.design,
              beadCount: nextBeads.length,
              beads: nextBeads,
              updatedAt: new Date().toISOString(),
            },
            selection: {
              ...currentState.selection,
              selectedIds: [sourceId],
              mode: "single",
            },
          };
        }

        // Multi-bead move extracts selected beads as a group and inserts before target.
        const movingIds = selectedInOrder.map((bead) => bead.id);
        const remaining = currentBeads.filter((bead) => !selectedSet.has(bead.id));
        const insertAt = remaining.findIndex((bead) => bead.id === action.targetId);
        if (insertAt === -1) {
          return currentState;
        }
        const moving = selectedInOrder.map((bead) => cloneBead(bead));
        const merged = [
          ...remaining.slice(0, insertAt),
          ...moving,
          ...remaining.slice(insertAt),
        ];
        const nextBeads = merged.map((bead, index) => cloneBead(bead, index));

        return {
          ...currentState,
          design: {
            ...currentState.design,
            beadCount: nextBeads.length,
            beads: nextBeads,
            updatedAt: new Date().toISOString(),
          },
          selection: {
            ...currentState.selection,
            selectedIds: movingIds,
            mode: movingIds.length > 1 ? "marquee" : "single",
          },
        };
      });
    }
    case "moveSelectionStep": {
      return withHistory(state, (currentState) => {
        const currentBeads = currentState.design.beads;
        const n = currentBeads.length;
        if (n <= 1) {
          return currentState;
        }
        const selectedSet = new Set(action.ids);
        if (selectedSet.size === 0) {
          return currentState;
        }

        if (selectedSet.size === 1) {
          const next = currentBeads.map((bead) => cloneBead(bead));
          const i = currentBeads.findIndex((bead) => selectedSet.has(bead.id));
          if (i === -1) {
            return currentState;
          }
          const j = action.direction === "right" ? (i + 1) % n : (i - 1 + n) % n;
          const temp = next[i];
          next[i] = next[j];
          next[j] = temp;
          const nextBeads = next.map((bead, index) => cloneBead(bead, index));
          const selectedIds = nextBeads.filter((bead) => selectedSet.has(bead.id)).map((bead) => bead.id);
          return {
            ...currentState,
            design: {
              ...currentState.design,
              beadCount: nextBeads.length,
              beads: nextBeads,
              updatedAt: new Date().toISOString(),
            },
            selection: {
              ...currentState.selection,
              selectedIds,
              mode: "single",
            },
          };
        }

        const selectedInOrder = currentBeads.filter((bead) => selectedSet.has(bead.id));
        if (selectedInOrder.length === 0) {
          return currentState;
        }
        const first = selectedInOrder[0];
        const last = selectedInOrder[selectedInOrder.length - 1];
        const neighborIndex =
          action.direction === "right"
            ? (last.index + 1) % n
            : (first.index - 1 + n) % n;
        const neighbor = currentBeads[neighborIndex];
        if (!neighbor || selectedSet.has(neighbor.id)) {
          return currentState;
        }
        const remaining = currentBeads.filter((bead) => !selectedSet.has(bead.id)).map((bead) => cloneBead(bead));
        const moving = selectedInOrder.map((bead) => cloneBead(bead));
        const neighborPos = remaining.findIndex((bead) => bead.id === neighbor.id);
        if (neighborPos === -1) {
          return currentState;
        }
        const insertAt = action.direction === "right" ? neighborPos + 1 : neighborPos;
        const merged = [
          ...remaining.slice(0, insertAt),
          ...moving,
          ...remaining.slice(insertAt),
        ];
        const nextBeads = merged.map((bead, index) => cloneBead(bead, index));
        const selectedIds = nextBeads.filter((bead) => selectedSet.has(bead.id)).map((bead) => bead.id);

        return {
          ...currentState,
          design: {
            ...currentState.design,
            beadCount: nextBeads.length,
            beads: nextBeads,
            updatedAt: new Date().toISOString(),
          },
          selection: {
            ...currentState.selection,
            selectedIds,
            mode: "marquee",
          },
        };
      });
    }
    case "addWord": {
      return withHistory(state, (currentState) => {
        const letters = normalizeWordCharacters(action.word);
        if (letters.length === 0) {
          return currentState;
        }

        const room = Math.max(0, MAX_BEAD_COUNT - currentState.design.beads.length);
        if (room === 0) {
          return currentState;
        }
        const lettersToAdd = letters.slice(0, room);
        if (lettersToAdd.length === 0) {
          return currentState;
        }

        const startIndex = currentState.design.beads.length;
        const appended = lettersToAdd.map((letter, offset) => makeLetterBead(startIndex + offset, letter));
        const beads = [...currentState.design.beads.map((bead, index) => cloneBead(bead, index)), ...appended];

        return {
          ...currentState,
          design: {
            ...currentState.design,
            beadCount: beads.length,
            beads,
            updatedAt: new Date().toISOString(),
          },
        };
      });
    }
    case "renameDesign": {
      if (action.name === state.design.name) {
        return state;
      }
      return {
        ...state,
        design: {
          ...state.design,
          name: action.name,
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case "undo": {
      const lastSnapshot = state.history[state.history.length - 1];
      if (!lastSnapshot) {
        return state;
      }

      const history = state.history.slice(0, -1);
      return {
        ...state,
        design: lastSnapshot.design,
        selection: lastSnapshot.selection,
        history,
        future: [snapshot(state), ...state.future].slice(0, HISTORY_LIMIT),
      };
    }
    case "redo": {
      const nextSnapshot = state.future[0];
      if (!nextSnapshot) {
        return state;
      }

      return {
        ...state,
        design: nextSnapshot.design,
        selection: nextSnapshot.selection,
        history: [...state.history, snapshot(state)].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
      };
    }
    default: {
      return state;
    }
  }
}
