"use client";

import { motion } from "framer-motion";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import { BASE_COLORS, LABEL_CHAR_LIMIT } from "@/lib/kandi/constants";
import type { Bead, EditPatch } from "@/lib/kandi/types";

import { KandiButton, KandiColorSwatchButton } from "./KandiButton";

const TEXT_BEAD_COLOR = "#ffffff";

/** Mirrors `inputClassName` in KandiEditor for the same chrome on dark panels. */
const beadBarFieldClassName =
  "min-h-10 min-w-0 flex-1 rounded-[0.58rem] border border-[#ffffff1c] bg-[#20232996] px-3 py-2.5 font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[1rem] font-semibold uppercase tracking-[0.08em] text-[#eceff5] backdrop-blur-md outline-none placeholder:text-[#6b7380] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[#5d77ff99]";

const barShellClassName =
  "pointer-events-auto flex w-[300px] max-w-[300px] flex-col gap-3 rounded-[0.92rem] border border-[#ffffff14] bg-[#1a1c21bd] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-opacity duration-150";

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

/** Compare bead color to a preset swatch (#rgb / #rrggbb). */
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

function isTextInputFocused(): boolean {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) {
    return false;
  }
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  return el.isContentEditable;
}

type BeadEditMode = "text" | "color";

export function KandiSingleBeadBar({
  bead,
  mode,
  onModeChange,
  onApplyPatch,
  onApplyCopiedStyle,
  copiedStyleAvailable = false,
  onConfirmTextAndAdvance,
  onDismiss,
  dismissOnEscape = true,
  keepOpenOnPointerDownInsideRef,
  keepOpenOnPointerDownInsideExtraRef,
}: {
  bead: Bead | null;
  mode: BeadEditMode;
  onModeChange: (mode: BeadEditMode) => void;
  onApplyPatch: (patch: EditPatch) => void;
  onApplyCopiedStyle?: () => void;
  copiedStyleAvailable?: boolean;
  onConfirmTextAndAdvance: (beadId: string, label: string) => void;
  onDismiss: () => void;
  dismissOnEscape?: boolean;
  /** Clicks here (e.g. 3D canvas) must not dismiss — bead selection runs on `click` after `mousedown`. */
  keepOpenOnPointerDownInsideRef?: RefObject<HTMLElement | null>;
  /** Optional second subtree treated as "inside" for outside-click dismissal logic. */
  keepOpenOnPointerDownInsideExtraRef?: RefObject<HTMLElement | null>;
}) {
  const hasActiveBead = bead != null;
  const [labelDraft, setLabelDraft] = useState(() => bead?.label ?? "");
  const [textEntryActive, setTextEntryActive] = useState(false);
  const textInputRef = useRef<HTMLInputElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const whitenedForTextRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bead) {
      setTextEntryActive(false);
      return;
    }
    whitenedForTextRef.current = null;
    setLabelDraft(bead.label ?? "");
    setTextEntryActive(false);
    // Intentionally bead.id only: avoid resetting drafts when this bead's label/color updates from edits.
  }, [bead?.id]);

  useEffect(() => {
    if (!hasActiveBead || mode !== "text" || !textEntryActive) {
      return;
    }
    const id = requestAnimationFrame(() => {
      textInputRef.current?.focus();
      textInputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [hasActiveBead, mode, bead?.id, textEntryActive]);

  useEffect(() => {
    if (!hasActiveBead || mode !== "text" || textEntryActive) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }
      if (isTextInputFocused()) {
        return;
      }
      event.preventDefault();
      setTextEntryActive(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hasActiveBead, mode, textEntryActive]);

  useEffect(() => {
    if (!bead) {
      return;
    }
    if (mode !== "text") {
      return;
    }
    if (normHexColor(bead.color) === normHexColor(TEXT_BEAD_COLOR)) {
      return;
    }
    if (whitenedForTextRef.current === bead.id) {
      return;
    }
    whitenedForTextRef.current = bead.id;
    onApplyPatch({ color: TEXT_BEAD_COLOR });
  }, [mode, bead?.id, bead?.color, onApplyPatch, bead]);

  useEffect(() => {
    if (!hasActiveBead) {
      return;
    }
    const onDocMouseDown = (event: MouseEvent) => {
      const el = shellRef.current;
      const t = event.target;
      if (!(t instanceof Node)) {
        return;
      }
      if (el?.contains(t)) {
        return;
      }
      const ignoreRoot = keepOpenOnPointerDownInsideRef?.current;
      if (ignoreRoot?.contains(t)) {
        return;
      }
      const ignoreRootExtra = keepOpenOnPointerDownInsideExtraRef?.current;
      if (ignoreRootExtra?.contains(t)) {
        return;
      }
      onDismiss();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [hasActiveBead, onDismiss, keepOpenOnPointerDownInsideRef, keepOpenOnPointerDownInsideExtraRef]);

  useEffect(() => {
    if (!hasActiveBead || !dismissOnEscape) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismissOnEscape, hasActiveBead, onDismiss]);

  const commitText = () => {
    if (!bead) {
      return;
    }
    const label = labelDraft.trim().toUpperCase();
    setLabelDraft(label);
    onConfirmTextAndAdvance(bead.id, label);
    setTextEntryActive(false);
  };

  return (
    <div role="region" aria-label="Edit selected bead">
      <motion.div
        ref={shellRef}
        layout
        transition={{ layout: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
        className={hasActiveBead ? barShellClassName : barShellClassName.replace("pointer-events-auto", "pointer-events-none")}
      >
        {!hasActiveBead ? (
          <div
            role="status"
            aria-live="polite"
            className="-mx-2 -my-2 flex min-h-[38px] items-center justify-center text-center font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[0.8rem] font-medium tracking-[0.02em] text-[#a8b0bf]"
          >
            Select a bead to edit its style.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-[#ffffff0d] pb-2">
              <span className="truncate font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[0.8rem] font-medium tracking-[0.02em] text-[#cdd3df]">
                {mode === "text" ? "Letter (white bead)" : "Color"}
              </span>
              <KandiButton
                variant="secondary"
                className="h-7 rounded-md border border-[#ffffff18] px-2 py-0 text-[0.66rem] font-medium tracking-[0.01em] text-[#c8d0de] hover:border-[#ffffff30] disabled:border-[#ffffff14] disabled:text-[#8f97a6]"
                disabled={!copiedStyleAvailable}
                onClick={() => onApplyCopiedStyle?.()}
              >
                Apply copied style
              </KandiButton>
            </div>

            <div className="min-h-0">
            <div className="flex flex-wrap items-stretch gap-2.5 pt-1 sm:flex-nowrap sm:items-center">
              {mode === "text" ? (
                <input
                  ref={textInputRef}
                  className={beadBarFieldClassName}
                  placeholder="A–Z or 0–9"
                  value={labelDraft}
                  maxLength={LABEL_CHAR_LIMIT}
                  readOnly={!textEntryActive}
                  onClick={() => {
                    if (!textEntryActive) {
                      setTextEntryActive(true);
                    }
                  }}
                  onFocus={() => {
                    if (!textEntryActive) {
                      setTextEntryActive(true);
                    }
                  }}
                  onChange={(event) => setLabelDraft(event.target.value.toUpperCase())}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (!textEntryActive) {
                        setTextEntryActive(true);
                        return;
                      }
                      commitText();
                    }
                  }}
                  aria-label="Bead letter"
                />
              ) : (
                <div className="flex min-h-10 min-w-0 flex-1 flex-wrap items-center gap-2">
                  <div className="grid grid-cols-4 gap-2 overflow-visible p-0.5 sm:flex sm:flex-1 sm:flex-wrap">
                    {BASE_COLORS.map((color) => (
                      <KandiColorSwatchButton
                        key={color}
                        swatchClassName={SWATCH_CLASS_BY_COLOR[color] ?? "bg-white"}
                        selected={beadColorMatchesSwatch(bead.color, color)}
                        className="!h-9 !w-9 !max-w-none min-h-9 min-w-9 shrink-0"
                        onClick={() => onApplyPatch({ color })}
                        aria-label={`Set bead color ${color}`}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    className="h-10 w-[3.65rem] shrink-0 cursor-pointer rounded-[0.5rem] border border-[#ffffff1c] bg-[#25283096] p-1 backdrop-blur-md outline-none focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[#5d77ff99]"
                    value={/^#[0-9A-Fa-f]{6}$/.test(bead.color.trim()) ? bead.color.trim() : "#ffffff"}
                    onChange={(event) => onApplyPatch({ color: event.target.value })}
                    aria-label="Custom bead color"
                  />
                </div>
              )}

              {mode === "text" && (
                <KandiButton variant="primary" className="h-10 shrink-0 !px-5 !py-2" onClick={commitText}>
                  Confirm
                </KandiButton>
              )}
            </div>

            {mode === "text" && (
              <p className="m-0 pt-0.5 font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[0.72rem] font-medium leading-[1.45] text-[#9ea5b3]">
                Text beads render white on the strand. Press{" "}
                <kbd className="rounded border border-[#ffffff24] bg-[#13151a] px-1 py-px font-mono text-[0.68rem] text-[#d8dde9]">
                  Enter
                </kbd>{" "}
                to edit, then Enter again to confirm and move to the next bead.
              </p>
            )}
        </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
