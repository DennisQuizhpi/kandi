"use client";

import { useState } from "react";

import { kandiButtonBaseClassName, KandiButton } from "@/components/kandi/KandiButton";

export function KandiPublicShareActions({
  shareUrl,
  remixUrl,
  postcardUrl,
}: {
  shareUrl: string;
  remixUrl: string;
  postcardUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <KandiButton variant="primary" className="h-9 rounded-lg px-3 py-2 text-[0.74rem]" onClick={onCopy}>
        {copied ? "Link Copied" : "Copy Link"}
      </KandiButton>
      <a
        href={postcardUrl}
        target="_blank"
        rel="noreferrer"
        className={
          kandiButtonBaseClassName +
          " h-9 rounded-lg border-[#ffffff24] bg-[#202633bf] px-3 py-2 text-[0.74rem] text-[#e6ebf6]"
        }
      >
        Open PNG
      </a>
      <a
        href={remixUrl}
        className={
          kandiButtonBaseClassName +
          " h-9 rounded-lg border-[#ffffff24] bg-[#202633bf] px-3 py-2 text-[0.74rem] text-[#e6ebf6]"
        }
      >
        Remix In Editor
      </a>
    </div>
  );
}
