import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadDesignMock = vi.fn();
const saveDesignMock = vi.fn();

vi.mock("@/lib/kandi/persistence", () => ({
  loadDesign: () => loadDesignMock(),
  saveDesign: (...args: unknown[]) => saveDesignMock(...args),
}));

vi.mock("@/lib/kandi/share/client", () => ({
  fetchSharedPostcard: vi.fn(),
  publishShare: vi.fn(),
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="starter-3d-preview" />,
}));

vi.mock("./KandiShareDialog", () => ({
  KandiShareDialog: () => null,
}));

vi.mock("./KandiCanvas", async () => {
  const React = await import("react");

  return {
    GUIDED_ELEVATION_DEFAULT_DEG: 0,
    GUIDED_ELEVATION_MAX_DEG: 10,
    GUIDED_ELEVATION_MIN_DEG: -10,
    GUIDED_ELEVATION_STEP_DEG: 5,
    KandiCanvas: ({
      beads,
      selectedIds,
      activeBeadId,
      pendingFocusBeadId,
      onFocusComplete,
      onActiveBeadMeta,
      onBeadClick,
    }: any) => {
      React.useEffect(() => {
        if (!activeBeadId) {
          onActiveBeadMeta?.(null);
          return;
        }
        onActiveBeadMeta?.({
          beadId: activeBeadId,
          anchor: { x: 0, y: 0 },
          isFront: true,
        });
      }, [activeBeadId, onActiveBeadMeta]);

      return (
        <div>
          <output data-testid="bead-count">{beads.length}</output>
          <output data-testid="selected-count">{selectedIds.length}</output>
          <output data-testid="selected-id">{selectedIds[0] ?? ""}</output>
          <output data-testid="pending-focus-id">{pendingFocusBeadId ?? ""}</output>
          {pendingFocusBeadId ? (
            <button type="button" onClick={() => onFocusComplete(pendingFocusBeadId)}>
              Complete mock focus
            </button>
          ) : null}
          {beads.map((bead: any, index: number) => (
            <button
              key={bead.id}
              type="button"
              aria-label={`Mock bead ${index}`}
              onClick={(event) =>
                onBeadClick({
                  beadId: bead.id,
                  toggleSelect: event.metaKey || event.ctrlKey,
                  rangeSelect: event.shiftKey,
                })
              }
            >
              {bead.id}
            </button>
          ))}
        </div>
      );
    },
  };
});

import { KandiEditor } from "./KandiEditor";

describe("KandiEditor", () => {
  async function enterEditor() {
    await waitFor(() => {
      expect(screen.getByTestId("bead-count")).toBeInTheDocument();
    });
  }

  beforeEach(() => {
    cleanup();
    loadDesignMock.mockReset();
    loadDesignMock.mockReturnValue(null);
    saveDesignMock.mockReset();

    class MockAudio {
      preload = "";
      volume = 0;
      currentTime = 0;
      pause = vi.fn();
      removeAttribute = vi.fn();
      load = vi.fn();
      play = vi.fn().mockResolvedValue(undefined);
    }

    Object.defineProperty(globalThis, "Audio", {
      configurable: true,
      writable: true,
      value: MockAudio,
    });
  });

  it("deletes the selected bead with Backspace", async () => {
    render(<KandiEditor />);
    await enterEditor();

    const initialCount = Number(screen.getByTestId("bead-count").textContent);

    fireEvent.click(screen.getByRole("button", { name: "Mock bead 0" }));
    expect(screen.getByTestId("selected-count").textContent).toBe("1");

    fireEvent.keyDown(window, { key: "Backspace" });

    await waitFor(() => {
      expect(screen.getByTestId("bead-count").textContent).toBe(String(initialCount - 1));
    });
    const completeFocusButton = screen.queryByRole("button", { name: "Complete mock focus" });
    if (completeFocusButton) {
      fireEvent.click(completeFocusButton);
    }
    expect(screen.getByTestId("selected-count").textContent).toBe("1");
  });

  it("deletes a multi-selection with Delete", async () => {
    render(<KandiEditor />);
    await enterEditor();

    const initialCount = Number(screen.getByTestId("bead-count").textContent);

    fireEvent.click(screen.getByRole("button", { name: "Mock bead 0" }));
    fireEvent.click(screen.getByRole("button", { name: "Mock bead 1" }), { ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId("selected-count").textContent).toBe("2");
    });

    fireEvent.keyDown(window, { key: "Delete" });

    await waitFor(() => {
      expect(screen.getByTestId("bead-count").textContent).toBe(String(initialCount - 2));
    });
    const completeFocusButton = screen.queryByRole("button", { name: "Complete mock focus" });
    if (completeFocusButton) {
      fireEvent.click(completeFocusButton);
    }
    await waitFor(() => {
      expect(screen.getByTestId("selected-count").textContent).toBe("1");
    });
  });

  it("selects the next bead with ArrowRight", async () => {
    render(<KandiEditor />);
    await enterEditor();

    fireEvent.click(screen.getByRole("button", { name: "Mock bead 0" }));
    const firstId = screen.getByTestId("selected-id").textContent;
    fireEvent.click(screen.getByRole("button", { name: "Complete mock focus" }));

    fireEvent.keyDown(window, { key: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getByTestId("selected-id").textContent).not.toBe(firstId);
    });
    const beads = screen.getAllByRole("button", { name: /^Mock bead \d+$/ });
    expect(screen.getByTestId("selected-id").textContent).toBe(beads[1].textContent);
  });

  it("waits for focus completion before showing bead overlay controls", async () => {
    render(<KandiEditor />);
    await enterEditor();

    fireEvent.click(screen.getByRole("button", { name: "Mock bead 0" }));

    expect(screen.queryByRole("button", { name: "Insert bead before" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete bead" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Complete mock focus" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Insert bead before" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Delete bead" })).toBeInTheDocument();
  });

  it("keeps insert controls available immediately after inserting", async () => {
    render(<KandiEditor />);
    await enterEditor();

    const initialCount = Number(screen.getByTestId("bead-count").textContent);

    fireEvent.click(screen.getByRole("button", { name: "Mock bead 0" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete mock focus" }));
    const originallySelectedId = screen.getByTestId("selected-id").textContent;

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Insert bead before" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Insert bead before" }));

    await waitFor(() => {
      expect(screen.getByTestId("bead-count").textContent).toBe(String(initialCount + 1));
    });
    const newlySelectedId = screen.getByTestId("selected-id").textContent;
    expect(newlySelectedId).not.toBe(originallySelectedId);
    expect(screen.getByTestId("pending-focus-id").textContent).toBe(newlySelectedId);
    expect(screen.getByRole("button", { name: "Insert bead before" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Insert bead after" })).toBeInTheDocument();
  });

  it("hydrates from a preset id when provided", async () => {
    render(<KandiEditor presetId="sweetheart" />);

    await enterEditor();
    expect(screen.getByTestId("bead-count").textContent).toBe("28");
  });
});
