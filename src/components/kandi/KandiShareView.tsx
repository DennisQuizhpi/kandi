"use client";

import { useMemo, useState } from "react";

import {
  BRACELET_VISUAL_DEFAULT_DISTANCE,
  BRACELET_VISUAL_DEFAULT_POLAR_DEG,
  BRACELET_VISUAL_DEFAULT_AZIMUTH_DEG,
  BRACELET_VISUAL_POLAR_MAX_DEG,
  BRACELET_VISUAL_POLAR_MIN_DEG,
  BRACELET_VISUAL_POLAR_STEP_DEG,
  braceletShowcaseEyeFromSpherical,
  KandiBraceletVisualCanvas,
} from "@/components/kandi/KandiBraceletVisualCanvas";
import { KandiButton } from "@/components/kandi/KandiButton";
import { KandiPublicShareActions } from "@/components/kandi/KandiPublicShareActions";
import { kandiElevatedSurfaceClassName, kandiElevatedSurfaceForcedClassName } from "@/lib/kandi/constants";
import type { KandiDesign } from "@/lib/kandi/types";

/** World-space shift for the share-page bracelet (try negative Y to move the ring “down” in frame and show the top arc). */
const SHARE_BRACELET_WORLD_OFFSET: readonly [number, number, number] = [0, -2.35, 0];

const ROTATE_STEP_RAD = (22 * Math.PI) / 180;

export function KandiShareView({
  design,
  title,
  message,
  shareUrl,
  remixUrl,
  createdAt,
}: {
  design: KandiDesign;
  title: string;
  message: string;
  shareUrl: string;
  remixUrl: string;
  createdAt: string;
}) {
  const [cameraPolarDeg, setCameraPolarDeg] = useState(BRACELET_VISUAL_DEFAULT_POLAR_DEG);
  const [braceletSpinRad, setBraceletSpinRad] = useState(0);
  const sharedDate = new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const cameraTarget = useMemo(
    (): readonly [number, number, number] => [0, SHARE_BRACELET_WORLD_OFFSET[1], 0],
    [],
  );

  const cameraPosition = useMemo(
    () =>
      braceletShowcaseEyeFromSpherical({
        distance: BRACELET_VISUAL_DEFAULT_DISTANCE,
        polarDeg: cameraPolarDeg,
        azimuthDeg: BRACELET_VISUAL_DEFAULT_AZIMUTH_DEG,
        target: cameraTarget,
      }),
    [cameraPolarDeg, cameraTarget],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--surface-0)] text-[var(--text-strong)]">
      <header className="relative z-20 flex items-center justify-between px-6 pb-4 pt-7 sm:px-10 sm:pt-8">
        <p className="k-type-display tracking-[0.01em] text-[var(--text-strong)]">kandi share</p>
        <p className={`k-type-label rounded-full px-3 py-1 text-[var(--text-muted)] ${kandiElevatedSurfaceClassName}`}>
          shared {sharedDate}
        </p>
      </header>

      <section className="relative z-20 mx-auto flex w-full max-w-[72rem] flex-col items-center px-6 pt-[7vh] text-center sm:px-10">
        <div className="k-share-card-enter relative w-full max-w-[44rem] px-3 py-4 sm:px-4 sm:py-5">
          <p className="k-type-label text-[var(--text-muted)]">Shared with care from Kandi Maker</p>
          <h1 className="mt-2 k-type-headline text-[30px] leading-[36px] text-[var(--text-strong)] sm:text-[44px] sm:leading-[50px]">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-[33rem] k-type-body text-[15px] text-[var(--text-muted)] sm:text-[18px] sm:leading-[28px]">
            Made for a moment, remixed for your next one.
          </p>
          {message ? (
            <div className={`mx-auto mt-5 max-w-[32rem] rounded-xl px-4 py-3 text-left ${kandiElevatedSurfaceClassName}`}>
              <p className="k-type-meta uppercase tracking-[0.08em] text-[var(--text-muted)]">note</p>
              <p className="mt-1.5 k-type-body text-[var(--text-strong)]">{message}</p>
            </div>
          ) : null}
          <div className="mt-7 border-t border-[var(--border-soft)] pt-5">
            <KandiPublicShareActions shareUrl={shareUrl} remixUrl={remixUrl} />
          </div>
        </div>
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-[-17vh] z-10 h-[76vh] sm:bottom-[-18vh] sm:h-[80vh]">
        <div className="pointer-events-none h-full">
          <KandiBraceletVisualCanvas
            className="relative h-full min-h-0 w-full pointer-events-none"
            beads={design.beads}
            cameraPosition={cameraPosition}
            cameraTarget={cameraTarget}
            braceletRotationRad={braceletSpinRad}
            braceletWorldOffset={SHARE_BRACELET_WORLD_OFFSET}
          />
        </div>
      </div>

      <div
        role="toolbar"
        aria-label="Adjust bracelet view"
        className={`fixed bottom-8 right-6 z-30 flex flex-wrap items-center gap-2 rounded-full p-2 sm:bottom-10 sm:right-8 ${kandiElevatedSurfaceClassName}`}
      >
        <KandiButton
          variant="compact"
          className="!h-10 !w-10 !rounded-full !p-0"
          onClick={() => setBraceletSpinRad((r) => r - ROTATE_STEP_RAD)}
          aria-label="Rotate bracelet left"
        >
          <span className="icon-[material-symbols--rotate-left-rounded] inline-block shrink-0 text-[18px] leading-none" aria-hidden />
        </KandiButton>
        <KandiButton
          variant="compact"
          className="!h-10 !w-10 !rounded-full !p-0"
          onClick={() => setBraceletSpinRad((r) => r + ROTATE_STEP_RAD)}
          aria-label="Rotate bracelet right"
        >
          <span className="icon-[material-symbols--rotate-right-rounded] inline-block shrink-0 text-[18px] leading-none" aria-hidden />
        </KandiButton>
        <KandiButton
          variant="compact"
          className={`!h-10 !w-10 !rounded-full !p-0 ${kandiElevatedSurfaceForcedClassName}`}
          disabled={cameraPolarDeg <= BRACELET_VISUAL_POLAR_MIN_DEG}
          onClick={() =>
            setCameraPolarDeg((deg) => Math.max(BRACELET_VISUAL_POLAR_MIN_DEG, deg - BRACELET_VISUAL_POLAR_STEP_DEG))
          }
          aria-label="Raise camera"
        >
          <span className="icon-[material-symbols--keyboard-arrow-up-rounded] inline-block shrink-0 text-[22px] leading-none" aria-hidden />
        </KandiButton>
        <KandiButton
          variant="compact"
          className={`!h-10 !w-10 !rounded-full !p-0 ${kandiElevatedSurfaceForcedClassName}`}
          disabled={cameraPolarDeg >= BRACELET_VISUAL_POLAR_MAX_DEG}
          onClick={() =>
            setCameraPolarDeg((deg) => Math.min(BRACELET_VISUAL_POLAR_MAX_DEG, deg + BRACELET_VISUAL_POLAR_STEP_DEG))
          }
          aria-label="Lower camera"
        >
          <span className="icon-[material-symbols--keyboard-arrow-down-rounded] inline-block shrink-0 text-[22px] leading-none" aria-hidden />
        </KandiButton>
        <KandiButton
          variant="compact"
          className={`!h-10 !w-10 !rounded-full !p-0 ${kandiElevatedSurfaceForcedClassName}`}
          onClick={() => {
            setBraceletSpinRad(0);
            setCameraPolarDeg(BRACELET_VISUAL_DEFAULT_POLAR_DEG);
          }}
          aria-label="Reset view"
        >
          <span className="icon-[material-symbols--restart-alt-rounded] inline-block shrink-0 text-[20px] leading-none" aria-hidden />
        </KandiButton>
      </div>
    </main>
  );
}
