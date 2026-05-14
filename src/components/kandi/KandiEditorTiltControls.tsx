"use client";

import { motion } from "framer-motion";

import { kandiElevatedSurfaceForcedClassName } from "@/lib/kandi/constants";
import { kandiMotionDuration, kandiMotionTransition } from "@/lib/kandi/motion";

import {
  GUIDED_ELEVATION_MAX_DEG,
  GUIDED_ELEVATION_MIN_DEG,
  GUIDED_ELEVATION_STEP_DEG,
} from "./KandiCanvas";
import { KandiButton } from "./KandiButton";

type KandiEditorTiltControlsProps = {
  prefersReducedMotion: boolean;
  guidedElevationDeg: number;
  onSetGuidedElevationDeg: (updater: (deg: number) => number) => void;
};

export function KandiEditorTiltControls({
  prefersReducedMotion,
  guidedElevationDeg,
  onSetGuidedElevationDeg,
}: KandiEditorTiltControlsProps) {
  return (
    <div role="toolbar" aria-label="Adjust view tilt" className="fixed right-6 top-1/2 z-[4] flex translate-y-[-50%] flex-col gap-2">
      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, x: 8 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
        transition={prefersReducedMotion ? undefined : { duration: kandiMotionDuration.slow, ease: kandiMotionTransition.standard.ease, delay: 0.12 }}
      >
        <KandiButton
          variant="compact"
          className={`!h-11 !w-11 !rounded-full !p-0 ${kandiElevatedSurfaceForcedClassName}`}
          disabled={guidedElevationDeg >= GUIDED_ELEVATION_MAX_DEG}
          onClick={() =>
            onSetGuidedElevationDeg((deg) =>
              Math.min(GUIDED_ELEVATION_MAX_DEG, deg + GUIDED_ELEVATION_STEP_DEG),
            )
          }
        >
          <span className="icon-[material-symbols--keyboard-arrow-up-rounded] inline-block shrink-0 text-[22px] leading-none" aria-hidden="true" />
        </KandiButton>
      </motion.div>
      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, x: 8 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
        transition={prefersReducedMotion ? undefined : { duration: kandiMotionDuration.slow, ease: kandiMotionTransition.standard.ease, delay: 0.16 }}
      >
        <KandiButton
          variant="compact"
          className={`!h-11 !w-11 !rounded-full !p-0 ${kandiElevatedSurfaceForcedClassName}`}
          disabled={guidedElevationDeg <= GUIDED_ELEVATION_MIN_DEG}
          onClick={() =>
            onSetGuidedElevationDeg((deg) =>
              Math.max(GUIDED_ELEVATION_MIN_DEG, deg - GUIDED_ELEVATION_STEP_DEG),
            )
          }
        >
          <span className="icon-[material-symbols--keyboard-arrow-down-rounded] inline-block shrink-0 text-[22px] leading-none" aria-hidden="true" />
        </KandiButton>
      </motion.div>
    </div>
  );
}
