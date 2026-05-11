import { handleRouteError, jsonError } from "@/lib/kandi/share/http";
import { publishPostcardShare } from "@/lib/kandi/share/service";
import type { SharePublishInput } from "@/lib/kandi/share/types";
import { originFromRequest } from "@/lib/kandi/share/url";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Partial<SharePublishInput>;
    if (!body || typeof body !== "object") {
      return jsonError("Invalid request payload.");
    }

    const result = await publishPostcardShare(
      {
        design: body.design as SharePublishInput["design"],
        title: typeof body.title === "string" ? body.title : "",
        message: typeof body.message === "string" ? body.message : "",
        backgroundAssetId: typeof body.backgroundAssetId === "string" ? body.backgroundAssetId : undefined,
      },
      { origin: originFromRequest(request) },
    );

    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
