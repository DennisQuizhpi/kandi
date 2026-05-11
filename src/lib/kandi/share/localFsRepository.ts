import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

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

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${Math.random().toString(36).slice(2, 10)}.tmp`;
  await writeFile(tmpPath, JSON.stringify(value, null, 2), "utf8");
  await rename(tmpPath, filePath);
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export class LocalFsShareRepository implements ShareRepository {
  private readonly sharesDir: string;
  private readonly assetsDir: string;

  constructor(private readonly dataRoot: string) {
    this.sharesDir = path.join(dataRoot, "shares");
    this.assetsDir = path.join(dataRoot, "assets");
  }

  private sharePath(slug: string): string {
    return path.join(this.sharesDir, `${slug}.json`);
  }

  private assetMetaPath(assetId: string): string {
    return path.join(this.assetsDir, `${assetId}.json`);
  }

  private assetDataPath(assetId: string, fileExtension: BackgroundAssetRecord["fileExtension"]): string {
    return path.join(this.assetsDir, `${assetId}.${fileExtension}`);
  }

  async publishShare(input: SharePublishInput): Promise<PostcardShareRecord> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const slug = createShareSlug();
      const existing = await this.getShare(slug);
      if (existing) {
        continue;
      }
      const record: PostcardShareRecord = {
        slug,
        design: input.design,
        title: input.title,
        message: input.message,
        backgroundAssetId: input.backgroundAssetId,
        createdAt: nowIso(),
      };
      await writeJsonAtomic(this.sharePath(slug), record);
      return record;
    }

    throw new Error("Unable to allocate share slug. Please try again.");
  }

  async getShare(slug: string): Promise<PostcardShareRecord | null> {
    return readJsonFile<PostcardShareRecord>(this.sharePath(slug));
  }

  async saveBackgroundAsset(input: {
    bytes: Uint8Array;
    mimeType: BackgroundAssetRecord["mimeType"];
  }): Promise<BackgroundAssetRecord> {
    const fileExtension = ASSET_EXT_BY_MIME[input.mimeType];
    const assetId = createAssetId();
    const createdAt = nowIso();
    const record: BackgroundAssetRecord = {
      assetId,
      mimeType: input.mimeType,
      fileExtension,
      byteSize: input.bytes.byteLength,
      createdAt,
    };

    await mkdir(this.assetsDir, { recursive: true });
    await writeFile(this.assetDataPath(assetId, fileExtension), input.bytes);
    await writeJsonAtomic(this.assetMetaPath(assetId), record);
    return record;
  }

  async getBackgroundAsset(assetId: string): Promise<StoredBackgroundAsset | null> {
    const record = await this.getBackgroundAssetRecord(assetId);
    if (!record) {
      return null;
    }
    try {
      const bytes = await readFile(this.assetDataPath(assetId, record.fileExtension));
      return { record, bytes };
    } catch {
      return null;
    }
  }

  async getBackgroundAssetRecord(assetId: string): Promise<BackgroundAssetRecord | null> {
    return readJsonFile<BackgroundAssetRecord>(this.assetMetaPath(assetId));
  }
}

export function defaultShareDataRoot(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "kandi-share");
}
