import type {
  BackgroundAssetRef,
  SharePublishInput,
  SharePublishResult,
  SharedPostcardRecord,
} from "./types";

const SHARE_REQUEST_TIMEOUT_MS = 15000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHARE_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }
  let message = "Request failed.";
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload.error) {
      message = payload.error;
    }
  } catch {
    // noop
  }
  throw new Error(message);
}

export async function publishShare(input: SharePublishInput): Promise<SharePublishResult> {
  const response = await fetchWithTimeout("/api/share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJsonOrThrow<SharePublishResult>(response);
}

export async function uploadShareBackground(file: File): Promise<BackgroundAssetRef> {
  const data = new FormData();
  data.set("file", file);

  const response = await fetchWithTimeout("/api/share/background", {
    method: "POST",
    body: data,
  });

  return parseJsonOrThrow<BackgroundAssetRef>(response);
}

export async function fetchSharedPostcard(slug: string): Promise<SharedPostcardRecord> {
  const response = await fetchWithTimeout(`/api/share/${slug}`);
  return parseJsonOrThrow<SharedPostcardRecord>(response);
}
