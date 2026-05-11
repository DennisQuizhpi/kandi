import { createPostcardImage } from "@/lib/kandi/share/postcardImage";
import { getSharedPostcard } from "@/lib/kandi/share/service";
import { originFromRequest } from "@/lib/kandi/share/url";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const params = await context.params;
  const shared = await getSharedPostcard(params.slug, { origin: originFromRequest(request) });

  if (!shared) {
    return Response.json({ error: "Share not found." }, { status: 404 });
  }

  return createPostcardImage(shared);
}
