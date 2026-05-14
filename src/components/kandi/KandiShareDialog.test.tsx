import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultDesign } from "@/lib/kandi/store";

import { KandiShareDialog } from "./KandiShareDialog";

const onSubmitMock = vi.fn();

describe("KandiShareDialog", () => {
  beforeEach(() => {
    onSubmitMock.mockReset();
    Object.defineProperty(window.navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  it("submits title and message", async () => {
    render(<KandiShareDialog open design={createDefaultDesign(12)} onClose={() => {}} onSubmit={onSubmitMock} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "My share" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish Share" }));

    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith({
        title: "My share",
        message: "hello",
      });
    });
  });
});
