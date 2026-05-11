import { getShareRepository, toBackgroundAssetRef } from "@/lib/kandi/share/service";
import { handleRouteError, jsonError } from "@/lib/kandi/share/http";
import { originFromRequest } from "@/lib/kandi/share/url";
import { validateUploadMimeType, validateUploadSize } from "@/lib/kandi/share/validation";

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const candidate = formData.get("file");
    if (
      !candidate ||
      typeof candidate !== "object" ||
      !("arrayBuffer" in candidate) ||
      !("type" in candidate) ||
      !("size" in candidate)
    ) {
      return jsonError("Missing image file.");
    }
    const file = candidate as File;

    validateUploadMimeType(file.type);
    validateUploadSize(file.size);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const repository = getShareRepository();
    const record = await repository.saveBackgroundAsset({
      bytes,
      mimeType: file.type,
    });

    return Response.json(toBackgroundAssetRef(record.assetId, originFromRequest(request)), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
