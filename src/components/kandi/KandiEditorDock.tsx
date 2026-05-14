"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { kandiElevatedSurfaceClassName } from "@/lib/kandi/constants";
import { kandiMotionDuration, kandiMotionTransition } from "@/lib/kandi/motion";
import type { Bead, EditPatch } from "@/lib/kandi/types";

import { KandiButton, KandiColorSwatchButton } from "./KandiButton";
import { KandiSingleBeadBar } from "./KandiSingleBeadBar";

type BeadEditMode = "text" | "color";

const SWATCH_CLASS_BY_COLOR: Record<string, string> = {
  "#ff5c8a": "bg-[#ff5c8a]",
  "#49d9ff": "bg-[#49d9ff]",
  "#ffd84d": "bg-[#ffd84d]",
  "#72ff7a": "bg-[#72ff7a]",
  "#c687ff": "bg-[#c687ff]",
  "#ffffff": "bg-[#ffffff]",
  "#ff934f": "bg-[#ff934f]",
  "#8fd3ff": "bg-[#8fd3ff]",
};

function normHexColor(c: string): string {
  return c.trim().toLowerCase();
}

function beadColorMatchesSwatch(beadColor: string, swatch: string): boolean {
  const a = normHexColor(beadColor);
  const b = normHexColor(swatch);
  if (a === b) {
    return true;
  }
  const expand = (h: string) =>
    /^#[0-9a-f]{3}$/.test(h)
      ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`
      : h;
  return expand(a) === expand(b);
}

type KandiEditorDockProps = {
  prefersReducedMotion: boolean;
  selectedCount: number;
  multiSelectedBarVisible: boolean;
  multiUniformColor: string | null;
  dockBead: Bead | null;
  beadEditMode: BeadEditMode;
  copiedStyleAvailable: boolean;
  canvasStageRef: RefObject<HTMLDivElement | null>;
  dockControlsRef: RefObject<HTMLDivElement | null>;
  setBeadEditMode: Dispatch<SetStateAction<BeadEditMode>>;
  onCollapseMultiSelectedBarToDockMode: () => void;
  onApplyMultiColor: (color: string) => void;
  onSelectAllBeads: () => void;
  onDuplicateMultiSelection: () => void;
  onApplyPatch: (patch: EditPatch) => void;
  onApplyCopiedStyleToSelection: () => void;
  onConfirmTextAndAdvance: (beadId: string, label: string) => void;
  onAdvanceToNextBeadFromDock: (beadId: string) => void;
  onDismissSelection: () => void;
};

export function KandiEditorDock({
  prefersReducedMotion,
  selectedCount,
  multiSelectedBarVisible,
  multiUniformColor,
  dockBead,
  beadEditMode,
  copiedStyleAvailable,
  canvasStageRef,
  dockControlsRef,
  setBeadEditMode,
  onCollapseMultiSelectedBarToDockMode,
  onApplyMultiColor,
  onSelectAllBeads,
  onDuplicateMultiSelection,
  onApplyPatch,
  onApplyCopiedStyleToSelection,
  onConfirmTextAndAdvance,
  onAdvanceToNextBeadFromDock,
  onDismissSelection,
}: KandiEditorDockProps) {
  const dockEnterInitial = prefersReducedMotion ? undefined : { opacity: 0, y: 14 };
  const dockEnterAnimate = prefersReducedMotion ? undefined : { opacity: 1, y: 0 };

  return (
    <motion.div
      className="fixed inset-x-0 bottom-4 z-[6] flex justify-center px-4 sm:bottom-6"
      initial={dockEnterInitial}
      animate={dockEnterAnimate}
      transition={prefersReducedMotion ? undefined : { duration: kandiMotionDuration.dock, ease: kandiMotionTransition.standard.ease, delay: 0.08 }}
    >
      <div ref={dockControlsRef} className="relative flex flex-col items-center gap-2">
        <AnimatePresence initial={false}>
          {selectedCount > 1 && multiSelectedBarVisible ? (
            <motion.div
              key="multi-selected-chip"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={kandiMotionTransition.standard}
              className="pointer-events-none absolute bottom-0 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center"
            >
              <div className="pointer-events-auto mb-2 flex w-[360px] max-w-[86vw] items-center justify-start gap-1.5">
                {Object.entries(SWATCH_CLASS_BY_COLOR).map(([color, swatchClassName]) => (
                  <KandiColorSwatchButton
                    key={`multi-${color}`}
                    swatchClassName={swatchClassName}
                    className="h-5 w-5 rounded-md"
                    selected={multiUniformColor ? beadColorMatchesSwatch(multiUniformColor, color) : false}
                    onClick={() => onApplyMultiColor(color)}
                    aria-label={`Set selected bead color ${color}`}
                  />
                ))}
                <input
                  type="color"
                  className="ml-1 h-7 w-10 cursor-pointer rounded-md border border-[var(--border-soft)] bg-transparent p-1"
                  value={multiUniformColor && /^#[0-9A-Fa-f]{6}$/.test(multiUniformColor) ? multiUniformColor : "#ffffff"}
                  onChange={(event) => onApplyMultiColor(event.currentTarget.value)}
                  aria-label="Custom color for selected beads"
                />
              </div>
              <div className={`pointer-events-auto flex h-12 w-[360px] max-w-[86vw] items-center gap-2 rounded-full px-4 py-1.5 ${kandiElevatedSurfaceClassName}`}>
                <p className="k-type-label tracking-[0.02em] text-[var(--text-muted)] opacity-70">
                  {selectedCount} selected
                </p>
                <button
                  type="button"
                  className="k-type-label tracking-[0.02em] text-[var(--text-muted)] underline-offset-2 transition-colors hover:text-[var(--text-strong)] hover:underline"
                  onClick={onSelectAllBeads}
                >
                  select all
                </button>
                <button
                  type="button"
                  className="ml-auto inline-flex h-7 items-center justify-center gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--surface-1)] px-2.5 k-type-label tracking-[0.01em] text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-2)]"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={onDuplicateMultiSelection}
                >
                  <span className="icon-[material-symbols--content-copy-rounded] inline-block text-[13px] leading-none" aria-hidden />
                  duplicate
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--accent)] px-2.5 k-type-label text-[var(--accent-ink)] transition-colors hover:bg-[color-mix(in_oklab,var(--accent)_78%,white)]"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={onCollapseMultiSelectedBarToDockMode}
                >
                  cancel
                </button>
              </div>
              <p className="mt-1 text-center k-type-label tracking-[0.02em] text-[var(--text-muted)] opacity-70">
                cancel with esc
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <motion.div
          animate={
            selectedCount > 1 && multiSelectedBarVisible
              ? { opacity: 0.5, y: 2, filter: "blur(2px)" }
              : { opacity: 1, y: 0, filter: "blur(0px)" }
          }
          transition={kandiMotionTransition.standard}
        >
          <KandiSingleBeadBar
            bead={dockBead}
            mode={beadEditMode}
            onModeChange={(nextMode) => {
              setBeadEditMode(nextMode);
              if (nextMode === "text") {
                onApplyPatch({ color: "#ffffff" });
                return;
              }
              onApplyPatch({ label: "" });
            }}
            onApplyPatch={onApplyPatch}
            onApplyCopiedStyle={onApplyCopiedStyleToSelection}
            copiedStyleAvailable={copiedStyleAvailable}
            onConfirmTextAndAdvance={onConfirmTextAndAdvance}
            onAdvanceToNextBeadFromDock={onAdvanceToNextBeadFromDock}
            onDismiss={onDismissSelection}
            dismissOnEscape={selectedCount <= 1}
            keepOpenOnPointerDownInsideRef={canvasStageRef}
            keepOpenOnPointerDownInsideExtraRef={dockControlsRef}
          />
        </motion.div>
        {selectedCount <= 1 && dockBead ? (
          <div
            role="group"
            aria-label="Bead editing mode"
            className="pointer-events-auto inline-flex h-[44px] items-center gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--surface-1)] p-[3px] shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
          >
            <KandiButton
              variant={beadEditMode === "text" ? "toggleOn" : "toggleOff"}
              aria-pressed={beadEditMode === "text"}
              aria-label="Text bead"
              title="Text bead"
              onClick={() => {
                setBeadEditMode("text");
                onApplyPatch({ color: "#ffffff" });
              }}
              className="!h-full !w-[38px] !min-h-0 !min-w-0 !rounded-full !border-transparent !px-0 !py-0"
            >
              <span className="icon-[material-symbols--text-fields-rounded] inline-block shrink-0 text-[20px] leading-none" aria-hidden />
            </KandiButton>
            <KandiButton
              variant={beadEditMode === "color" ? "toggleOn" : "toggleOff"}
              aria-pressed={beadEditMode === "color"}
              aria-label="Color bead"
              title="Color bead"
              onClick={() => {
                setBeadEditMode("color");
                onApplyPatch({ label: "" });
              }}
              className="!h-full !w-[38px] !min-h-0 !min-w-0 !rounded-full !border-transparent !px-0 !py-0"
            >
              <span className="icon-[material-symbols--palette] inline-block shrink-0 text-[16px] leading-none" aria-hidden />
            </KandiButton>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
