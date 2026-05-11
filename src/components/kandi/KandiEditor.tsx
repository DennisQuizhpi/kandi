"use client";

import type { ComponentProps } from "react";
import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { DEFAULT_BEAD_COUNT, MAX_BEAD_COUNT, MIN_BEAD_COUNT } from "@/lib/kandi/constants";
import { downloadDesignAsFile, loadDesign, saveDesign } from "@/lib/kandi/persistence";
import { fetchSharedPostcard } from "@/lib/kandi/share/client";
import { adjacentBeadId, rangeIdsBetween } from "@/lib/kandi/selection";
import { createDefaultDesign, createInitialState, kandiReducer } from "@/lib/kandi/store";
import { EditPatch } from "@/lib/kandi/types";

import { KandiButton, KandiColorSwatchButton } from "./KandiButton";
import {
  GUIDED_ELEVATION_DEFAULT_DEG,
  GUIDED_ELEVATION_MAX_DEG,
  GUIDED_ELEVATION_MIN_DEG,
  GUIDED_ELEVATION_STEP_DEG,
  KandiCanvas,
  type BeadClickEvent,
  type GuidedCameraPreset,
  type HoveredBeadMeta,
} from "./KandiCanvas";
import { KandiSingleBeadBar } from "./KandiSingleBeadBar";
import { KandiShareDialog } from "./KandiShareDialog";

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
      className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#d9dee8] transition-colors duration-150 hover:bg-[#ffffff08] active:bg-[#ffffff0d] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:active:bg-transparent${extra}`}
      {...props}
    >
      {children}
    </button>
  );
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

export function KandiEditor() {
  const [state, dispatch] = useReducer(kandiReducer, undefined, () => createInitialState());
  const [orbitResetToken] = useState(0);
  const [guidedPreset] = useState<GuidedCameraPreset>("bracelet");
  const guidedRotateTick = 0;
  const guidedRotateDeltaDeg = 0;
  const [guidedElevationDeg, setGuidedElevationDeg] = useState(GUIDED_ELEVATION_DEFAULT_DEG);
  const hasHydratedRef = useRef(false);
  const designMenuRef = useRef<HTMLDivElement>(null);
  const [designMenuOpen, setDesignMenuOpen] = useState(false);
  const shortcutsPanelRef = useRef<HTMLDivElement>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const canvasStageRef = useRef<HTMLDivElement>(null);
  const dockControlsRef = useRef<HTMLDivElement>(null);
  const [pendingFocusBeadId, setPendingFocusBeadId] = useState<string | null>(null);
  const [activeBeadMeta, setActiveBeadMeta] = useState<HoveredBeadMeta | null>(null);
  const beadSwitchAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevSelectedBeadIdRef = useRef<string | null>(null);
  const rangeSelectionAnchorIdRef = useRef<string | null>(null);
  const pendingFocusShouldReselectRef = useRef(true);
  const pendingInsertFocusRef = useRef(false);
  const pendingMultiDuplicateFocusRef = useRef(false);
  const [copiedStyle, setCopiedStyle] = useState<EditPatch | null>(null);
  const [multiSelectedBarVisible, setMultiSelectedBarVisible] = useState(true);
  const [beadEditMode, setBeadEditMode] = useState<"text" | "color">("color");
  const remixHydratedSlugRef = useRef<string | null>(null);
  const collapseMultiSelectedBarToDockMode = () => {
    setMultiSelectedBarVisible(false);
  };

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

  useEffect(() => {
    const existing = loadDesign();
    if (existing) {
      dispatch({ type: "hydrate", design: existing });
    }
    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const slug = new URLSearchParams(window.location.search).get("remix");
    if (!slug || remixHydratedSlugRef.current === slug) {
      return;
    }
    remixHydratedSlugRef.current = slug;

    let cancelled = false;
    const hydrateRemix = async () => {
      try {
        const shared = await fetchSharedPostcard(slug);
        if (cancelled) {
          return;
        }
        const now = new Date().toISOString();
        const remixed = {
          ...shared.design,
          id: `kandi-${Math.random().toString(36).slice(2, 9)}`,
          name: `Remix of ${shared.title}`.slice(0, 64),
          createdAt: now,
          updatedAt: now,
          beads: shared.design.beads.map((bead, index) => ({
            ...bead,
            index,
            id: `bead-${index}-${Math.random().toString(36).slice(2, 9)}`,
          })),
        };
        dispatch({ type: "hydrate", design: remixed });
        setPendingFocusBeadId(null);
        setActiveBeadMeta(null);
      } catch {
        // Keep the existing draft when remix hydration fails.
      }
    };
    void hydrateRemix();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hasHydratedRef.current === false) {
      return;
    }
    saveDesign(state.design);
  }, [state.design]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (state.selection.selectedIds.length > 1) {
          event.preventDefault();
          event.stopPropagation();
          if (multiSelectedBarVisible) {
            collapseMultiSelectedBarToDockMode();
            return;
          }
          setPendingFocusBeadId(null);
          setActiveBeadMeta(null);
          dispatch({ type: "clearSelection" });
        }
        return;
      }

      if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isTextInputFocused() || state.selection.selectedIds.length === 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        dispatch({
          type: "moveSelectionStep",
          ids: [...state.selection.selectedIds],
          direction: event.key === "ArrowLeft" ? "left" : "right",
        });
        setPendingFocusBeadId(state.selection.selectedIds[0] ?? null);
        return;
      }

      const isUndo = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "z";
      const isRedoViaShiftZ = isUndo && event.shiftKey;
      const isRedoViaY = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "y";
      const isDuplicate = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "d";
      const isCopyStyle = (event.metaKey || event.ctrlKey) && event.altKey && !event.shiftKey && event.key.toLowerCase() === "s";
      const isPasteStyle = (event.metaKey || event.ctrlKey) && event.altKey && !event.shiftKey && event.key.toLowerCase() === "v";
      const focusedId =
        state.selection.selectedIds.length === 1
          ? (state.design.beads.find((bead) => bead.id === state.selection.selectedIds[0])?.id ?? null)
          : null;

      if (isUndo || isRedoViaY) {
        if (isTextInputFocused()) {
          return;
        }
        event.preventDefault();
        if (isRedoViaShiftZ || isRedoViaY) {
          dispatch({ type: "redo" });
          return;
        }
        dispatch({ type: "undo" });
        return;
      }

      if (isDuplicate) {
        if (isTextInputFocused() || state.selection.selectedIds.length === 0 || state.design.beadCount >= MAX_BEAD_COUNT) {
          return;
        }
        event.preventDefault();
        if (state.selection.selectedIds.length > 1) {
          pendingMultiDuplicateFocusRef.current = true;
          dispatch({ type: "duplicateSelection", ids: [...state.selection.selectedIds] });
          return;
        }
        if (!focusedId) {
          return;
        }
        pendingInsertFocusRef.current = true;
        dispatch({ type: "duplicateBead", beadId: focusedId });
        return;
      }

      if (isCopyStyle) {
        if (!focusedId) {
          return;
        }
        const source = state.design.beads.find((bead) => bead.id === focusedId);
        if (!source) {
          return;
        }
        event.preventDefault();
        setCopiedStyle({
          color: source.color,
          label: source.label ?? "",
          shape: source.shape,
        });
        return;
      }

      if (isPasteStyle) {
        if (state.selection.selectedIds.length === 0 || !copiedStyle) {
          return;
        }
        event.preventDefault();
        dispatch({ type: "applyPatch", patch: copiedStyle });
        return;
      }

      if (event.key !== "Tab") {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isTextInputFocused()) {
        return;
      }
      const direction = event.shiftKey ? "prev" : "next";
      const id = adjacentBeadId(state.design.beads, state.selection.selectedIds, direction);
      if (!id) {
        return;
      }
      event.preventDefault();
      setPendingFocusBeadId(id);
      dispatch({ type: "setSelection", ids: [id], mode: "single" });
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [copiedStyle, multiSelectedBarVisible, state.design.beadCount, state.design.beads, state.selection.selectedIds]);

  const selectedBeads = useMemo(() => {
    const selected = new Set(state.selection.selectedIds);
    return state.design.beads.filter((bead) => selected.has(bead.id));
  }, [state.design.beads, state.selection.selectedIds]);

  const selectedCount = selectedBeads.length;
  const canUndo = state.history.length > 0;
  const canRedo = state.future.length > 0;

  const selectedBeadId = selectedCount === 1 && selectedBeads[0] ? selectedBeads[0].id : null;
  const multiUniformColor = useMemo(() => {
    if (selectedCount <= 1 || selectedBeads.length === 0) {
      return null;
    }
    const first = normHexColor(selectedBeads[0].color);
    return selectedBeads.every((bead) => normHexColor(bead.color) === first) ? first : null;
  }, [selectedBeads, selectedCount]);
  const activeDockBead = useMemo(
    () => (selectedBeadId ? state.design.beads.find((bead) => bead.id === selectedBeadId) ?? null : null),
    [selectedBeadId, state.design.beads],
  );
  const dockBead = selectedCount > 1 ? selectedBeads[0] ?? null : activeDockBead;
  useEffect(() => {
    if (!dockBead) {
      return;
    }
    setBeadEditMode(dockBead.label && dockBead.label.length > 0 ? "text" : "color");
  }, [dockBead?.id]);
  useEffect(() => {
    if (selectedCount > 1) {
      setMultiSelectedBarVisible(true);
    }
  }, [selectedCount, state.selection.selectedIds]);
  const canShowBeadOverlayControls =
    !!activeBeadMeta &&
    activeBeadMeta.isFront &&
    selectedCount === 1 &&
    selectedBeadId === activeBeadMeta.beadId;
  const canShowInsertControls = canShowBeadOverlayControls && state.design.beadCount < MAX_BEAD_COUNT;
  const canShowDeleteControl = canShowBeadOverlayControls && state.design.beadCount > MIN_BEAD_COUNT;

  useEffect(() => {
    if (!activeBeadMeta) {
      return;
    }
    const exists = state.design.beads.some((bead) => bead.id === activeBeadMeta.beadId);
    if (!exists) {
      setActiveBeadMeta(null);
    }
  }, [activeBeadMeta, state.design.beads]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const audio = new Audio("/sounds/bead-switch.mp3");
    audio.preload = "auto";
    audio.volume = 0.25;
    beadSwitchAudioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      beadSwitchAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const prev = prevSelectedBeadIdRef.current;
    prevSelectedBeadIdRef.current = selectedBeadId;
    if (!selectedBeadId || prev === selectedBeadId) {
      return;
    }
    const audio = beadSwitchAudioRef.current;
    if (!audio) {
      return;
    }
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }, [selectedBeadId]);

  useEffect(() => {
    if (!pendingInsertFocusRef.current) {
      return;
    }
    if (!selectedBeadId) {
      return;
    }
    pendingInsertFocusRef.current = false;
    setPendingFocusBeadId(selectedBeadId);
  }, [selectedBeadId]);

  useEffect(() => {
    if (!pendingMultiDuplicateFocusRef.current) {
      return;
    }
    if (state.selection.selectedIds.length === 0) {
      return;
    }
    pendingMultiDuplicateFocusRef.current = false;
    pendingFocusShouldReselectRef.current = false;
    setPendingFocusBeadId(state.selection.selectedIds[0]);
  }, [state.selection.selectedIds]);

  const onFocusComplete = useCallback((beadId: string) => {
    setPendingFocusBeadId(null);
    if (!pendingFocusShouldReselectRef.current) {
      pendingFocusShouldReselectRef.current = true;
      return;
    }
    dispatch({ type: "selectSingle", id: beadId, additive: false });
  }, []);

  const onBeadClick = useCallback((event: BeadClickEvent) => {
    if (event.rangeSelect) {
      pendingFocusShouldReselectRef.current = false;
      const anchor = rangeSelectionAnchorIdRef.current ?? state.selection.selectedIds[0] ?? event.beadId;
      const ids = rangeIdsBetween(state.design.beads, anchor, event.beadId);
      dispatch({ type: "setSelection", ids, mode: "marquee" });
      return;
    }
    if (event.toggleSelect) {
      pendingFocusShouldReselectRef.current = false;
      dispatch({ type: "selectSingle", id: event.beadId, additive: true });
      return;
    }
    pendingFocusShouldReselectRef.current = true;
    setPendingFocusBeadId(event.beadId);
    rangeSelectionAnchorIdRef.current = event.beadId;
    dispatch({ type: "selectSingle", id: event.beadId, additive: false });
  }, [state.design.beads, state.selection.selectedIds]);

  const clearCanvasSelection = useCallback(() => {
    setPendingFocusBeadId(null);
    setActiveBeadMeta(null);
    dispatch({ type: "clearSelection" });
  }, []);

  const insertBeforeActiveBead = useCallback(() => {
    if (!activeBeadMeta || state.design.beadCount >= MAX_BEAD_COUNT) {
      return;
    }
    pendingInsertFocusRef.current = true;
    dispatch({ type: "insertBeadBefore", beadId: activeBeadMeta.beadId });
  }, [activeBeadMeta, state.design.beadCount]);

  const insertAfterActiveBead = useCallback(() => {
    if (!activeBeadMeta || state.design.beadCount >= MAX_BEAD_COUNT) {
      return;
    }
    pendingInsertFocusRef.current = true;
    dispatch({ type: "insertBeadAfter", beadId: activeBeadMeta.beadId });
  }, [activeBeadMeta, state.design.beadCount]);

  const removeActiveBead = useCallback(() => {
    if (!activeBeadMeta || state.design.beadCount <= MIN_BEAD_COUNT) {
      return;
    }
    const fallbackBeadId = adjacentBeadId(state.design.beads, [activeBeadMeta.beadId], "prev");
    setPendingFocusBeadId(fallbackBeadId);
    dispatch({ type: "removeBead", beadId: activeBeadMeta.beadId });
  }, [activeBeadMeta, state.design.beadCount, state.design.beads]);

  const applyPatch = (patch: EditPatch) => {
    dispatch({ type: "applyPatch", patch });
  };

  const resetDesign = useCallback(() => {
    dispatch({
      type: "hydrate",
      design: createDefaultDesign(DEFAULT_BEAD_COUNT),
    });
    setPendingFocusBeadId(null);
  }, []);

  const confirmTextAndAdvance = useCallback(
    (beadId: string, label: string) => {
      dispatch({ type: "selectSingle", id: beadId, additive: false });
      dispatch({ type: "applyPatch", patch: { label } });
      const nextId = adjacentBeadId(state.design.beads, [beadId], "next");
      if (!nextId || nextId === beadId) {
        return;
      }
      setPendingFocusBeadId(nextId);
      dispatch({ type: "setSelection", ids: [nextId], mode: "single" });
    },
    [state.design.beads],
  );

  const removeSelectedBeads = useCallback(() => {
    if (selectedCount === 0 || state.design.beadCount <= MIN_BEAD_COUNT) {
      return;
    }
    const selectedSet = new Set(state.selection.selectedIds);
    const removableCount = Math.max(0, state.design.beads.length - MIN_BEAD_COUNT);
    const orderedSelected = state.design.beads.filter((bead) => selectedSet.has(bead.id));
    const removedIds = new Set(orderedSelected.slice(0, removableCount).map((bead) => bead.id));
    let fallbackBeadId: string | null = null;
    for (let i = state.design.beads.length - 1; i >= 0; i -= 1) {
      const bead = state.design.beads[i];
      if (!removedIds.has(bead.id)) {
        fallbackBeadId = bead.id;
        break;
      }
    }
    setPendingFocusBeadId(fallbackBeadId);
    setActiveBeadMeta(null);
    dispatch({ type: "removeSelectedBeads" });
  }, [selectedCount, state.design.beadCount, state.design.beads, state.selection.selectedIds]);

  const selectAllBeads = useCallback(() => {
    const ids = state.design.beads.map((bead) => bead.id);
    dispatch({ type: "setSelection", ids, mode: "marquee" });
  }, [state.design.beads]);

  const copyFocusedBeadStyle = useCallback(() => {
    if (!selectedBeadId) {
      return;
    }
    const source = state.design.beads.find((bead) => bead.id === selectedBeadId);
    if (!source) {
      return;
    }
    setCopiedStyle({
      color: source.color,
      label: source.label ?? "",
      shape: source.shape,
    });
  }, [selectedBeadId, state.design.beads]);

  const applyCopiedStyleToSelection = useCallback(() => {
    if (!copiedStyle || state.selection.selectedIds.length === 0) {
      return;
    }
    dispatch({ type: "applyPatch", patch: copiedStyle });
  }, [copiedStyle, state.selection.selectedIds.length]);

  const applyMultiColor = useCallback(
    (color: string) => {
      if (selectedCount <= 1) {
        return;
      }
      dispatch({ type: "applyPatch", patch: { color } });
    },
    [selectedCount],
  );

  const duplicateMultiSelection = useCallback(() => {
    if (selectedCount <= 1) {
      return;
    }
    pendingMultiDuplicateFocusRef.current = true;
    dispatch({ type: "duplicateSelection", ids: [...state.selection.selectedIds] });
  }, [selectedCount, state.selection.selectedIds]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0f14] text-[#eaedf3]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/images/kandi-bg.jpg')" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 [background:radial-gradient(circle_at_22%_-10%,rgba(56,107,255,0.16)_0,transparent_42%),radial-gradient(circle_at_80%_0%,rgba(79,146,90,0.1)_0,transparent_38%),linear-gradient(180deg,rgba(16,18,23,0.8)_0%,rgba(15,17,22,0.86)_55%,rgba(13,15,20,0.92)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.08] [background-size:3px_3px] [background-image:radial-gradient(circle,rgba(255,255,255,0.7)_0.5px,transparent_0.6px)]"
      />
      <div ref={canvasStageRef} className="fixed inset-0 z-[1]">
        <KandiCanvas
          beads={state.design.beads}
          selectedIds={state.selection.selectedIds}
          activeBeadId={selectedBeadId}
          orbitResetToken={orbitResetToken}
          guidedPreset={guidedPreset}
          guidedElevationDeg={guidedElevationDeg}
          guidedRotateTick={guidedRotateTick}
          guidedRotateDeltaDeg={guidedRotateDeltaDeg}
          pendingFocusBeadId={pendingFocusBeadId}
          onFocusComplete={onFocusComplete}
          onActiveBeadMeta={setActiveBeadMeta}
          onBeadClick={onBeadClick}
          onClearSelection={clearCanvasSelection}
        />
      </div>

      <AnimatePresence>
        {(canShowInsertControls || canShowDeleteControl || canShowBeadOverlayControls) && activeBeadMeta ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 2 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed z-[7]"
            style={{ left: activeBeadMeta.anchor.x, top: activeBeadMeta.anchor.y }}
          >
            <div className="relative">
              {canShowInsertControls ? <InsertAffordanceButton side="left" onClick={insertBeforeActiveBead} /> : null}
              {canShowInsertControls ? <InsertAffordanceButton side="right" onClick={insertAfterActiveBead} /> : null}
              {canShowDeleteControl ? <DeleteAffordanceButton onClick={removeActiveBead} /> : null}
              {canShowBeadOverlayControls ? <CopyStyleAffordanceButton onClick={copyFocusedBeadStyle} /> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/*
        Full-height shell must not capture pointers — only the header chrome should.
        Otherwise clicks never reach the fixed canvas below (beads untappable).
      */}
      <div className="pointer-events-none relative z-[3] min-h-screen">
        <header className="pointer-events-auto absolute inset-x-0 top-0 z-20 px-6 pt-6 sm:px-8 sm:pt-8">
          <div className="flex w-full flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
              <div className="flex min-w-0 items-center gap-1 rounded-xl border border-[#ffffff12] bg-[#1a1c2180] px-2.5 py-1.5 backdrop-blur-xl">
                <input
                  className="min-w-[6rem] max-w-[14rem] shrink border-0 bg-transparent p-0 font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[1.02rem] font-semibold leading-tight tracking-[-0.02em] text-[#f4f6fa] outline-none placeholder:text-[#6b7280] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#5d77ff99] sm:text-[1.08rem]"
                  value={state.design.name}
                  onChange={(event) => dispatch({ type: "renameDesign", name: event.target.value })}
                  aria-label="Design name"
                />
                <div ref={designMenuRef} className="relative shrink-0">
                  <ToolbarIconButton
                    label="Design actions"
                    className={designMenuOpen ? "bg-[#ffffff0d]" : ""}
                    aria-expanded={designMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => setDesignMenuOpen((open) => !open)}
                  >
                    <motion.span
                      aria-hidden="true"
                      className="icon-[material-symbols--expand-more-rounded] inline-block shrink-0 text-[20px] leading-none"
                      animate={{ rotate: designMenuOpen ? 180 : 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </ToolbarIconButton>
                  <AnimatePresence initial={false}>
                    {designMenuOpen ? (
                      <motion.div
                        key="design-menu"
                        initial={{ opacity: 0, y: -8, filter: "blur(4px)", scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
                        exit={{ opacity: 0, y: -6, filter: "blur(3px)", scale: 0.99 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: "top right" }}
                        role="menu"
                        aria-label="Design actions menu"
                      className="absolute right-0 z-30 mt-1 min-w-[11rem] rounded-xl border border-[#ffffff14] bg-[#1a1c21c7] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full px-3 py-2 text-left font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[0.875rem] font-medium text-[#e4e9f1] hover:bg-[#ffffff08]"
                        onClick={() => {
                          resetDesign();
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
                className="h-10 shrink-0 rounded-lg px-3 py-2 text-[0.8125rem]"
                aria-label="Reset design"
                onClick={resetDesign}
              >
                Reset
              </KandiButton>
              <KandiButton
                variant="secondary"
                className="h-12 w-12 min-w-12 shrink-0 rounded-xl px-0 py-0"
                aria-label="Undo"
                disabled={!canUndo}
                onClick={() => dispatch({ type: "undo" })}
              >
                <span className="icon-[material-symbols--undo-rounded] inline-block shrink-0 text-[24px] leading-none" aria-hidden="true" />
              </KandiButton>
              <KandiButton
                variant="secondary"
                className="h-12 w-12 min-w-12 shrink-0 rounded-xl px-0 py-0"
                aria-label="Redo"
                disabled={!canRedo}
                onClick={() => dispatch({ type: "redo" })}
              >
                <span className="icon-[material-symbols--redo-rounded] inline-block shrink-0 text-[24px] leading-none" aria-hidden="true" />
              </KandiButton>
            </div>

            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
              <div ref={shortcutsPanelRef} className="relative">
                <KandiButton
                  variant="secondary"
                  className={`h-12 w-12 min-w-12 shrink-0 rounded-xl px-0 py-0${shortcutsOpen ? " bg-[#ffffff0d]" : ""}`}
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
                      initial={{ opacity: 0, y: -6, filter: "blur(4px)", scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
                      exit={{ opacity: 0, y: -4, filter: "blur(3px)", scale: 0.99 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute right-0 z-30 mt-1 w-[24.75rem] rounded-2xl border border-[#ffffff18] bg-[#10131bd9] p-3 shadow-[0_18px_44px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                      role="dialog"
                      aria-label="Shortcuts panel"
                    >
                      <div className="mb-2 flex items-center justify-between px-2">
                        <p className="font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[1rem] font-semibold text-[#f0f3f9]">
                          Shortcuts
                        </p>
                      </div>
                      <div className="space-y-1">
                        <ShortcutRow keys="⌘/Ctrl + D" action="Duplicate selected bead(s)" />
                        <ShortcutRow keys="Shift + Click" action="Range select beads" />
                        <ShortcutRow keys="⌘/Ctrl + Click" action="Toggle bead in selection" />
                        <ShortcutRow keys="← / →" action="Move selected bead/group" />
                        <ShortcutRow keys="⌘/Ctrl + ⌥/Alt + S" action="Copy style" />
                        <ShortcutRow keys="⌘/Ctrl + ⌥/Alt + V" action="Apply copied style" />
                        <ShortcutRow keys="Esc" action="Exit multi-select layers" />
                        <ShortcutRow keys="⌘/Ctrl + Z / ⇧Z" action="Undo / Redo" />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
              <KandiButton
                variant="secondary"
                className="h-12 w-12 min-w-12 shrink-0 rounded-xl px-0 py-0"
                aria-label="Download design"
                onClick={() => downloadDesignAsFile(state.design)}
              >
                <span className="icon-[material-symbols--download-rounded] inline-block shrink-0 text-[24px] leading-none" aria-hidden="true" />
              </KandiButton>
              <KandiButton
                variant="primary"
                className="shrink-0 px-3 py-2 text-[0.8125rem]"
                onClick={() => setShareDialogOpen(true)}
              >
                Share
              </KandiButton>
            </div>
          </div>
        </header>
      </div>

      <div role="toolbar" aria-label="Adjust view tilt" className="fixed right-6 top-1/2 z-[4] flex translate-y-[-50%] flex-col gap-2">
        <KandiButton
          variant="compact"
          className="!h-11 !w-11 !rounded-full !border-[#ffffff2a] !bg-[#1a1c2180] !p-0 backdrop-blur-xl"
          disabled={guidedElevationDeg >= GUIDED_ELEVATION_MAX_DEG}
          onClick={() =>
            setGuidedElevationDeg((deg) =>
              Math.min(GUIDED_ELEVATION_MAX_DEG, deg + GUIDED_ELEVATION_STEP_DEG),
            )
          }
        >
          <span className="icon-[material-symbols--keyboard-arrow-up-rounded] inline-block shrink-0 text-[22px] leading-none" aria-hidden="true" />
        </KandiButton>
        <KandiButton
          variant="compact"
          className="!h-11 !w-11 !rounded-full !border-[#ffffff2a] !bg-[#1a1c2180] !p-0 backdrop-blur-xl"
          disabled={guidedElevationDeg <= GUIDED_ELEVATION_MIN_DEG}
          onClick={() =>
            setGuidedElevationDeg((deg) =>
              Math.max(GUIDED_ELEVATION_MIN_DEG, deg - GUIDED_ELEVATION_STEP_DEG),
            )
          }
        >
          <span className="icon-[material-symbols--keyboard-arrow-down-rounded] inline-block shrink-0 text-[22px] leading-none" aria-hidden="true" />
        </KandiButton>
      </div>

      <div className="fixed inset-x-0 bottom-4 z-[6] flex justify-center px-4 sm:bottom-6">
        <div ref={dockControlsRef} className="relative flex flex-col items-center gap-2">
          <AnimatePresence initial={false}>
            {selectedCount > 1 && multiSelectedBarVisible ? (
              <motion.div
                key="multi-selected-chip"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute bottom-0 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center"
              >
                <div className="pointer-events-auto mb-2 flex w-[360px] max-w-[86vw] items-center justify-start gap-1.5">
                  {Object.entries(SWATCH_CLASS_BY_COLOR).map(([color, swatchClassName]) => (
                    <KandiColorSwatchButton
                      key={`multi-${color}`}
                      swatchClassName={swatchClassName}
                      className="h-5 w-5 rounded-md"
                      selected={multiUniformColor ? beadColorMatchesSwatch(multiUniformColor, color) : false}
                      onClick={() => applyMultiColor(color)}
                      aria-label={`Set selected bead color ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    className="ml-1 h-7 w-10 cursor-pointer rounded-md border border-[#ffffff2a] bg-transparent p-1"
                    value={/^#[0-9A-Fa-f]{6}$/.test(multiUniformColor ?? "") ? multiUniformColor! : "#ffffff"}
                    onChange={(event) => applyMultiColor(event.currentTarget.value)}
                    aria-label="Custom color for selected beads"
                  />
                </div>
                <div className="pointer-events-auto flex h-12 w-[360px] max-w-[86vw] items-center gap-2 rounded-full border border-[#ffffff14] bg-[#161a22d9] px-4 py-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <p className="font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[12px] font-medium tracking-[0.02em] text-[#a8b0bf] opacity-70">
                    {selectedCount} selected
                  </p>
                  <button
                    type="button"
                    className="font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[12px] font-medium tracking-[0.02em] text-[#c5ccda] underline-offset-2 transition-colors hover:text-[#e2e7f2] hover:underline"
                    onClick={selectAllBeads}
                  >
                    select all
                  </button>
                <button
                  type="button"
                  className="ml-auto inline-flex h-7 items-center justify-center gap-1 rounded-full border border-[#ffffff1f] bg-[#1a1f2cbf] px-2.5 font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[12px] font-medium tracking-[0.01em] text-[#d9deea] transition-colors hover:bg-[#22293abf]"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={duplicateMultiSelection}
                >
                  <span className="icon-[material-symbols--content-copy-rounded] inline-block text-[13px] leading-none" aria-hidden />
                  duplicate
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 items-center justify-center rounded-full border border-[#ffffff66] bg-[#ffffffe8] px-2.5 font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[12px] font-medium text-[#101318] transition-colors hover:bg-[#ffffff]"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={collapseMultiSelectedBarToDockMode}
                >
                  cancel
                </button>
                </div>
                <p className="mt-1 text-center font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[12px] font-medium tracking-[0.02em] text-[#a8b0bf] opacity-70">
                  cancel with esc
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <motion.div
            animate={
              selectedCount > 1 && multiSelectedBarVisible
                ? { scale: 0.98, opacity: 0.5, y: 2, filter: "blur(2px)" }
           
                : { scale: 1, opacity: 1, y: 0 }
            }
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <KandiSingleBeadBar
              bead={dockBead}
              mode={beadEditMode}
              onModeChange={(nextMode) => {
                setBeadEditMode(nextMode);
                if (nextMode === "text") {
                  applyPatch({ color: "#ffffff" });
                  return;
                }
                applyPatch({ label: "" });
              }}
              onApplyPatch={applyPatch}
              onApplyCopiedStyle={applyCopiedStyleToSelection}
              copiedStyleAvailable={copiedStyle != null}
              onConfirmTextAndAdvance={confirmTextAndAdvance}
              onDismiss={clearCanvasSelection}
              dismissOnEscape={selectedCount <= 1}
              keepOpenOnPointerDownInsideRef={canvasStageRef}
              keepOpenOnPointerDownInsideExtraRef={dockControlsRef}
            />
          </motion.div>
          {selectedCount <= 1 && dockBead ? (
            <div
              role="tablist"
              aria-label="Bead editing mode"
              className="pointer-events-auto inline-flex items-center gap-0 rounded-full border border-[#ffffff14] bg-[#181b22d9] p-0.5 shadow-[0_8px_22px_rgba(0,0,0,0.35)] backdrop-blur-xl"
            >
              <KandiButton
                variant={beadEditMode === "text" ? "toggleOn" : "toggleOff"}
                role="tab"
                aria-selected={beadEditMode === "text"}
                aria-label="Text bead"
                title="Text bead"
                onClick={() => {
                  setBeadEditMode("text");
                  applyPatch({ color: "#ffffff" });
                }}
                className="!h-8 !w-8 !min-h-8 !min-w-8 !rounded-full !border-transparent !px-0 !py-0"
              >
                <span className="icon-[material-symbols--text-fields-rounded] inline-block shrink-0 text-[18px] leading-none" aria-hidden />
              </KandiButton>
              <KandiButton
                variant={beadEditMode === "color" ? "toggleOn" : "toggleOff"}
                role="tab"
                aria-selected={beadEditMode === "color"}
                aria-label="Color bead"
                title="Color bead"
                onClick={() => {
                  setBeadEditMode("color");
                  applyPatch({ label: "" });
                }}
                className="!h-8 !w-8 !min-h-8 !min-w-8 !rounded-full !border-transparent !px-0 !py-0"
              >
                <span className="icon-[material-symbols--palette] inline-block shrink-0 text-[13px] leading-none" aria-hidden />
              </KandiButton>
            </div>
          ) : null}
        </div>
      </div>
      <KandiShareDialog
        key={shareDialogOpen ? state.design.id : "share-closed"}
        open={shareDialogOpen}
        design={state.design}
        onClose={() => setShareDialogOpen(false)}
      />
    </div>
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
      className="pointer-events-auto absolute flex h-8 w-8 items-center justify-center rounded-full border border-[#ffffff24] bg-[#1a1c21eb] text-[#d8dde6] shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-colors duration-150 hover:bg-[#24272d] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[#c5ccd899]"
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
      className="pointer-events-auto absolute flex h-8 w-8 items-center justify-center rounded-full border border-[#ffffff24] bg-[#1a1c21eb] text-[#d8dde6] shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-colors duration-150 hover:bg-[#24272d] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[#c5ccd899]"
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
      className="pointer-events-auto absolute flex h-8 w-8 items-center justify-center rounded-full border border-[#ffffff24] bg-[#1a1c21eb] text-[#d8dde6] shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-colors duration-150 hover:bg-[#24272d] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[#c5ccd899]"
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

function ShortcutRow({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
      <span className="font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[0.8rem] font-medium text-[#9fa8b8]">
        {action}
      </span>
      <kbd className="rounded-md border border-[#ffffff22] bg-[#171b26] px-1.5 py-[2px] font-mono text-[0.72rem] text-[#e7ecf8]">
        {keys}
      </kbd>
    </div>
  );
}
