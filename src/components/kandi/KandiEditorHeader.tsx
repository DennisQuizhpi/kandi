"use client";

import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { MAX_BEAD_COUNT, kandiElevatedSurfaceClassName } from "@/lib/kandi/constants";
import { kandiMotionDuration, kandiMotionTransition } from "@/lib/kandi/motion";

import { KandiButton } from "./KandiButton";

type KandiEditorHeaderProps = {
  designName: string;
  beadCount: number;
  beadCounterToneClassName: string;
  canUndo: boolean;
  canRedo: boolean;
  prefersReducedMotion: boolean;
  onDesignNameChange: (name: string) => void;
  onResetDesign: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenShareDialog: () => void;
};

function ToolbarIconButton({
  label,
  disabled,
  children,
  className,
  ...props
}: ComponentProps<"button"> & { label: string }) {
  const extra = className ? ` ${className}` : "";
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-strong)] transition-colors duration-150 hover:bg-[var(--surface-1)] active:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:active:bg-transparent${extra}`}
      {...props}
    >
      {children}
    </button>
  );
}

function AnimatedCounterValue({
  value,
  className,
  prefersReducedMotion,
}: {
  value: number;
  className: string;
  prefersReducedMotion: boolean;
}) {
  if (prefersReducedMotion) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span className="relative inline-flex h-[1.2em] overflow-hidden align-baseline" aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className={className}
          initial={{ opacity: 0, y: 9 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function KandiEditorHeader({
  designName,
  beadCount,
  beadCounterToneClassName,
  canUndo,
  canRedo,
  prefersReducedMotion,
  onDesignNameChange,
  onResetDesign,
  onUndo,
  onRedo,
  onOpenShareDialog,
}: KandiEditorHeaderProps) {
  const designMenuRef = useRef<HTMLDivElement>(null);
  const [designMenuOpen, setDesignMenuOpen] = useState(false);
  const shortcutsPanelRef = useRef<HTMLDivElement>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    if (!designMenuOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!designMenuRef.current?.contains(event.target as Node)) {
        setDesignMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [designMenuOpen]);

  useEffect(() => {
    if (!shortcutsOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!shortcutsPanelRef.current?.contains(event.target as Node)) {
        setShortcutsOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [shortcutsOpen]);

  const shellEnterInitial = prefersReducedMotion ? undefined : { opacity: 0, y: -10 };
  const shellEnterAnimate = prefersReducedMotion ? undefined : { opacity: 1, y: 0 };

  return (
    <div className="pointer-events-none relative z-[3] min-h-screen">
      <motion.header
        className="pointer-events-auto absolute inset-x-0 top-0 z-20 px-6 pt-6 sm:px-8 sm:pt-8"
        initial={shellEnterInitial}
        animate={shellEnterAnimate}
        transition={prefersReducedMotion ? undefined : { duration: kandiMotionDuration.shell, ease: kandiMotionTransition.standard.ease, delay: 0.04 }}
      >
        <div className="relative flex w-full flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-10 min-w-0 items-center gap-1 rounded-lg border border-[var(--elevated-surface-border)] bg-[var(--field)] pr-2 pl-4 transition-colors hover:bg-[#f1f1f4]">
              <input
                className="h-10 min-w-[6rem] max-w-[14rem] shrink border-0 bg-transparent p-0 k-type-headline leading-tight text-[var(--text-muted)] outline-none placeholder:text-[var(--text-muted)] focus:text-[var(--text-strong)] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[color-mix(in oklab, var(--accent) 72%, transparent)] disabled:cursor-not-allowed disabled:text-[var(--text-muted)]/70"
                value={designName}
                onChange={(event) => onDesignNameChange(event.target.value)}
                aria-label="Design name"
              />
              <div ref={designMenuRef} className="relative shrink-0">
                <ToolbarIconButton
                  label="Design actions"
                  className={`${designMenuOpen ? "bg-[#ededed]" : ""} h-[30px] w-[30px] rounded-[6px]`}
                  aria-expanded={designMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setDesignMenuOpen((open) => !open)}
                >
                  <span
                    aria-hidden="true"
                    className="icon-[material-symbols--expand-more-rounded] inline-block shrink-0 text-[14px] leading-none"
                  />
                </ToolbarIconButton>
                <AnimatePresence initial={false}>
                  {designMenuOpen ? (
                    <motion.div
                      key="design-menu"
                      initial={{ opacity: 0, y: -6, filter: "blur(3px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
                      transition={kandiMotionTransition.fast}
                      style={{ transformOrigin: "top right" }}
                      role="menu"
                      aria-label="Design actions menu"
                      className={`absolute right-0 z-30 mt-1 min-w-[11rem] rounded-xl py-1 ${kandiElevatedSurfaceClassName}`}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full px-3 py-2 text-left k-type-body text-[var(--text-strong)] hover:bg-[var(--surface-1)]"
                        onClick={() => {
                          onResetDesign();
                          setDesignMenuOpen(false);
                        }}
                      >
                        New bracelet
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-0.5">
            <KandiButton
              variant="secondary"
              className="h-10 shrink-0 rounded-lg border border-[var(--border-soft)] bg-[#f4f4f4] px-3 py-2 k-type-title text-[var(--text-strong)] hover:bg-[#ededed]"
              aria-label="Reset design"
              onClick={onResetDesign}
            >
              Reset
            </KandiButton>
            <KandiButton
              variant="secondary"
              className="h-10 w-10 min-w-10 shrink-0 rounded-lg border border-[var(--border-soft)] bg-[#f4f4f4] px-0 py-0 text-[var(--text-strong)] hover:bg-[#ededed]"
              aria-label="Undo"
              disabled={!canUndo}
              onClick={onUndo}
            >
              <span className="icon-[material-symbols--undo-rounded] inline-block shrink-0 text-[24px] leading-none" aria-hidden="true" />
            </KandiButton>
            <KandiButton
              variant="secondary"
              className="h-10 w-10 min-w-10 shrink-0 rounded-lg border border-[var(--border-soft)] bg-[#f4f4f4] px-0 py-0 text-[var(--text-strong)] hover:bg-[#ededed]"
              aria-label="Redo"
              disabled={!canRedo}
              onClick={onRedo}
            >
              <span className="icon-[material-symbols--redo-rounded] inline-block shrink-0 text-[24px] leading-none" aria-hidden="true" />
            </KandiButton>
          </div>

          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.34, ease: kandiMotionTransition.standard.ease, delay: 0.1 }}
            className={`pointer-events-auto absolute left-1/2 top-1/2 hidden h-10 -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-[10px] px-3 sm:flex ${kandiElevatedSurfaceClassName} ${beadCounterToneClassName}`}
            aria-live="polite"
            role="status"
          >
            <span className="icon-[material-symbols--lens-blur] inline-block text-[15px] leading-none opacity-85" aria-hidden />
            <div className="flex items-baseline gap-1">
              <AnimatedCounterValue
                value={beadCount}
                className="k-type-title text-[var(--text-secondary)]"
                prefersReducedMotion={prefersReducedMotion}
              />
              <span className="k-type-meta opacity-75 text-[var(--text-secondary)]">/ {MAX_BEAD_COUNT}</span>
            </div>
          </motion.div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
            <div ref={shortcutsPanelRef} className="relative">
              <KandiButton
                variant="secondary"
                className={`h-10 w-10 min-w-10 shrink-0 rounded-lg border border-[var(--border-soft)] bg-[#f4f4f4] px-0 py-0 text-[var(--text-strong)] hover:bg-[#ededed]${shortcutsOpen ? " bg-[#ededed]" : ""}`}
                aria-label="Keyboard shortcuts"
                aria-haspopup="dialog"
                aria-expanded={shortcutsOpen}
                onClick={() => setShortcutsOpen((open) => !open)}
              >
                <span className="icon-[material-symbols--keyboard-rounded] inline-block shrink-0 text-[22px] leading-none" aria-hidden="true" />
              </KandiButton>
              <AnimatePresence initial={false}>
                {shortcutsOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -5, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -3, filter: "blur(2px)" }}
                    transition={kandiMotionTransition.fast}
                    className={`absolute right-0 z-30 mt-1 flex w-[min(92vw,400px)] flex-col gap-4 rounded-lg p-4 ${kandiElevatedSurfaceClassName}`}
                    role="dialog"
                    aria-label="Shortcuts panel"
                  >
                    <div className="flex h-6 items-center">
                      <p className="text-[16px] leading-6 font-semibold text-[#000000]">Shortcuts</p>
                    </div>
                    <div className="space-y-2">
                      <ShortcutRow keys="← → / A D" action="Previous / next bead" />
                      <ShortcutRow keys="↑ ↓ / W S" action="Tilt view up / down" />
                      <ShortcutRow keys="⇧ + ← → / A D" action="Extend range selection" />
                      <ShortcutRow keys="⌘/Ctrl + ← / →" action="Swap with previous / next bead" />
                      <ShortcutRow keys="⌘/Ctrl + C / V" action="Copy / paste bead" />
                      <ShortcutRow keys="Tab / ⇧ Tab" action="Next / previous bead" />
                      <ShortcutRow keys="⌘/Ctrl + D" action="Duplicate selected bead(s)" />
                      <ShortcutRow keys="Delete / Backspace" action="Delete selected bead(s)" />
                      <ShortcutRow keys="Shift + Click" action="Range select beads" />
                      <ShortcutRow keys="⌘/Ctrl + Click" action="Toggle bead in selection" />
                      <ShortcutRow keys="Esc" action="Exit multi-select layers" />
                      <ShortcutRow keys="⌘/Ctrl + Z / ⇧ Z / Y" action="Undo / Redo" />
                      <ShortcutRow keys="⌘/Ctrl + ⌥ + S / V" action="Copy / paste style" />
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <KandiButton
              variant="primary"
              className="h-10 shrink-0 rounded-lg px-3 py-2 k-type-title"
              onClick={onOpenShareDialog}
            >
              Share
            </KandiButton>
          </div>
        </div>
      </motion.header>
    </div>
  );
}

function ShortcutRow({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex h-6 items-center justify-between">
      <span className="text-[14px] leading-5 font-medium text-[#262626]">{action}</span>
      <span className="inline-flex h-6 items-center rounded-md bg-[var(--elevated-surface-border)] px-1.5 py-1 text-[12px] leading-4 font-semibold text-[var(--text-muted)]">
        {keys}
      </span>
    </div>
  );
}
