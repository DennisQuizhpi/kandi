"use client";

import { useState } from "react";

import {
  GUIDED_ELEVATION_DEFAULT_DEG,
  GUIDED_ELEVATION_MAX_DEG,
  GUIDED_ELEVATION_MIN_DEG,
  GUIDED_ELEVATION_STEP_DEG,
  KandiCanvas,
} from "@/components/kandi/KandiCanvas";
import { KandiButton } from "@/components/kandi/KandiButton";
import { KandiPublicShareActions } from "@/components/kandi/KandiPublicShareActions";
import type { KandiDesign } from "@/lib/kandi/types";

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
  const [guidedElevationDeg, setGuidedElevationDeg] = useState(GUIDED_ELEVATION_DEFAULT_DEG);
  const [orbitResetToken, setOrbitResetToken] = useState(0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d0f14] text-[#edf1f8]">
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

      <header className="relative z-20 flex items-center justify-between px-6 pb-4 pt-7 sm:px-10 sm:pt-8">
        <p className="font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[1.05rem] font-semibold tracking-[-0.02em] text-[#f1f4fa]">
          kandi share
        </p>
        <p className="text-[0.82rem] text-[#a2adbf]">shared {new Date(createdAt).toLocaleDateString()}</p>
      </header>

      <section className="relative z-20 mx-auto flex w-full max-w-[58rem] flex-col items-center px-6 pt-[9vh] text-center sm:px-10">
        <div className="w-full max-w-[36rem] rounded-2xl border border-[#ffffff16] bg-[#171b23bf] px-5 py-5 shadow-[0_20px_54px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:px-7 sm:py-6">
          <h1 className="font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[1.8rem] font-semibold tracking-[-0.03em] text-[#f0f3fa] sm:text-[2.25rem]">
            {title}
          </h1>
          {message ? <p className="mt-2 text-[1rem] text-[#c6cfde] sm:text-[1.15rem]">{message}</p> : null}
          <div className="mt-7">
            <KandiPublicShareActions shareUrl={shareUrl} remixUrl={remixUrl} />
          </div>
        </div>
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[58vh] sm:h-[62vh]">
        <div className="pointer-events-auto h-full">
          <KandiCanvas
            beads={design.beads}
            selectedIds={[]}
            activeBeadId={null}
            orbitResetToken={orbitResetToken}
            guidedPreset="bracelet"
            guidedElevationDeg={guidedElevationDeg}
            guidedRotateTick={0}
            guidedRotateDeltaDeg={0}
            onBeadClick={() => {}}
            onClearSelection={() => {}}
          />
        </div>
      </div>

      <div role="toolbar" aria-label="Adjust camera view" className="fixed bottom-8 right-6 z-30 flex flex-col gap-2 sm:bottom-10 sm:right-8">
        <KandiButton
          variant="compact"
          className="!h-11 !w-11 !rounded-full !border-[#ffffff2a] !bg-[#1a1c2180] !p-0 backdrop-blur-xl"
          disabled={guidedElevationDeg >= GUIDED_ELEVATION_MAX_DEG}
          onClick={() =>
            setGuidedElevationDeg((deg) =>
              Math.min(GUIDED_ELEVATION_MAX_DEG, deg + GUIDED_ELEVATION_STEP_DEG),
            )
          }
          aria-label="Raise camera"
        >
          <span className="icon-[material-symbols--keyboard-arrow-up-rounded] inline-block shrink-0 text-[22px] leading-none" aria-hidden />
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
          aria-label="Lower camera"
        >
          <span className="icon-[material-symbols--keyboard-arrow-down-rounded] inline-block shrink-0 text-[22px] leading-none" aria-hidden />
        </KandiButton>
        <KandiButton
          variant="compact"
          className="!h-11 !w-11 !rounded-full !border-[#ffffff2a] !bg-[#1a1c2180] !p-0 backdrop-blur-xl"
          onClick={() => setOrbitResetToken((token) => token + 1)}
          aria-label="Reset view"
        >
          <span className="icon-[material-symbols--restart-alt-rounded] inline-block shrink-0 text-[20px] leading-none" aria-hidden />
        </KandiButton>
      </div>
    </main>
  );
}
