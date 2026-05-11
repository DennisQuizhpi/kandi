"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { kandiButtonBaseClassName, KandiButton } from "@/components/kandi/KandiButton";
import { publishShare, uploadShareBackground } from "@/lib/kandi/share/client";
import { SHARE_MESSAGE_CHAR_LIMIT, SHARE_TITLE_CHAR_LIMIT } from "@/lib/kandi/share/validation";
import type { SharePublishResult } from "@/lib/kandi/share/types";
import type { KandiDesign } from "@/lib/kandi/types";

type BackgroundState = {
  assetId: string;
  assetUrl: string;
} | null;

export function KandiShareDialog({
  open,
  design,
  onClose,
}: {
  open: boolean;
  design: KandiDesign;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(design.name);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [background, setBackground] = useState<BackgroundState>(null);
  const [publishResult, setPublishResult] = useState<SharePublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onMouseDown = (event: MouseEvent) => {
      if (!shellRef.current) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!shellRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, onClose]);

  const shareDisabled = useMemo(
    () => publishing || uploading || title.trim().length === 0,
    [publishing, uploading, title],
  );

  const onPickBackground = () => {
    uploadInputRef.current?.click();
  };

  const onBackgroundSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const inputEl = event.currentTarget;
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    setUploading(true);
    setError(null);
    setCopied(false);
    try {
      const next = await uploadShareBackground(file);
      setBackground(next);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to upload image.");
    } finally {
      setUploading(false);
      inputEl.value = "";
    }
  };

  const onPublish = async () => {
    setPublishing(true);
    setError(null);
    setCopied(false);
    try {
      const result = await publishShare({
        design,
        title,
        message,
        backgroundAssetId: background?.assetId,
      });
      setPublishResult(result);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to publish share.");
    } finally {
      setPublishing(false);
    }
  };

  const onCopyLink = async () => {
    if (!publishResult) {
      return;
    }
    try {
      await navigator.clipboard.writeText(publishResult.shareUrl);
      setCopied(true);
    } catch {
      setError("Could not copy link in this browser.");
    }
  };

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#07090eb5] px-4 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            ref={shellRef}
            className="w-full max-w-[34rem] rounded-2xl border border-[#ffffff17] bg-[#151920e6] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-5"
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label="Share design"
            aria-modal="true"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[1.05rem] font-semibold tracking-[-0.02em] text-[#f0f3f9]">
                Share Design
              </h2>
              <KandiButton
                variant="secondary"
                className="h-8 rounded-md px-2 py-1 text-[0.72rem]"
                onClick={onClose}
                aria-label="Close share dialog"
              >
                Close
              </KandiButton>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[0.77rem] font-medium text-[#bfc8d8]">Title</span>
                <input
                  value={title}
                  maxLength={SHARE_TITLE_CHAR_LIMIT}
                  onChange={(event) => setTitle(event.currentTarget.value)}
                  className="w-full rounded-xl border border-[#ffffff1c] bg-[#20242da8] px-3 py-2.5 text-[0.9rem] text-[#eef2fa] outline-none focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[#5d77ff99]"
                  placeholder="Give this share a title"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[0.77rem] font-medium text-[#bfc8d8]">Message</span>
                <textarea
                  value={message}
                  maxLength={SHARE_MESSAGE_CHAR_LIMIT}
                  onChange={(event) => setMessage(event.currentTarget.value)}
                  className="min-h-[5.6rem] w-full resize-y rounded-xl border border-[#ffffff1c] bg-[#20242da8] px-3 py-2.5 text-[0.88rem] text-[#eef2fa] outline-none focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[#5d77ff99]"
                  placeholder="Optional note for this share"
                />
              </label>

              <div className="rounded-xl border border-[#ffffff14] bg-[#1a1e27bf] p-2.5">
                <p className="mb-2 text-[0.77rem] font-medium text-[#bfc8d8]">Background image (optional)</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={
                      kandiButtonBaseClassName +
                      " h-9 rounded-lg border-[#ffffff28] bg-[#202633bf] px-3 py-2 text-[0.75rem] text-[#e8edf7] hover:bg-[#263042]"
                    }
                    onClick={onPickBackground}
                    disabled={uploading || publishing}
                  >
                    {uploading ? "Uploading..." : "Upload Image"}
                  </button>
                  {background ? (
                    <a
                      href={background.assetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[0.73rem] text-[#9fb3ff] underline-offset-2 hover:underline"
                    >
                      Preview
                    </a>
                  ) : (
                    <span className="text-[0.73rem] text-[#95a0b4]">PNG, JPG, or WebP up to 5 MB</span>
                  )}
                </div>
                <input
                  ref={uploadInputRef}
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onBackgroundSelected}
                />
              </div>

              {error ? (
                <p role="alert" className="rounded-lg border border-[#ff8da040] bg-[#2d161d] px-2.5 py-2 text-[0.78rem] text-[#ffd6dd]">
                  {error}
                </p>
              ) : null}

              {publishResult ? (
                <div className="space-y-2 rounded-xl border border-[#6d88ff4a] bg-[#1a23418a] p-2.5">
                  <p className="text-[0.79rem] font-medium text-[#dbe5ff]">Published.</p>
                  <a
                    href={publishResult.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-[0.77rem] text-[#a5bcff] underline-offset-2 hover:underline"
                  >
                    {publishResult.shareUrl}
                  </a>
                  <div className="flex flex-wrap gap-2">
                    <KandiButton
                      variant="primary"
                      className="h-9 rounded-lg px-3 py-2 text-[0.74rem]"
                      onClick={onCopyLink}
                    >
                      {copied ? "Link Copied" : "Copy Link"}
                    </KandiButton>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <KandiButton variant="secondary" className="h-9 rounded-lg px-3 py-2 text-[0.74rem]" onClick={onClose}>
                Cancel
              </KandiButton>
              <KandiButton
                variant="primary"
                className="h-9 rounded-lg px-3 py-2 text-[0.74rem]"
                onClick={onPublish}
                disabled={shareDisabled}
              >
                {publishing ? "Publishing..." : "Publish Share"}
              </KandiButton>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
