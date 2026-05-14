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
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      <KandiButton
        variant="primary"
        className="h-10 rounded-lg px-4 py-2 k-type-label"
        onClick={onCopy}
      >
        <span
          className={`inline-block shrink-0 text-[16px] leading-none ${
            copied
              ? "icon-[material-symbols--check-circle-outline-rounded]"
              : "icon-[material-symbols--content-copy-outline-rounded]"
          }`}
          aria-hidden
        />
        {copied ? "Link copied" : "Copy link"}
      </KandiButton>
      <a
        href={remixUrl}
        className={
          kandiButtonBaseClassName +
          " h-10 rounded-lg border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 k-type-label text-[var(--text-strong)]"
        }
      >
        <span className="icon-[material-symbols--auto-awesome-outline-rounded] inline-block shrink-0 text-[16px] leading-none" aria-hidden />
        Remix this design
      </a>
    </div>
  );
}
