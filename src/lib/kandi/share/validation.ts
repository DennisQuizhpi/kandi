import type { Bead, KandiDesign } from "@/lib/kandi/types";

import type { SharePublishInput } from "./types";

export const SHARE_TITLE_CHAR_LIMIT = 64;
export const SHARE_MESSAGE_CHAR_LIMIT = 160;
export const SHARE_BACKGROUND_MAX_BYTES = 5 * 1024 * 1024;

export const SHARE_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export class ShareValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShareValidationError";
  }
}

function isSafeString(input: unknown): input is string {
  return typeof input === "string";
}

function cloneBead(bead: Bead): Bead {
  const next: Bead = {
    id: bead.id,
    index: bead.index,
    shape: bead.shape,
    color: bead.color,
  };
  if (bead.label !== undefined) {
    next.label = bead.label;
  }
  return next;
}

export function cloneDesignSnapshot(design: KandiDesign): KandiDesign {
  return {
    id: design.id,
    name: design.name,
    beadCount: design.beadCount,
    beads: design.beads.map(cloneBead),
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
  };
}

export function normalizeShareText(input: SharePublishInput): {
  title: string;
  message: string;
  backgroundAssetId?: string;
} {
  const title = input.title.trim();
  const message = input.message.trim();
  const backgroundAssetId = input.backgroundAssetId?.trim();

  if (!title) {
    throw new ShareValidationError("Title is required.");
  }
  if (title.length > SHARE_TITLE_CHAR_LIMIT) {
    throw new ShareValidationError(`Title must be ${SHARE_TITLE_CHAR_LIMIT} characters or fewer.`);
  }
  if (message.length > SHARE_MESSAGE_CHAR_LIMIT) {
    throw new ShareValidationError(`Message must be ${SHARE_MESSAGE_CHAR_LIMIT} characters or fewer.`);
  }

  return {
    title,
    message,
    backgroundAssetId: backgroundAssetId || undefined,
  };
}

export function validateDesignSnapshot(design: unknown): asserts design is KandiDesign {
  if (!design || typeof design !== "object") {
    throw new ShareValidationError("Design payload is missing.");
  }

  const candidate = design as KandiDesign;

  if (!isSafeString(candidate.id) || !isSafeString(candidate.name)) {
    throw new ShareValidationError("Design payload is invalid.");
  }
  if (!Array.isArray(candidate.beads) || typeof candidate.beadCount !== "number") {
    throw new ShareValidationError("Design payload is invalid.");
  }
  if (candidate.beadCount <= 0 || candidate.beads.length !== candidate.beadCount) {
    throw new ShareValidationError("Design bead count is invalid.");
  }

  const beadsValid = candidate.beads.every(
    (bead) =>
      bead &&
      typeof bead === "object" &&
      isSafeString(bead.id) &&
      typeof bead.index === "number" &&
      isSafeString(bead.color) &&
      isSafeString(bead.shape),
  );

  if (!beadsValid) {
    throw new ShareValidationError("Design beads are invalid.");
  }
}

export function validateUploadMimeType(type: string): asserts type is (typeof SHARE_IMAGE_MIME_TYPES)[number] {
  if (!SHARE_IMAGE_MIME_TYPES.includes(type as (typeof SHARE_IMAGE_MIME_TYPES)[number])) {
    throw new ShareValidationError("Only PNG, JPEG, and WebP images are supported.");
  }
}

export function validateUploadSize(byteSize: number): void {
  if (byteSize <= 0) {
    throw new ShareValidationError("Uploaded image is empty.");
  }
  if (byteSize > SHARE_BACKGROUND_MAX_BYTES) {
    throw new ShareValidationError("Uploaded image exceeds the 5 MB limit.");
  }
}
