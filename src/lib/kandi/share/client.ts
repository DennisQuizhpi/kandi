import type {
  BackgroundAssetRef,
  SharePublishInput,
  SharePublishResult,
  SharedPostcardRecord,
} from "./types";

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
  const response = await fetch("/api/share", {
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

  const response = await fetch("/api/share/background", {
    method: "POST",
    body: data,
  });

  return parseJsonOrThrow<BackgroundAssetRef>(response);
}

export async function fetchSharedPostcard(slug: string): Promise<SharedPostcardRecord> {
  const response = await fetch(`/api/share/${slug}`);
  return parseJsonOrThrow<SharedPostcardRecord>(response);
}
