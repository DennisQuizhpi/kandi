import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDefaultDesign } from "@/lib/kandi/store";

import { LocalFsShareRepository } from "./localFsRepository";

describe("LocalFsShareRepository", () => {
  let tempDir = "";
  let repository: LocalFsShareRepository;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "kandi-share-test-"));
    repository = new LocalFsShareRepository(tempDir);
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("publishes immutable snapshots with unique slugs", async () => {
    const design = createDefaultDesign(16);
    const first = await repository.publishShare({ design, title: "Hello", message: "" });
    const second = await repository.publishShare({ design, title: "Hello", message: "" });

    expect(first.slug).not.toBe(second.slug);
    expect(first.createdAt).not.toBe("");
    expect(second.createdAt).not.toBe("");
  });

  it("stores and serves background assets", async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const saved = await repository.saveBackgroundAsset({ bytes: data, mimeType: "image/png" });
    const loaded = await repository.getBackgroundAsset(saved.assetId);

    expect(loaded).not.toBeNull();
    expect(loaded?.record.mimeType).toBe("image/png");
    expect(Array.from(loaded?.bytes ?? [])).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns null for corrupt share files", async () => {
    const slug = "abcdefghjk";
    const sharePath = path.join(tempDir, "shares", `${slug}.json`);
    await mkdir(path.dirname(sharePath), { recursive: true });
    await writeFile(sharePath, "{broken");
    const loaded = await repository.getShare(slug);
    expect(loaded).toBeNull();
  });
});
