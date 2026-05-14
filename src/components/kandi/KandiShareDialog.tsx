"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { KandiButton } from "@/components/kandi/KandiButton";
import { kandiElevatedSurfaceClassName } from "@/lib/kandi/constants";
import { kandiMotionDuration, kandiMotionTransition } from "@/lib/kandi/motion";
import { SHARE_MESSAGE_CHAR_LIMIT, SHARE_TITLE_CHAR_LIMIT } from "@/lib/kandi/share/validation";
import type { KandiDesign } from "@/lib/kandi/types";

export type ShareDialogSubmitPayload = {
  title: string;
  message: string;
};

export function KandiShareDialog({
  open,
  design,
  onClose,
  onSubmit,
}: {
  open: boolean;
  design: KandiDesign;
  onClose: () => void;
  onSubmit: (payload: ShareDialogSubmitPayload) => void;
}) {
  const [title, setTitle] = useState(design.name);
  const [message, setMessage] = useState("");
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(design.name);
    setMessage("");
  }, [open, design.id, design.name]);

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

  const shareDisabled = useMemo(() => title.trim().length === 0, [title]);

  const onPublish = () => {
    onSubmit({
      title,
      message,
    });
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[color-mix(in oklab, var(--surface-0) 42%, transparent)] px-4 py-6 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: kandiMotionDuration.fast }}
        >
          <motion.div
            ref={shellRef}
            className={`w-full max-w-[34rem] rounded-2xl p-4 sm:p-6 ${kandiElevatedSurfaceClassName}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={kandiMotionTransition.fast}
            role="dialog"
            aria-label="Share design"
            aria-modal="true"
          >
            <div className="mb-4 flex items-center justify-between pb-3">
              <h2 className="k-type-display text-[var(--text-strong)]">Share Design</h2>
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#f6f6f6] text-[var(--text-strong)] transition duration-150 hover:bg-[#ededed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in oklab, var(--accent) 72%, transparent)] disabled:cursor-not-allowed disabled:opacity-45"
                onClick={onClose}
                aria-label="Close share dialog"
              >
                <span
                  className="icon-[material-symbols--close-rounded] inline-block shrink-0 text-[16px] leading-none"
                  aria-hidden
                />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block k-type-label text-[var(--text-muted)]">Title</span>
                <input
                  value={title}
                  maxLength={SHARE_TITLE_CHAR_LIMIT}
                  onChange={(event) => setTitle(event.currentTarget.value)}
                  className="w-full rounded-xl border-0 bg-[var(--field)] px-3 py-2.5 k-type-body text-[var(--text-muted)] outline-none transition-colors placeholder:text-[var(--text-muted)] hover:bg-[#f1f1f4] focus:text-[var(--text-strong)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[color-mix(in oklab, var(--accent) 72%, transparent)] disabled:cursor-not-allowed disabled:text-[var(--text-muted)]/70"
                  placeholder="Give this share a title"
                  aria-label="Title"
                />
              </label>

              <label className="block">
                <span className="mb-2 block k-type-label text-[var(--text-muted)]">Message</span>
                <textarea
                  value={message}
                  maxLength={SHARE_MESSAGE_CHAR_LIMIT}
                  onChange={(event) => setMessage(event.currentTarget.value)}
                  className="min-h-[88px] w-full resize-y rounded-xl border-0 bg-[var(--field)] px-3 py-2 k-type-body text-[var(--text-muted)] outline-none transition-colors placeholder:text-[var(--text-muted)] hover:bg-[#f1f1f4] focus:text-[var(--text-strong)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[color-mix(in oklab, var(--accent) 72%, transparent)] disabled:cursor-not-allowed disabled:text-[var(--text-muted)]/70"
                  placeholder="Optional note for this share"
                  aria-label="Message"
                />
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-[var(--elevated-surface-border)] pt-4">
              <KandiButton variant="secondary" className="h-9 rounded-lg px-3 py-2 k-type-label" onClick={onClose}>
                Cancel
              </KandiButton>
              <KandiButton
                variant="primary"
                className="h-9 rounded-lg px-3 py-2 k-type-label"
                onClick={onPublish}
                disabled={shareDisabled}
              >
                Publish Share
              </KandiButton>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
