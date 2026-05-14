export const kandiEaseOutQuart = [0.25, 1, 0.5, 1] as const;

export const kandiMotionDuration = {
  instant: 0.12,
  fast: 0.16,
  standard: 0.2,
  slow: 0.3,
  shell: 0.42,
  dock: 0.46,
} as const;

export const kandiMotionTransition = {
  instant: { duration: kandiMotionDuration.instant, ease: kandiEaseOutQuart },
  fast: { duration: kandiMotionDuration.fast, ease: kandiEaseOutQuart },
  standard: { duration: kandiMotionDuration.standard, ease: kandiEaseOutQuart },
  slow: { duration: kandiMotionDuration.slow, ease: kandiEaseOutQuart },
} as const;
