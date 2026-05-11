import { list, put } from "@vercel/blob";

import { createShareSlug } from "./slug";
import type {
  BackgroundAssetRecord,
  PostcardShareRecord,
  SharePublishInput,
  ShareRepository,
  StoredBackgroundAsset,
} from "./types";

const ASSET_EXT_BY_MIME: Record<BackgroundAssetRecord["mimeType"], BackgroundAssetRecord["fileExtension"]> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function nowIso(): string {
  return new Date().toISOString();
}

function createAssetId(): string {
  return `asset-${Math.random().toString(36).slice(2, 12)}`;
}

function sharePath(slug: string): string {
  return `kandi-share/shares/${slug}.json`;
}

function assetMetaPath(assetId: string): string {
  return `kandi-share/assets/meta/${assetId}.json`;
}

function assetDataPath(assetId: string, extension: BackgroundAssetRecord["fileExtension"]): string {
  return `kandi-share/assets/data/${assetId}.${extension}`;
}

async function findBlobByPathname(pathname: string, token: string): Promise<{ url: string } | null> {
  const response = await list({
    token,
    prefix: pathname,
    limit: 1000,
  });
  const exact = response.blobs.find((blob) => blob.pathname === pathname);
  return exact ? { url: exact.url } : null;
}

async function getJsonByPathname<T>(pathname: string, token: string): Promise<T | null> {
  const found = await findBlobByPathname(pathname, token);
  if (!found) {
    return null;
  }
  const response = await fetch(found.url, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export class VercelBlobShareRepository implements ShareRepository {
  constructor(private readonly token: string) {}

  async publishShare(input: SharePublishInput): Promise<PostcardShareRecord> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const slug = createShareSlug();
      const record: PostcardShareRecord = {
        slug,
        design: input.design,
        title: input.title,
        message: input.message,
        backgroundAssetId: input.backgroundAssetId,
        createdAt: nowIso(),
      };
      try {
        await put(sharePath(slug), JSON.stringify(record), {
          token: this.token,
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: "application/json",
        });
        return record;
      } catch (error) {
        // Slug collision is rare; retry with a new slug. For any other blob write issue, fail fast.
        if (
          error instanceof Error &&
          (error.message.toLowerCase().includes("already exists") ||
            error.message.toLowerCase().includes("overwrite"))
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new Error("Unable to allocate share slug. Please try again.");
  }

  async getShare(slug: string): Promise<PostcardShareRecord | null> {
    return getJsonByPathname<PostcardShareRecord>(sharePath(slug), this.token);
  }

  async saveBackgroundAsset(input: {
    bytes: Uint8Array;
    mimeType: BackgroundAssetRecord["mimeType"];
  }): Promise<BackgroundAssetRecord> {
    const fileExtension = ASSET_EXT_BY_MIME[input.mimeType];
    const assetId = createAssetId();
    const dataBlob = await put(assetDataPath(assetId, fileExtension), Buffer.from(input.bytes), {
      token: this.token,
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: input.mimeType,
    });
    const record: BackgroundAssetRecord = {
      assetId,
      mimeType: input.mimeType,
      fileExtension,
      byteSize: input.bytes.byteLength,
      createdAt: nowIso(),
      blobUrl: dataBlob.url,
    };
    await put(assetMetaPath(assetId), JSON.stringify(record), {
      token: this.token,
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
    });

    return record;
  }

  async getBackgroundAsset(assetId: string): Promise<StoredBackgroundAsset | null> {
    const record = await this.getBackgroundAssetRecord(assetId);
    if (!record) {
      return null;
    }
    const blob = await findBlobByPathname(assetDataPath(assetId, record.fileExtension), this.token);
    if (!blob) {
      return null;
    }
    const response = await fetch(blob.url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { record, bytes };
  }

  async getBackgroundAssetRecord(assetId: string): Promise<BackgroundAssetRecord | null> {
    return getJsonByPathname<BackgroundAssetRecord>(assetMetaPath(assetId), this.token);
  }
}
