import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultDesign } from "@/lib/kandi/store";

import { KandiShareDialog } from "./KandiShareDialog";

const publishShareMock = vi.fn();
const uploadShareBackgroundMock = vi.fn();

vi.mock("@/lib/kandi/share/client", () => ({
  publishShare: (...args: unknown[]) => publishShareMock(...args),
  uploadShareBackground: (...args: unknown[]) => uploadShareBackgroundMock(...args),
}));

describe("KandiShareDialog", () => {
  beforeEach(() => {
    publishShareMock.mockReset();
    uploadShareBackgroundMock.mockReset();
    Object.defineProperty(window.navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  it("publishes and shows share link actions", async () => {
    publishShareMock.mockResolvedValue({
      slug: "abcdefghjk",
      shareUrl: "http://localhost:3000/p/abcdefghjk",
    });
    uploadShareBackgroundMock.mockResolvedValue({
      assetId: "asset-123",
      assetUrl: "http://localhost:3000/api/share/assets/asset-123",
    });

    render(<KandiShareDialog open design={createDefaultDesign(12)} onClose={() => {}} />);

    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], "bg.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadShareBackgroundMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish Postcard" }));

    await waitFor(() => {
      expect(publishShareMock).toHaveBeenCalled();
    });

    expect(await screen.findByText("Published.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy Link" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Link Copied" })).toBeInTheDocument();
    });
  });
});
