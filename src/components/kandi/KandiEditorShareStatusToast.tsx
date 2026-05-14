"use client";

import { AnimatePresence, motion } from "framer-motion";

import { kandiElevatedSurfaceClassName } from "@/lib/kandi/constants";
import { kandiMotionTransition } from "@/lib/kandi/motion";

import { KandiButton } from "./KandiButton";

export type SharePublishState = {
  status: "publishing" | "published" | "error";
  shareUrl?: string;
  message: string;
};

type KandiEditorShareStatusToastProps = {
  sharePublishState: SharePublishState | null;
  onCopyPublishedShareLink: () => void;
  onCloseSharePublishState: () => void;
};

export function KandiEditorShareStatusToast({
  sharePublishState,
  onCopyPublishedShareLink,
  onCloseSharePublishState,
}: KandiEditorShareStatusToastProps) {
  return (
    <AnimatePresence initial={false}>
      {sharePublishState ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={kandiMotionTransition.standard}
          className={`fixed left-1/2 top-5 z-[50] flex h-12 w-[min(92vw,32rem)] -translate-x-1/2 items-center gap-2 rounded-xl px-3 ${kandiElevatedSurfaceClassName}`}
          role="status"
          aria-live="polite"
        >
          {sharePublishState.status === "publishing" ? (
            <span className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[color-mix(in oklab, var(--accent) 42%, transparent)] border-t-[color-mix(in oklab, var(--accent) 62%, white)]" aria-hidden />
          ) : sharePublishState.status === "published" ? (
            <span className="icon-[material-symbols--check-rounded] inline-block shrink-0 text-[18px] text-[var(--success)]" aria-hidden />
          ) : (
            <span className="icon-[material-symbols--close-rounded] inline-block shrink-0 text-[18px] text-[var(--danger-text)]" aria-hidden />
          )}
          <p className="min-w-0 flex-1 truncate k-type-title text-[var(--text-strong)]">{sharePublishState.message}</p>
          <div className="flex shrink-0 items-center gap-0">
            {sharePublishState.status === "published" && sharePublishState.shareUrl ? (
              <KandiButton
                variant="secondary"
                className="h-8 rounded-md px-2.5 py-1 k-type-meta"
                onClick={onCopyPublishedShareLink}
                aria-label="Copy share link"
                title="Copy link"
              >
                <span className="icon-[material-symbols--content-copy-rounded] inline-block text-[14px] leading-none" aria-hidden />
                Copy link
              </KandiButton>
            ) : null}
            <span className="mx-1 h-4 w-px bg-[var(--elevated-surface-border)] inline-block align-middle" aria-hidden="true" />
            <KandiButton
              variant="secondary"
              className="h-8 w-8 min-w-8 rounded-md px-0 py-0 !gap-0"
              onClick={onCloseSharePublishState}
              aria-label="Close status"
              title="Close"
            >
              <span className="icon-[material-symbols--close-rounded] inline-block shrink-0 text-[14px] leading-none" aria-hidden />
            </KandiButton>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
