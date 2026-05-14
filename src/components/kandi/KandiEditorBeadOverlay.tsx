"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { kandiElevatedSurfaceClassName } from "@/lib/kandi/constants";
import { kandiMotionTransition } from "@/lib/kandi/motion";

type KandiEditorBeadOverlayProps = {
  beadOverlayAnchor: { x: number; y: number } | null;
  canShowInsertControls: boolean;
  canShowDeleteControl: boolean;
  canShowBeadOverlayControls: boolean;
  onInsertBeforeSelectedBead: () => void;
  onInsertAfterSelectedBead: () => void;
  onRemoveSelectedBead: () => void;
  onCopyFocusedBeadStyle: () => void;
};

export function KandiEditorBeadOverlay({
  beadOverlayAnchor,
  canShowInsertControls,
  canShowDeleteControl,
  canShowBeadOverlayControls,
  onInsertBeforeSelectedBead,
  onInsertAfterSelectedBead,
  onRemoveSelectedBead,
  onCopyFocusedBeadStyle,
}: KandiEditorBeadOverlayProps) {
  return (
    <AnimatePresence>
      {(canShowInsertControls || canShowDeleteControl || canShowBeadOverlayControls) && beadOverlayAnchor ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={kandiMotionTransition.fast}
          className="pointer-events-none fixed z-[7]"
          style={{ left: beadOverlayAnchor.x, top: beadOverlayAnchor.y }}
        >
          <div className="relative">
            {canShowInsertControls ? <InsertAffordanceButton side="left" onClick={onInsertBeforeSelectedBead} /> : null}
            {canShowInsertControls ? <InsertAffordanceButton side="right" onClick={onInsertAfterSelectedBead} /> : null}
            {canShowDeleteControl ? <DeleteAffordanceButton onClick={onRemoveSelectedBead} /> : null}
            {canShowBeadOverlayControls ? <CopyStyleAffordanceButton onClick={onCopyFocusedBeadStyle} /> : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const InsertAffordanceButton = memo(function InsertAffordanceButton({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const x = side === "left" ? -34 : 34;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Insert bead before" : "Insert bead after"}
      className={`pointer-events-auto absolute flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-strong)] transition-colors duration-150 hover:bg-[var(--surface-2)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[color-mix(in oklab, var(--accent) 55%, transparent)] ${kandiElevatedSurfaceClassName}`}
      style={{ left: x, top: "50%", transform: "translate(-50%, -50%)" }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      <span className="icon-[material-symbols--add-rounded] inline-block shrink-0 text-[20px] leading-none" aria-hidden="true" />
    </button>
  );
});

const DeleteAffordanceButton = memo(function DeleteAffordanceButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Delete bead"
      className={`pointer-events-auto absolute flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-strong)] transition-colors duration-150 hover:bg-[var(--surface-2)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[color-mix(in oklab, var(--accent) 55%, transparent)] ${kandiElevatedSurfaceClassName}`}
      style={{ left: "50%", top: 34, transform: "translate(-50%, -50%)" }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      <span className="icon-[material-symbols--delete-rounded] inline-block shrink-0 text-[20px] leading-none" aria-hidden="true" />
    </button>
  );
});

const CopyStyleAffordanceButton = memo(function CopyStyleAffordanceButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Copy focused bead style"
      className={`pointer-events-auto absolute flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-strong)] transition-colors duration-150 hover:bg-[var(--surface-2)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[color-mix(in oklab, var(--accent) 55%, transparent)] ${kandiElevatedSurfaceClassName}`}
      style={{ left: "50%", top: -34, transform: "translate(-50%, -50%)" }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      <span className="icon-[material-symbols--content-copy-rounded] inline-block shrink-0 text-[18px] leading-none" aria-hidden="true" />
    </button>
  );
});
