"use client";

import { motion } from "framer-motion";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import { BASE_COLORS, kandiElevatedSurfaceClassName, LABEL_CHAR_LIMIT } from "@/lib/kandi/constants";
import { kandiMotionTransition } from "@/lib/kandi/motion";
import type { Bead, EditPatch } from "@/lib/kandi/types";

import { KandiButton, KandiColorSwatchButton } from "./KandiButton";

const TEXT_BEAD_COLOR = "#ffffff";

/** Mirrors `inputClassName` in KandiEditor for matching field chrome on elevated panels. */
const beadBarFieldClassName =
  "min-h-10 min-w-0 flex-1 rounded-lg border-0 bg-[var(--field)] px-3 py-2 k-type-headline uppercase tracking-[0.08em] text-[var(--text-muted)] backdrop-blur-md outline-none transition-colors placeholder:text-[var(--text-muted)] hover:bg-[#f1f1f4] focus:text-[var(--text-strong)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[color-mix(in oklab, var(--accent) 72%, transparent)] disabled:cursor-not-allowed disabled:text-[var(--text-muted)]/70";

/** Accent ring + primary text while the letter field is in edit mode (ready for input), not only during `:focus`. */
const beadBarFieldReadyClassName =
  "text-[var(--text-strong)] !outline !outline-2 !outline-offset-1 !outline-[color-mix(in oklab, var(--accent) 72%, transparent)]";

const barShellClassName =
  `pointer-events-auto flex w-[304px] max-w-[304px] flex-col gap-3 rounded-xl px-4 py-3 transition-opacity duration-150 ${kandiElevatedSurfaceClassName}`;

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
  onAdvanceToNextBeadFromDock,
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
  onAdvanceToNextBeadFromDock: (beadId: string) => void;
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
    setTextEntryActive(mode === "text");
    // Intentionally bead.id / mode: avoid resetting drafts when this bead's label/color updates from edits.
  }, [bead?.id, mode]);

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
    if (!hasActiveBead || mode !== "color") {
      return;
    }
    const beadId = bead?.id;
    if (!beadId) {
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
      onAdvanceToNextBeadFromDock(beadId);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hasActiveBead, mode, bead?.id, onAdvanceToNextBeadFromDock]);

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
  };

  return (
    <div role="region" aria-label="Edit selected bead">
      <motion.div
        ref={shellRef}
        layout
        transition={{ layout: kandiMotionTransition.standard }}
        className={hasActiveBead ? barShellClassName : barShellClassName.replace("pointer-events-auto", "pointer-events-none")}
      >
        {!hasActiveBead ? (
          <div
            role="status"
            aria-live="polite"
            className="-mx-2 -my-2 flex min-h-[38px] items-center justify-center text-center k-type-body tracking-[0.02em] text-[var(--text-muted)]"
       
          >
            Let's get creating...
          </div>
        ) : (
          <>
            <div className="flex min-h-8 min-w-0 items-center gap-2 justify-between border-b border-[var(--border-soft)] pb-2">
              <span className="flex h-8 min-w-0 flex-1 items-center">
                <span className="truncate k-type-title tracking-[0.02em] text-[var(--text-strong)]">
                  {mode === "text" ? "Letter (white bead)" : "Color"}
                </span>
              </span>
              <KandiButton
                variant="secondary"
                className="h-8 shrink-0 rounded-md border border-[var(--border-soft)] px-2.5 py-0 k-type-title leading-none text-[var(--text-strong)] hover:border-[var(--border-strong)] disabled:border-[var(--border-soft)] disabled:text-[var(--text-muted)]"
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
                  className={`${beadBarFieldClassName}${textEntryActive ? ` ${beadBarFieldReadyClassName}` : ""}`}
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
                    className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-[var(--border-soft)] bg-[var(--field)] p-1 backdrop-blur-md outline-none focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[color-mix(in oklab, var(--accent) 72%, transparent)]"
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
              <p className="m-0 pt-0.5 k-type-meta leading-[1.45] text-[var(--text-muted)]">
                Text beads render with black lettering on the strand. Press{" "}
                <kbd className="rounded border border-[var(--border-soft)] bg-[var(--surface-2)] px-1 py-px font-mono k-type-meta text-[var(--text-strong)]">
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
