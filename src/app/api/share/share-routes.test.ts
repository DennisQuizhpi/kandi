import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDefaultDesign } from "@/lib/kandi/store";
import { resetShareRepositoryForTests } from "@/lib/kandi/share/service";

import { GET as getAssetRoute } from "./assets/[assetId]/route";
import { POST as postBackgroundRoute } from "./background/route";
import { GET as getShareRoute } from "./[slug]/route";
import { POST as postShareRoute } from "./route";

describe("share api routes", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "kandi-share-api-test-"));
    process.env.KANDI_SHARE_DATA_DIR = tempDir;
    resetShareRepositoryForTests();
  });

  afterEach(async () => {
    resetShareRepositoryForTests();
    delete process.env.KANDI_SHARE_DATA_DIR;
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects invalid publish payload", async () => {
    const request = new Request("http://localhost:3000/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nope: true }),
    });
    const response = await postShareRoute(request);
    expect(response.status).toBe(400);
  });

  it("rejects unsupported background upload type", async () => {
    const form = new FormData();
    form.set("file", new File(["hello"], "note.txt", { type: "text/plain" }));
    const request = new Request("http://localhost:3000/api/share/background", {
      method: "POST",
      body: form,
    });
    const response = await postBackgroundRoute(request);
    expect(response.status).toBe(400);
  });

  it("publishes and reads postcard data and assets", async () => {
    const uploadForm = new FormData();
    uploadForm.set("file", new Blob([new Uint8Array([7, 8, 9])], { type: "image/png" }), "bg.png");
    const uploadRequest = new Request("http://localhost:3000/api/share/background", {
      method: "POST",
      body: uploadForm,
    });
    const uploadResponse = await postBackgroundRoute(uploadRequest);
    expect(uploadResponse.status).toBe(201);
    const uploaded = (await uploadResponse.json()) as { assetId: string; assetUrl: string };

    const publishRequest = new Request("http://localhost:3000/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        design: createDefaultDesign(12),
        title: "Test Share",
        message: "Hello",
        backgroundAssetId: uploaded.assetId,
      }),
    });
    const publishResponse = await postShareRoute(publishRequest);
    expect(publishResponse.status).toBe(201);
    const publishPayload = (await publishResponse.json()) as { slug: string };

    const shareResponse = await getShareRoute(
      new Request(`http://localhost:3000/api/share/${publishPayload.slug}`),
      {
        params: Promise.resolve({ slug: publishPayload.slug }),
      },
    );
    expect(shareResponse.status).toBe(200);
    const sharePayload = (await shareResponse.json()) as { title: string; backgroundImageUrl?: string };
    expect(sharePayload.title).toBe("Test Share");
    expect(sharePayload.backgroundImageUrl).toContain(uploaded.assetId);

    const assetResponse = await getAssetRoute(
      new Request(`http://localhost:3000/api/share/assets/${uploaded.assetId}`),
      {
        params: Promise.resolve({ assetId: uploaded.assetId }),
      },
    );
    expect(assetResponse.status).toBe(200);
    expect(assetResponse.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await assetResponse.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(0);
  });
});
