import { LocalFsShareRepository, defaultShareDataRoot } from "./localFsRepository";
import { isValidShareSlug } from "./slug";
import { VercelBlobShareRepository } from "./vercelBlobRepository";
import type {
  BackgroundAssetRef,
  PostcardShareRecord,
  SharePublishInput,
  SharePublishResult,
  ShareRepository,
  SharedPostcardRecord,
} from "./types";
import {
  ShareValidationError,
  cloneDesignSnapshot,
  normalizeShareText,
  validateDesignSnapshot,
} from "./validation";

let defaultRepository: ShareRepository | null = null;

export function getShareRepository(): ShareRepository {
  if (!defaultRepository) {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (blobToken) {
      defaultRepository = new VercelBlobShareRepository(blobToken);
    } else {
      const dataRoot = process.env.KANDI_SHARE_DATA_DIR?.trim() || defaultShareDataRoot();
      defaultRepository = new LocalFsShareRepository(dataRoot);
    }
  }
  return defaultRepository;
}

export function resetShareRepositoryForTests(): void {
  defaultRepository = null;
}

export async function publishPostcardShare(
  input: SharePublishInput,
  options: { origin: string; repository?: ShareRepository },
): Promise<SharePublishResult> {
  validateDesignSnapshot(input.design);
  const normalized = normalizeShareText(input);
  const repository = options.repository ?? getShareRepository();

  if (normalized.backgroundAssetId) {
    const background = await repository.getBackgroundAssetRecord(normalized.backgroundAssetId);
    if (!background) {
      throw new ShareValidationError("Background image not found.");
    }
  }

  const snapshot = cloneDesignSnapshot(input.design);
  const record = await repository.publishShare({
    design: snapshot,
    title: normalized.title,
    message: normalized.message,
    backgroundAssetId: normalized.backgroundAssetId,
  });

  return {
    slug: record.slug,
    shareUrl: `${options.origin}/p/${record.slug}`,
    postcardUrl: `${options.origin}/api/share/${record.slug}/postcard`,
  };
}

export async function getSharedPostcard(
  slug: string,
  options: { origin: string; repository?: ShareRepository },
): Promise<SharedPostcardRecord | null> {
  if (!isValidShareSlug(slug)) {
    return null;
  }

  const repository = options.repository ?? getShareRepository();
  const record = await repository.getShare(slug);
  if (!record) {
    return null;
  }

  let backgroundImageUrl: string | undefined;
  if (record.backgroundAssetId) {
    const background = await repository.getBackgroundAssetRecord(record.backgroundAssetId);
    backgroundImageUrl = background?.blobUrl ?? `${options.origin}/api/share/assets/${record.backgroundAssetId}`;
  }

  return toSharedPostcardRecord(record, options.origin, backgroundImageUrl);
}

export function toSharedPostcardRecord(
  record: PostcardShareRecord,
  origin: string,
  backgroundImageUrl?: string,
): SharedPostcardRecord {
  return {
    slug: record.slug,
    design: record.design,
    title: record.title,
    message: record.message,
    backgroundImageUrl:
      backgroundImageUrl ??
      (record.backgroundAssetId ? `${origin}/api/share/assets/${record.backgroundAssetId}` : undefined),
    createdAt: record.createdAt,
  };
}

export function toBackgroundAssetRef(assetId: string, origin: string, blobUrl?: string): BackgroundAssetRef {
  return {
    assetId,
    assetUrl: blobUrl ?? `${origin}/api/share/assets/${assetId}`,
  };
}
