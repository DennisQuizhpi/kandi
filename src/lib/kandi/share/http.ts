import { ShareValidationError } from "./validation";

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export function handleRouteError(error: unknown): Response {
  if (error instanceof ShareValidationError) {
    return jsonError(error.message, 400);
  }
  if (error instanceof Error) {
    return jsonError(error.message, 500);
  }
  return jsonError("Unexpected error", 500);
}
