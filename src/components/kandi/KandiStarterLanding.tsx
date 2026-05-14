"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { type StarterPreset } from "@/lib/kandi/starters";

import { KandiButton } from "./KandiButton";

const PRESET_PREVIEW_IMAGE_BY_ID: Record<string, string> = {
  sweetheart: "/bracelets/sweetheart.png",
  "bubble-pop": "/bracelets/bubble-pop.png",
  "cutie-smiles": "/bracelets/cutie-smiles.png",
  starlight: "/bracelets/starlight.png",
  "rainbow-rush": "/bracelets/rainbow-rush.png",
  "angel-energy": "/bracelets/angel-energy.png",
};

const ENTRANCE_EASE = [0.22, 1, 0.36, 1] as const;
const REMIX_CURSOR = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='112' height='44' viewBox='0 0 112 44'>
    <rect x='1' y='1' width='110' height='42' rx='21' fill='#101318' fill-opacity='0.92' stroke='rgba(255,255,255,0.3)' stroke-width='2'/>
    <text x='56' y='27' text-anchor='middle' font-family='Avenir Next, Arial, sans-serif' font-size='18' font-weight='700' fill='white'>Remix</text>
  </svg>`,
)}") 56 22, pointer`;

function MotionTextReveal({ text }: { text: string }) {
  const prefersReducedMotion = useReducedMotion();
  const letters = text.split("");

  if (prefersReducedMotion) {
    return <>{text}</>;
  }

  return (
    <span className="inline-flex" aria-label={text}>
      {letters.map((letter, index) => (
        <motion.span
          key={`${letter}-${index}`}
          aria-hidden="true"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: ENTRANCE_EASE, delay: 0.15 + index * 0.055 }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </span>
  );
}

function BraceletPreview({ preset, className = "h-[154px] w-[206px]" }: { preset: StarterPreset; className?: string }) {
  const src = PRESET_PREVIEW_IMAGE_BY_ID[preset.id] ?? PRESET_PREVIEW_IMAGE_BY_ID.starlight;
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`${className} shrink-0`}
      aria-hidden
      initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.94, y: 10, rotate: -2 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={
        prefersReducedMotion
          ? undefined
          : { duration: 0.52, ease: ENTRANCE_EASE }
      }
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
        loading="lazy"
        decoding="async"
      />
    </motion.div>
  );
}

function BraceletTile({
  preset,
  onSelectPreset,
  className = "w-[clamp(210px,22vw,360px)]",
}: {
  preset: StarterPreset;
  onSelectPreset: (preset: StarterPreset) => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={`Remix ${preset.label}`}
      onClick={() => onSelectPreset(preset)}
      className={`group relative flex aspect-square ${className} items-center justify-center overflow-hidden bg-transparent`}
      style={{ cursor: REMIX_CURSOR }}
      initial={false}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.24, ease: ENTRANCE_EASE }}
    >
      <BraceletPreview preset={preset} className="h-[88%] w-[88%]" />
    </motion.button>
  );
}

function RailSet({
  presets,
  onSelectPreset,
  entranceDelay = 0,
  entranceFrom = "bottom",
}: {
  presets: StarterPreset[];
  onSelectPreset: (preset: StarterPreset) => void;
  entranceDelay?: number;
  entranceFrom?: "top" | "bottom";
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="flex shrink-0 flex-col items-center gap-[clamp(26px,4vh,48px)] pb-[clamp(26px,4vh,48px)]"
      initial={prefersReducedMotion ? undefined : "hidden"}
      animate={prefersReducedMotion ? undefined : "show"}
      variants={
        prefersReducedMotion
          ? undefined
          : {
              hidden: {},
              show: {
                transition: {
                  delayChildren: entranceDelay,
                  staggerChildren: 0.07,
                },
              },
            }
      }
    >
      {presets.map((preset) => (
        <motion.div
          key={preset.id}
          variants={
            prefersReducedMotion
              ? undefined
              : {
                  hidden: { opacity: 0, y: entranceFrom === "top" ? -16 : 16, scale: 0.97 },
                  show: { opacity: 1, y: 0, scale: 1 },
                }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : { duration: 0.48, ease: ENTRANCE_EASE }
          }
        >
          <BraceletTile preset={preset} onSelectPreset={onSelectPreset} />
        </motion.div>
      ))}
    </motion.div>
  );
}

function VerticalRail({
  presets,
  reverse = false,
  onSelectPreset,
  entranceDelay = 0,
}: {
  presets: StarterPreset[];
  reverse?: boolean;
  onSelectPreset: (preset: StarterPreset) => void;
  entranceDelay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="relative h-full overflow-y-hidden overflow-x-visible"
      initial={prefersReducedMotion ? undefined : { opacity: 0, x: reverse ? 22 : -22 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
      transition={
        prefersReducedMotion
          ? undefined
          : { duration: 0.62, ease: ENTRANCE_EASE, delay: entranceDelay }
      }
    >
      <motion.div
        className="flex w-full flex-col items-center"
        animate={
          prefersReducedMotion
            ? undefined
            : reverse
              ? { y: ["-50%", "0%"] }
              : { y: ["0%", "-50%"] }
        }
        transition={
          prefersReducedMotion
            ? undefined
            : { duration: reverse ? 34 : 38, ease: "linear", repeat: Infinity }
        }
      >
        <RailSet
          presets={presets}
          onSelectPreset={onSelectPreset}
          entranceDelay={entranceDelay + 0.1}
          entranceFrom={reverse ? "top" : "bottom"}
        />
        <RailSet
          presets={presets}
          onSelectPreset={onSelectPreset}
          entranceDelay={entranceDelay + 0.1}
          entranceFrom={reverse ? "top" : "bottom"}
        />
      </motion.div>
    </motion.div>
  );
}

export function KandiStarterLanding({
  presets,
  onStartBlank,
  onSelectPreset,
}: {
  presets: StarterPreset[];
  onStartBlank: () => void;
  onSelectPreset: (preset: StarterPreset) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const rightPresets = useMemo(() => [...presets].reverse(), [presets]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[9] overflow-hidden text-[var(--text-strong)]">
      <div className="absolute inset-0 bg-transparent" />
      <div className="pointer-events-auto absolute left-2 top-1/2 z-[10] hidden h-[calc(100vh+420px)] w-[clamp(210px,22vw,360px)] -translate-y-1/2 md:block lg:left-5 xl:left-10">
        <VerticalRail presets={presets} onSelectPreset={onSelectPreset} entranceDelay={0.08} />
      </div>
      <div className="pointer-events-auto absolute right-2 top-1/2 z-[10] hidden h-[calc(100vh+420px)] w-[clamp(210px,22vw,360px)] -translate-y-1/2 md:block lg:right-5 xl:right-10">
        <VerticalRail presets={rightPresets} reverse onSelectPreset={onSelectPreset} entranceDelay={0.14} />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="pointer-events-auto flex w-fit flex-col items-center justify-center gap-7"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.42, ease: ENTRANCE_EASE, delay: 0.16 }}
        >
          <h1
            className="select-none text-[clamp(5.2rem,12vw,15rem)] leading-none font-semibold tracking-[0.08em] text-[#101318]"
            style={{ fontFamily: "Avenir Next, Soehne, system-ui, sans-serif" }}
          >
            <MotionTextReveal text="PLUR" />
          </h1>
          <KandiButton
            variant="primary"
            size="xl"
            style={{ fontFamily: "Avenir Next, Soehne, system-ui, sans-serif" }}
            onClick={onStartBlank}
          >
            Let&apos;s get creating...
          </KandiButton>
        </motion.div>

        <motion.div
          className="pointer-events-auto absolute inset-x-0 bottom-6 flex justify-center gap-4 md:hidden"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.42, ease: ENTRANCE_EASE, delay: 0.2 }}
        >
          {presets.slice(0, 2).map((preset) => (
            <BraceletTile key={preset.id} preset={preset} onSelectPreset={onSelectPreset} className="w-[min(42vw,180px)]" />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
