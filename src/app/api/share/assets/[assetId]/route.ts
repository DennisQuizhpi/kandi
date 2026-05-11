import { getShareRepository } from "@/lib/kandi/share/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  const params = await context.params;
  const asset = await getShareRepository().getBackgroundAsset(params.assetId);

  if (!asset) {
    return Response.json({ error: "Asset not found." }, { status: 404 });
  }

  const payload = new Uint8Array(asset.bytes.byteLength);
  payload.set(asset.bytes);

  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": asset.record.mimeType,
      "Content-Length": String(asset.record.byteSize),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
