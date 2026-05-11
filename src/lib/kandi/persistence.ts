import { STORAGE_KEY } from "./constants";
import { KandiDesign } from "./types";

export function saveDesign(design: KandiDesign): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
}

export function downloadDesignAsFile(design: KandiDesign): void {
  if (typeof window === "undefined") {
    return;
  }

  const safe =
    design.name
      .trim()
      .replace(/[^\w\s-]+/g, "")
      .replace(/\s+/g, "-") || "kandi-design";
  const blob = new Blob([JSON.stringify(design, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safe}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function loadDesign(): KandiDesign | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as KandiDesign;
    if (!parsed?.beads || typeof parsed.beadCount !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
