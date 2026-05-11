"use client";

import { useState } from "react";

import { kandiButtonBaseClassName, KandiButton } from "@/components/kandi/KandiButton";

export function KandiPublicShareActions({
  shareUrl,
  remixUrl,
}: {
  shareUrl: string;
  remixUrl: string;
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
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <KandiButton variant="primary" className="h-10 rounded-lg px-4 py-2 text-[0.78rem]" onClick={onCopy}>
        {copied ? "Link Copied" : "Copy Link"}
      </KandiButton>
      <a
        href={remixUrl}
        className={
          kandiButtonBaseClassName +
          " h-10 rounded-lg border-[#ffffff24] bg-[#202633bf] px-4 py-2 text-[0.78rem] text-[#e6ebf6]"
        }
      >
        Remix In Editor
      </a>
    </div>
  );
}
