import type { ComponentProps } from "react";

export const kandiButtonBaseClassName =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-[0.9rem] py-2.5 text-[0.8125rem] font-semibold leading-snug tracking-[0.01em] backdrop-blur-md transition duration-150 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 hover:border-[#ffffff3a] hover:shadow-[0_8px_16px_rgba(0,0,0,0.28)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:transform-none";

const variantClassName = {
  secondary:
    "border-transparent bg-transparent text-[#d9dee8] hover:bg-[#ffffff08] hover:border-transparent hover:shadow-none active:bg-[#ffffff0d]",
  primary: "border-[#ffffff4a] bg-[#ffffffe8] text-[#101318] hover:border-[#ffffff66] hover:bg-[#ffffff]",
  compact:
    "min-h-9 min-w-9 shrink-0 border-[#ffffff1a] bg-[#1c1f2799] px-2 py-2 text-[#d9dee8] hover:bg-[#242833bf]",
  toggleOn: "border-[#4d62e8] bg-[#2f385a99] text-[#eaefff]",
  toggleOff: "border-[#ffffff12] bg-[#181b2299] text-[#c8ced8] hover:bg-[#1f222bbf]",
  shape: "border-[#ffffff12] bg-[#1a1d2499] capitalize text-[#d8dde6] hover:bg-[#22262fbf]",
} as const;

export type KandiButtonVariant = keyof typeof variantClassName;

export function KandiButton({
  variant,
  className,
  ...props
}: ComponentProps<"button"> & { variant: KandiButtonVariant }) {
  const extra = className ? ` ${className}` : "";
  return (
    <button
      type="button"
      className={`${kandiButtonBaseClassName} ${variantClassName[variant]}${extra}`}
      {...props}
    />
  );
}

export const kandiColorSwatchButtonClassName =
  "h-[1.8rem] w-full cursor-pointer rounded-[0.45rem] border border-[#ffffff2b] transition duration-150 hover:-translate-y-px hover:border-[#ffffff55] hover:shadow-[0_10px_20px_rgba(0,0,0,0.34)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d77ff99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:transform-none";

const kandiColorSwatchSelectedClassName =
  "z-[1] scale-[1.06] border-[#d8e2ff] shadow-[0_0_0_2px_#1a1c21,0_0_0_4px_rgba(93,119,255,0.75)]";

export function KandiColorSwatchButton({
  swatchClassName,
  className,
  selected,
  ...props
}: ComponentProps<"button"> & { swatchClassName: string; selected?: boolean }) {
  const extra = className ? ` ${className}` : "";
  const state = selected ? ` ${kandiColorSwatchSelectedClassName}` : "";
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`${swatchClassName} ${kandiColorSwatchButtonClassName}${state}${extra}`}
      {...props}
    />
  );
}
