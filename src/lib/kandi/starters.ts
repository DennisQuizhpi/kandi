import type { Bead, BeadShape, KandiDesign } from "./types";

export type StarterBead = {
  color: string;
  shape?: BeadShape;
  label?: string;
};

export type StarterPreset = {
  id: string;
  label: string;
  description?: string;
  beads: StarterBead[];
  tags?: string[];
};

const DEFAULT_STARTER_SHAPE: BeadShape = "round";
export const STARTER_BEAD_COUNT = 28;

export const STARTER_PRESETS: StarterPreset[] = [
  {
    id: "sweetheart",
    label: "Sweetheart",
    description: "PAWS OFF",
    tags: ["cute", "phrase"],
    beads: [
      { color: "#ff5c8a", label: "P" },
      { color: "#ffffff", label: "A" },
      { color: "#ff934f", label: "W" },
      { color: "#ffffff", label: "S" },
      { color: "#ffd84d" },
      { color: "#49d9ff", label: "O" },
      { color: "#ffffff", label: "F" },
      { color: "#c687ff", label: "F" },
      { color: "#72ff7a", shape: "heart" },
    ],
  },
  {
    id: "bubble-pop",
    label: "Bubble Pop",
    description: "checker pop",
    tags: ["pattern", "classic"],
    beads: [
      { color: "#ff5c8a" },
      { color: "#49d9ff" },
      { color: "#ff5c8a" },
      { color: "#49d9ff" },
      { color: "#ffffff", shape: "star" },
      { color: "#49d9ff" },
      { color: "#ff5c8a" },
      { color: "#49d9ff" },
      { color: "#ff5c8a" },
    ],
  },
  {
    id: "cutie-smiles",
    label: "Cutie Smiles",
    description: "SMILEY",
    tags: ["cute", "smiley"],
    beads: [
      { color: "#ffd84d", label: ":" },
      { color: "#ffd84d", label: ")" },
      { color: "#ff5c8a" },
      { color: "#ffffff", label: "S" },
      { color: "#49d9ff", label: "M" },
      { color: "#72ff7a", label: "I" },
      { color: "#ffffff", label: "L" },
      { color: "#c687ff", label: "E" },
      { color: "#ff934f", label: "Y" },
      { color: "#ffd84d", label: ":" },
      { color: "#ffd84d", label: ")" },
    ],
  },
  {
    id: "starlight",
    label: "Starlight",
    description: "pastel stars",
    tags: ["pattern", "stars"],
    beads: [
      { color: "#c687ff", shape: "star" },
      { color: "#8fd3ff" },
      { color: "#ffffff" },
      { color: "#ff5c8a" },
      { color: "#ffd84d", shape: "star" },
      { color: "#ffffff" },
      { color: "#49d9ff" },
      { color: "#72ff7a" },
      { color: "#ff934f", shape: "star" },
    ],
  },
  {
    id: "rainbow-rush",
    label: "Rainbow Rush",
    description: "classic rainbow",
    tags: ["classic", "rainbow"],
    beads: [
      { color: "#ff5c8a" },
      { color: "#ff934f" },
      { color: "#ffd84d" },
      { color: "#72ff7a" },
      { color: "#49d9ff" },
      { color: "#8fd3ff" },
      { color: "#c687ff" },
      { color: "#ffffff" },
      { color: "#ff5c8a" },
      { color: "#ff934f" },
    ],
  },
  {
    id: "angel-energy",
    label: "Angel Energy",
    description: "ANGEL",
    tags: ["phrase", "cute"],
    beads: [
      { color: "#ffffff", label: "A" },
      { color: "#8fd3ff", label: "N" },
      { color: "#ffffff", label: "G" },
      { color: "#c687ff", label: "E" },
      { color: "#ffffff", label: "L" },
      { color: "#72ff7a", shape: "heart" },
      { color: "#49d9ff" },
      { color: "#ffd84d" },
    ],
  },
];

function createBeadId(index: number): string {
  return `bead-${index}-${Math.random().toString(36).slice(2, 9)}`;
}

function toBead(starter: StarterBead, index: number): Bead {
  const label = starter.label?.trim().toUpperCase();
  const hasLabel = Boolean(label && label.length > 0);
  return {
    id: createBeadId(index),
    index,
    shape: hasLabel ? "cube" : starter.shape ?? DEFAULT_STARTER_SHAPE,
    color: starter.color,
    ...(hasLabel ? { label } : {}),
  };
}

export function expandStarterBeads(beads: StarterBead[], targetCount = STARTER_BEAD_COUNT): StarterBead[] {
  if (beads.length >= targetCount) {
    return beads.slice(0, targetCount);
  }
  return Array.from({ length: targetCount }, (_, index) => beads[index % beads.length] ?? beads[0] ?? { color: "#ffffff" });
}

export function starterPresetToDesign(preset: StarterPreset): KandiDesign {
  const now = new Date().toISOString();
  const expanded = expandStarterBeads(preset.beads);
  const beads = expanded.map((bead, index) => toBead(bead, index));

  return {
    id: `kandi-${Math.random().toString(36).slice(2, 9)}`,
    name: preset.label,
    beadCount: beads.length,
    beads,
    createdAt: now,
    updatedAt: now,
  };
}
