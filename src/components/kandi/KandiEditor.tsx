"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import {
  DEFAULT_BEAD_COUNT,
  MAX_BEAD_COUNT,
  MIN_BEAD_COUNT,
  kandiElevatedSurfaceClassName,
} from "@/lib/kandi/constants";
import { loadDesign, saveDesign } from "@/lib/kandi/persistence";
import { fetchSharedPostcard, publishShare } from "@/lib/kandi/share/client";
import { adjacentBeadId, rangeIdsBetween, selectionExtentBoundaryId } from "@/lib/kandi/selection";
import { STARTER_PRESETS, starterPresetToDesign } from "@/lib/kandi/starters";
import { createDefaultDesign, createInitialState, kandiReducer } from "@/lib/kandi/store";
import { EditPatch, type BeadShape } from "@/lib/kandi/types";

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
import { KandiEditorBeadOverlay } from "./KandiEditorBeadOverlay";
import { KandiEditorDock } from "./KandiEditorDock";
import { KandiEditorHeader } from "./KandiEditorHeader";
import { KandiEditorShareStatusToast, type SharePublishState } from "./KandiEditorShareStatusToast";
import { KandiEditorTiltControls } from "./KandiEditorTiltControls";
import { KandiShareDialog, type ShareDialogSubmitPayload } from "./KandiShareDialog";
import { kandiMotionTransition } from "@/lib/kandi/motion";

function normHexColor(c: string): string {
  return c.trim().toLowerCase();
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

export function KandiEditor({
  presetId = null,
  guidedPreset: guidedPresetProp = "bracelet",
}: {
  presetId?: string | null;
  guidedPreset?: GuidedCameraPreset;
}) {
  const prefersReducedMotion = useReducedMotion();
  const initialPresetDesign = useMemo(() => {
    if (!presetId) {
      return null;
    }
    const preset = STARTER_PRESETS.find((candidate) => candidate.id === presetId);
    return preset ? starterPresetToDesign(preset) : null;
  }, [presetId]);
  const [state, dispatch] = useReducer(
    kandiReducer,
    initialPresetDesign ?? createDefaultDesign(DEFAULT_BEAD_COUNT),
    createInitialState,
  );
  const [orbitResetToken] = useState(0);
  const [guidedPreset] = useState<GuidedCameraPreset>(guidedPresetProp);
  const guidedRotateTick = 0;
  const guidedRotateDeltaDeg = 0;
  const [guidedElevationDeg, setGuidedElevationDeg] = useState(GUIDED_ELEVATION_DEFAULT_DEG);
  const hasHydratedRef = useRef(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const canvasStageRef = useRef<HTMLDivElement>(null);
  const dockControlsRef = useRef<HTMLDivElement>(null);
  const [pendingFocusBeadId, setPendingFocusBeadId] = useState<string | null>(null);
  const [activeBeadMeta, setActiveBeadMeta] = useState<HoveredBeadMeta | null>(null);
  const [insertOverlayPinnedAnchor, setInsertOverlayPinnedAnchor] = useState<{ x: number; y: number } | null>(null);
  const beadSwitchAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevSelectedBeadIdRef = useRef<string | null>(null);
  const rangeSelectionAnchorIdRef = useRef<string | null>(null);
  const preserveInsertOverlayPinOnNextSelectionRef = useRef(false);
  const pendingFocusShouldReselectRef = useRef(true);
  const pendingInsertFocusRef = useRef(false);
  const pendingMultiDuplicateFocusRef = useRef(false);
  const [copiedStyle, setCopiedStyle] = useState<EditPatch | null>(null);
  const [multiSelectedBarVisible, setMultiSelectedBarVisible] = useState(true);
  const [beadEditMode, setBeadEditMode] = useState<"text" | "color">("color");
  /** When true, the next `dockBead.id` change skips syncing mode from bead label (Enter advance keeps text vs color). */
  const preserveBeadEditModeOnDockSelectionChangeRef = useRef(false);
  const remixHydratedSlugRef = useRef<string | null>(null);
  const [sharePublishState, setSharePublishState] = useState<SharePublishState | null>(null);
  const [clipboardToastMessage, setClipboardToastMessage] = useState<string | null>(null);
  const copiedBeadTemplateRef = useRef<{ color: string; shape: BeadShape; label?: string } | null>(null);
  const collapseMultiSelectedBarToDockMode = () => {
    setMultiSelectedBarVisible(false);
  };

  useEffect(() => {
    if (initialPresetDesign) {
      hasHydratedRef.current = true;
      return;
    }
    const existing = loadDesign();
    if (existing) {
      dispatch({ type: "hydrate", design: existing });
    }
    hasHydratedRef.current = true;
  }, [initialPresetDesign]);

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
    if (!clipboardToastMessage) {
      return;
    }
    const timerId = window.setTimeout(() => setClipboardToastMessage(null), 2000);
    return () => window.clearTimeout(timerId);
  }, [clipboardToastMessage]);

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

      const cmdOrCtrl = event.metaKey || event.ctrlKey;

      if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && cmdOrCtrl && !event.altKey && !event.shiftKey) {
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

      const isCamUp =
        (event.key === "ArrowUp" || event.key === "w" || event.key === "W") &&
        !cmdOrCtrl &&
        !event.altKey &&
        !event.shiftKey;
      const isCamDown =
        (event.key === "ArrowDown" || event.key === "s" || event.key === "S") &&
        !cmdOrCtrl &&
        !event.altKey &&
        !event.shiftKey;

      if (isCamUp || isCamDown) {
        if (isTextInputFocused()) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        setGuidedElevationDeg((deg) =>
          isCamUp
            ? Math.min(GUIDED_ELEVATION_MAX_DEG, deg + GUIDED_ELEVATION_STEP_DEG)
            : Math.max(GUIDED_ELEVATION_MIN_DEG, deg - GUIDED_ELEVATION_STEP_DEG),
        );
        return;
      }

      const isNavLeft = event.key === "ArrowLeft" || event.key === "a" || event.key === "A";
      const isNavRight = event.key === "ArrowRight" || event.key === "d" || event.key === "D";
      if ((isNavLeft || isNavRight) && !cmdOrCtrl && !event.altKey) {
        if (isTextInputFocused()) {
          return;
        }
        if (event.shiftKey) {
          if (state.selection.selectedIds.length === 0) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          const direction = isNavLeft ? "prev" : "next";
          const boundaryId = selectionExtentBoundaryId(
            state.design.beads,
            state.selection.selectedIds,
            direction,
          );
          if (!boundaryId) {
            return;
          }
          const anchor =
            rangeSelectionAnchorIdRef.current ?? state.selection.selectedIds[0] ?? boundaryId;
          const ids = rangeIdsBetween(state.design.beads, anchor, boundaryId);
          pendingFocusShouldReselectRef.current = false;
          dispatch({ type: "setSelection", ids, mode: "marquee" });
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const direction = isNavLeft ? "prev" : "next";
        const id = adjacentBeadId(state.design.beads, state.selection.selectedIds, direction);
        if (!id) {
          return;
        }
        rangeSelectionAnchorIdRef.current = id;
        pendingFocusShouldReselectRef.current = true;
        setPendingFocusBeadId(id);
        dispatch({ type: "setSelection", ids: [id], mode: "single" });
        return;
      }

      const isUndo = cmdOrCtrl && !event.altKey && event.key.toLowerCase() === "z";
      const isRedoViaShiftZ = isUndo && event.shiftKey;
      const isRedoViaY = cmdOrCtrl && !event.altKey && event.key.toLowerCase() === "y";
      const isDuplicate = cmdOrCtrl && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "d";
      const isCopyStyle = cmdOrCtrl && event.altKey && !event.shiftKey && event.key.toLowerCase() === "s";
      const isPasteStyle = cmdOrCtrl && event.altKey && !event.shiftKey && event.key.toLowerCase() === "v";
      const isCopyBead = cmdOrCtrl && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "c";
      const isPasteBead = cmdOrCtrl && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "v";
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

      if (isCopyBead) {
        if (isTextInputFocused() || state.selection.selectedIds.length === 0) {
          return;
        }
        const selectedInOrder = state.design.beads.filter((bead) =>
          state.selection.selectedIds.includes(bead.id),
        );
        const source = selectedInOrder[0];
        if (!source) {
          return;
        }
        event.preventDefault();
        const template: { color: string; shape: typeof source.shape; label?: string } = {
          color: source.color,
          shape: source.shape,
        };
        if (source.label !== undefined && source.label.length > 0) {
          template.label = source.label;
        }
        copiedBeadTemplateRef.current = template;
        setClipboardToastMessage("bead copied");
        return;
      }

      if (isPasteBead) {
        const template = copiedBeadTemplateRef.current;
        if (!template || isTextInputFocused() || state.selection.selectedIds.length === 0) {
          return;
        }
        if (state.design.beadCount >= MAX_BEAD_COUNT) {
          return;
        }
        event.preventDefault();
        const selectedInOrder = state.design.beads.filter((bead) =>
          state.selection.selectedIds.includes(bead.id),
        );
        const afterBead = selectedInOrder[selectedInOrder.length - 1];
        if (!afterBead) {
          return;
        }
        pendingInsertFocusRef.current = true;
        dispatch({
          type: "pasteBeadAfter",
          afterBeadId: afterBead.id,
          template,
        });
        return;
      }

      if ((event.key === "Backspace" || event.key === "Delete") && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isTextInputFocused() || state.selection.selectedIds.length === 0 || state.design.beadCount <= MIN_BEAD_COUNT) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (state.selection.selectedIds.length > 1) {
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
          pendingFocusShouldReselectRef.current = true;
          setPendingFocusBeadId(fallbackBeadId);
          setActiveBeadMeta(null);
          dispatch({ type: "removeSelectedBeads" });
          return;
        }
        const beadId = state.selection.selectedIds[0];
        if (!beadId) {
          return;
        }
        const fallbackBeadId = adjacentBeadId(state.design.beads, [beadId], "prev");
        pendingFocusShouldReselectRef.current = true;
        setPendingFocusBeadId(fallbackBeadId);
        setActiveBeadMeta(null);
        dispatch({ type: "removeBead", beadId });
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
      rangeSelectionAnchorIdRef.current = id;
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
  const clearInsertOverlayPin = useCallback(() => {
    preserveInsertOverlayPinOnNextSelectionRef.current = false;
    setInsertOverlayPinnedAnchor(null);
  }, []);
  const pinInsertOverlayToCurrentAnchor = useCallback(() => {
    if (!activeBeadMeta?.isFront) {
      return;
    }
    preserveInsertOverlayPinOnNextSelectionRef.current = true;
    setInsertOverlayPinnedAnchor(activeBeadMeta.anchor);
  }, [activeBeadMeta]);
  useEffect(() => {
    if (!dockBead) {
      return;
    }
    if (preserveBeadEditModeOnDockSelectionChangeRef.current) {
      preserveBeadEditModeOnDockSelectionChangeRef.current = false;
      return;
    }
    setBeadEditMode(dockBead.label && dockBead.label.length > 0 ? "text" : "color");
  }, [dockBead?.id]);
  useEffect(() => {
    if (selectedCount > 1) {
      setMultiSelectedBarVisible(true);
    }
  }, [selectedCount, state.selection.selectedIds]);
  const beadOverlayFocusSettled = pendingFocusBeadId === null;
  const canShowPinnedInsertOverlay = selectedCount === 1 && selectedBeadId != null && insertOverlayPinnedAnchor != null;
  const canShowFrontAnchoredOverlay =
    beadOverlayFocusSettled &&
    !!activeBeadMeta &&
    activeBeadMeta.isFront &&
    selectedCount === 1 &&
    selectedBeadId === activeBeadMeta.beadId;
  const canShowBeadOverlayControls = canShowPinnedInsertOverlay || canShowFrontAnchoredOverlay;
  const canShowInsertControls = canShowBeadOverlayControls && state.design.beadCount < MAX_BEAD_COUNT;
  const canShowDeleteControl = canShowBeadOverlayControls && state.design.beadCount > MIN_BEAD_COUNT;
  const beadOverlayAnchor = canShowPinnedInsertOverlay
    ? insertOverlayPinnedAnchor
    : canShowFrontAnchoredOverlay
      ? activeBeadMeta?.anchor ?? null
      : null;

  useEffect(() => {
    if (!insertOverlayPinnedAnchor || !canShowFrontAnchoredOverlay) {
      return;
    }
    setInsertOverlayPinnedAnchor(null);
  }, [canShowFrontAnchoredOverlay, insertOverlayPinnedAnchor]);

  useEffect(() => {
    return () => clearInsertOverlayPin();
  }, [clearInsertOverlayPin]);

  useEffect(() => {
    if (preserveInsertOverlayPinOnNextSelectionRef.current) {
      preserveInsertOverlayPinOnNextSelectionRef.current = false;
      return;
    }
    clearInsertOverlayPin();
  }, [clearInsertOverlayPin, selectedBeadId]);

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
    clearInsertOverlayPin();
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
  }, [clearInsertOverlayPin, state.design.beads, state.selection.selectedIds]);

  const clearCanvasSelection = useCallback(() => {
    clearInsertOverlayPin();
    setPendingFocusBeadId(null);
    setActiveBeadMeta(null);
    dispatch({ type: "clearSelection" });
  }, [clearInsertOverlayPin]);

  const copyPublishedShareLink = useCallback(async () => {
    if (!sharePublishState?.shareUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(sharePublishState.shareUrl);
      setSharePublishState((current) =>
        current ? { ...current, message: "Link copied." } : current,
      );
    } catch {
      setSharePublishState((current) =>
        current ? { ...current, message: "Could not copy link." } : current,
      );
    }
  }, [sharePublishState]);

  const beadCount = state.design.beadCount;
  const beadFillRatio = beadCount / MAX_BEAD_COUNT;
  const beadCounterToneClassName =
    beadFillRatio >= 0.9
      ? "text-[oklch(0.52 0.1 18)]"
      : beadFillRatio >= 0.75
        ? "text-[oklch(0.48 0.11 88)]"
        : "text-[var(--text-strong)]";

  const handleShareSubmit = useCallback(
    async (payload: ShareDialogSubmitPayload) => {
      setShareDialogOpen(false);
      setSharePublishState({
        status: "publishing",
        message: "Publishing...",
      });
      try {
        const result = await publishShare({
          design: state.design,
          title: payload.title,
          message: payload.message,
        });
        setSharePublishState({
          status: "published",
          shareUrl: result.shareUrl,
          message: "Published.",
        });
      } catch (error) {
        setSharePublishState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to publish share.",
        });
      }
    },
    [state.design],
  );

  const insertBeforeSelectedBead = useCallback(() => {
    if (!selectedBeadId || state.design.beadCount >= MAX_BEAD_COUNT) {
      return;
    }
    pinInsertOverlayToCurrentAnchor();
    pendingInsertFocusRef.current = true;
    dispatch({ type: "insertBeadBefore", beadId: selectedBeadId });
  }, [pinInsertOverlayToCurrentAnchor, selectedBeadId, state.design.beadCount]);

  const insertAfterSelectedBead = useCallback(() => {
    if (!selectedBeadId || state.design.beadCount >= MAX_BEAD_COUNT) {
      return;
    }
    pinInsertOverlayToCurrentAnchor();
    pendingInsertFocusRef.current = true;
    dispatch({ type: "insertBeadAfter", beadId: selectedBeadId });
  }, [pinInsertOverlayToCurrentAnchor, selectedBeadId, state.design.beadCount]);

  const removeSelectedBead = useCallback(() => {
    if (!selectedBeadId || state.design.beadCount <= MIN_BEAD_COUNT) {
      return;
    }
    clearInsertOverlayPin();
    const fallbackBeadId = adjacentBeadId(state.design.beads, [selectedBeadId], "prev");
    setPendingFocusBeadId(fallbackBeadId);
    dispatch({ type: "removeBead", beadId: selectedBeadId });
  }, [clearInsertOverlayPin, selectedBeadId, state.design.beadCount, state.design.beads]);

  const applyPatch = (patch: EditPatch) => {
    dispatch({ type: "applyPatch", patch });
  };

  const resetDesign = useCallback(() => {
    clearInsertOverlayPin();
    dispatch({
      type: "hydrate",
      design: createDefaultDesign(DEFAULT_BEAD_COUNT),
    });
    setPendingFocusBeadId(null);
  }, [clearInsertOverlayPin]);

  const confirmTextAndAdvance = useCallback(
    (beadId: string, label: string) => {
      dispatch({ type: "selectSingle", id: beadId, additive: false });
      dispatch({ type: "applyPatch", patch: { label } });
      const nextId = adjacentBeadId(state.design.beads, [beadId], "next");
      if (!nextId || nextId === beadId) {
        return;
      }
      preserveBeadEditModeOnDockSelectionChangeRef.current = true;
      setPendingFocusBeadId(nextId);
      dispatch({ type: "setSelection", ids: [nextId], mode: "single" });
    },
    [state.design.beads],
  );

  const advanceToNextBeadFromDock = useCallback(
    (beadId: string) => {
      const nextId = adjacentBeadId(state.design.beads, [beadId], "next");
      if (!nextId || nextId === beadId) {
        return;
      }
      preserveBeadEditModeOnDockSelectionChangeRef.current = true;
      setPendingFocusBeadId(nextId);
      dispatch({ type: "setSelection", ids: [nextId], mode: "single" });
    },
    [state.design.beads],
  );

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
    <div className="relative min-h-screen overflow-hidden bg-transparent text-[var(--text-strong)]">
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

      <KandiEditorBeadOverlay
        beadOverlayAnchor={beadOverlayAnchor}
        canShowInsertControls={canShowInsertControls}
        canShowDeleteControl={canShowDeleteControl}
        canShowBeadOverlayControls={canShowBeadOverlayControls}
        onInsertBeforeSelectedBead={insertBeforeSelectedBead}
        onInsertAfterSelectedBead={insertAfterSelectedBead}
        onRemoveSelectedBead={removeSelectedBead}
        onCopyFocusedBeadStyle={copyFocusedBeadStyle}
      />

      {/*
        Full-height shell must not capture pointers — only the header chrome should.
        Otherwise clicks never reach the fixed canvas below (beads untappable).
      */}
      <KandiEditorHeader
        designName={state.design.name}
        beadCount={beadCount}
        beadCounterToneClassName={beadCounterToneClassName}
        canUndo={canUndo}
        canRedo={canRedo}
        prefersReducedMotion={Boolean(prefersReducedMotion)}
        onDesignNameChange={(name) => dispatch({ type: "renameDesign", name })}
        onResetDesign={resetDesign}
        onUndo={() => dispatch({ type: "undo" })}
        onRedo={() => dispatch({ type: "redo" })}
        onOpenShareDialog={() => setShareDialogOpen(true)}
      />

      <KandiEditorTiltControls
        prefersReducedMotion={Boolean(prefersReducedMotion)}
        guidedElevationDeg={guidedElevationDeg}
        onSetGuidedElevationDeg={setGuidedElevationDeg}
      />

      <KandiEditorDock
        prefersReducedMotion={Boolean(prefersReducedMotion)}
        selectedCount={selectedCount}
        multiSelectedBarVisible={multiSelectedBarVisible}
        multiUniformColor={multiUniformColor}
        dockBead={dockBead}
        beadEditMode={beadEditMode}
        copiedStyleAvailable={copiedStyle != null}
        canvasStageRef={canvasStageRef}
        dockControlsRef={dockControlsRef}
        setBeadEditMode={setBeadEditMode}
        onCollapseMultiSelectedBarToDockMode={collapseMultiSelectedBarToDockMode}
        onApplyMultiColor={applyMultiColor}
        onSelectAllBeads={selectAllBeads}
        onDuplicateMultiSelection={duplicateMultiSelection}
        onApplyPatch={applyPatch}
        onApplyCopiedStyleToSelection={applyCopiedStyleToSelection}
        onConfirmTextAndAdvance={confirmTextAndAdvance}
        onAdvanceToNextBeadFromDock={advanceToNextBeadFromDock}
        onDismissSelection={clearCanvasSelection}
      />
      <KandiShareDialog
        key={shareDialogOpen ? state.design.id : "share-closed"}
        open={shareDialogOpen}
        design={state.design}
        onClose={() => setShareDialogOpen(false)}
        onSubmit={handleShareSubmit}
      />
      <KandiEditorShareStatusToast
        sharePublishState={sharePublishState}
        onCopyPublishedShareLink={copyPublishedShareLink}
        onCloseSharePublishState={() => setSharePublishState(null)}
      />
      <AnimatePresence initial={false}>
        {clipboardToastMessage ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={kandiMotionTransition.standard}
            className={`fixed left-1/2 top-[5.25rem] z-[48] flex h-11 w-[min(92vw,20rem)] -translate-x-1/2 items-center justify-center rounded-xl px-4 ${kandiElevatedSurfaceClassName}`}
            role="status"
            aria-live="polite"
          >
            <p className="text-center k-type-title text-[var(--text-strong)]">{clipboardToastMessage}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
