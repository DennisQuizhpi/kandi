import { describe, expect, it } from "vitest";

import { MAX_BEAD_COUNT } from "./constants";
import { createInitialState, kandiReducer } from "./store";

describe("store reducer", () => {
  it("supports add/remove bead count with stable indexes", () => {
    const initial = createInitialState();
    const expanded = kandiReducer(initial, { type: "setBeadCount", beadCount: 40 });
    expect(expanded.design.beadCount).toBe(40);
    expect(expanded.design.beads[39].index).toBe(39);

    const reduced = kandiReducer(expanded, { type: "setBeadCount", beadCount: 24 });
    expect(reduced.design.beadCount).toBe(24);
    expect(reduced.design.beads[23].index).toBe(23);
  });

  it("tracks undo/redo for mutation actions", () => {
    const initial = createInitialState();
    const selected = kandiReducer(initial, { type: "selectSingle", id: initial.design.beads[0].id, additive: false });
    const updated = kandiReducer(selected, { type: "applyPatch", patch: { color: "#123456" } });
    expect(updated.design.beads[0].color).toBe("#123456");

    const undone = kandiReducer(updated, { type: "undo" });
    expect(undone.design.beads[0].color).toBe(initial.design.beads[0].color);

    const redone = kandiReducer(undone, { type: "redo" });
    expect(redone.design.beads[0].color).toBe("#123456");
  });

  it("adds a typed word as white letter beads", () => {
    const initial = createInitialState();
    const next = kandiReducer(initial, { type: "addWord", word: "hi all" });
    const added = next.design.beads.slice(initial.design.beadCount);

    expect(next.design.beadCount).toBe(initial.design.beadCount + 5);
    expect(added.map((bead) => bead.label).join("")).toBe("HIALL");
    expect(added.every((bead) => bead.color === "#ffffff" && bead.shape === "cube")).toBe(true);
  });

  it("inserts a bead before and after target while preserving selection", () => {
    const initial = createInitialState();
    const target = initial.design.beads[3];
    const selectedId = initial.design.beads[0].id;
    const selected = kandiReducer(initial, { type: "setSelection", ids: [selectedId], mode: "single" });

    const withBefore = kandiReducer(selected, { type: "insertBeadBefore", beadId: target.id });
    expect(withBefore.design.beadCount).toBe(initial.design.beadCount + 1);
    expect(withBefore.selection.selectedIds).toEqual([selectedId]);
    const beforeInserted = withBefore.design.beads[target.index];
    expect(beforeInserted.shape).toBe("round");
    expect(beforeInserted.label).toBeUndefined();
    expect(beforeInserted.color).toBe(target.color);
    expect(withBefore.design.beads.every((bead, index) => bead.index === index)).toBe(true);

    const shiftedTarget = withBefore.design.beads.find((bead) => bead.id === target.id);
    expect(shiftedTarget).toBeDefined();
    const withAfter = kandiReducer(withBefore, { type: "insertBeadAfter", beadId: shiftedTarget!.id });
    const targetAfter = withAfter.design.beads.findIndex((bead) => bead.id === shiftedTarget!.id);
    const afterInserted = withAfter.design.beads[targetAfter + 1];
    expect(afterInserted.shape).toBe("round");
    expect(afterInserted.label).toBeUndefined();
    expect(afterInserted.color).toBe(shiftedTarget!.color);
    expect(withAfter.design.beads.every((bead, index) => bead.index === index)).toBe(true);
  });

  it("removes a targeted bead and selects the previous remaining bead", () => {
    const initial = createInitialState();
    const target = initial.design.beads[3];
    const selected = kandiReducer(initial, { type: "selectSingle", id: target.id, additive: false });

    const next = kandiReducer(selected, { type: "removeBead", beadId: target.id });

    expect(next.design.beadCount).toBe(initial.design.beadCount - 1);
    expect(next.design.beads.some((bead) => bead.id === target.id)).toBe(false);
    expect(next.design.beads.every((bead, index) => bead.index === index)).toBe(true);
    expect(next.selection.selectedIds).toEqual([initial.design.beads[2]!.id]);
  });

  it("wraps deletion fallback selection to the last bead", () => {
    const initial = createInitialState();
    const target = initial.design.beads[0];
    const selected = kandiReducer(initial, { type: "selectSingle", id: target.id, additive: false });

    const next = kandiReducer(selected, { type: "removeBead", beadId: target.id });

    expect(next.selection.selectedIds).toEqual([initial.design.beads[initial.design.beads.length - 1]!.id]);
  });

  it("no-ops insertion when at max bead count", () => {
    const initial = createInitialState();
    const maxed = kandiReducer(initial, { type: "setBeadCount", beadCount: MAX_BEAD_COUNT });
    const firstId = maxed.design.beads[0].id;
    const next = kandiReducer(maxed, { type: "insertBeadBefore", beadId: firstId });
    expect(next).toBe(maxed);
  });

  it("swaps a single selected bead with shift-move target", () => {
    const initial = createInitialState();
    const source = initial.design.beads[1];
    const target = initial.design.beads[5];
    const selected = kandiReducer(initial, { type: "setSelection", ids: [source.id], mode: "single" });
    const moved = kandiReducer(selected, {
      type: "moveSelectionToTarget",
      ids: [source.id],
      targetId: target.id,
    });

    expect(moved.design.beads[1].id).toBe(target.id);
    expect(moved.design.beads[5].id).toBe(source.id);
    expect(moved.selection.selectedIds).toEqual([source.id]);
  });

  it("moves a selected group as a contiguous block before target", () => {
    const initial = createInitialState();
    const group = [initial.design.beads[2].id, initial.design.beads[3].id, initial.design.beads[4].id];
    const target = initial.design.beads[8].id;
    const selected = kandiReducer(initial, { type: "setSelection", ids: group, mode: "marquee" });
    const moved = kandiReducer(selected, {
      type: "moveSelectionToTarget",
      ids: group,
      targetId: target,
    });

    const movedIds = moved.design.beads.map((bead) => bead.id);
    const start = movedIds.findIndex((id) => id === group[0]);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(movedIds.slice(start, start + group.length)).toEqual(group);
    expect(moved.selection.selectedIds).toEqual(group);
  });

  it("steps single selection right with wrap via keyboard move", () => {
    const initial = createInitialState();
    const id = initial.design.beads[initial.design.beads.length - 1].id;
    const selected = kandiReducer(initial, { type: "setSelection", ids: [id], mode: "single" });
    const moved = kandiReducer(selected, { type: "moveSelectionStep", ids: [id], direction: "right" });
    expect(moved.design.beads[0].id).toBe(id);
    expect(moved.selection.selectedIds).toEqual([id]);
  });

  it("steps multi selection together to the left via keyboard move", () => {
    const initial = createInitialState();
    const group = [initial.design.beads[4].id, initial.design.beads[5].id];
    const selected = kandiReducer(initial, { type: "setSelection", ids: group, mode: "marquee" });
    const moved = kandiReducer(selected, { type: "moveSelectionStep", ids: group, direction: "left" });
    const movedIds = moved.design.beads.map((bead) => bead.id);
    const start = movedIds.findIndex((id) => id === group[0]);
    expect(movedIds.slice(start, start + group.length)).toEqual(group);
    expect(start).toBe(3);
    expect(moved.selection.selectedIds).toEqual(group);
  });
});
