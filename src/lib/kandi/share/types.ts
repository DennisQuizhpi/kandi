import type { KandiDesign } from "@/lib/kandi/types";

export interface BackgroundAssetRecord {
  assetId: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  fileExtension: "png" | "jpg" | "webp";
  byteSize: number;
  createdAt: string;
  blobUrl?: string;
  width?: number;
  height?: number;
}

export interface PostcardShareRecord {
  slug: string;
  design: KandiDesign;
  title: string;
  message: string;
  backgroundAssetId?: string;
  createdAt: string;
}

export interface SharePublishInput {
  design: KandiDesign;
  title: string;
  message: string;
  backgroundAssetId?: string;
}

export interface SharePublishResult {
  slug: string;
  shareUrl: string;
  postcardUrl: string;
}

export interface BackgroundAssetRef {
  assetId: string;
  assetUrl: string;
}

export interface SharedPostcardRecord {
  slug: string;
  design: KandiDesign;
  title: string;
  message: string;
  backgroundImageUrl?: string;
  createdAt: string;
}

export interface StoredBackgroundAsset {
  record: BackgroundAssetRecord;
  bytes: Uint8Array;
}

export interface ShareRepository {
  publishShare(input: SharePublishInput): Promise<PostcardShareRecord>;
  getShare(slug: string): Promise<PostcardShareRecord | null>;
  saveBackgroundAsset(input: {
    bytes: Uint8Array;
    mimeType: BackgroundAssetRecord["mimeType"];
  }): Promise<BackgroundAssetRecord>;
  getBackgroundAsset(assetId: string): Promise<StoredBackgroundAsset | null>;
  getBackgroundAssetRecord(assetId: string): Promise<BackgroundAssetRecord | null>;
}
