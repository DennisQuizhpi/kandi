import type { ComponentProps } from "react";
import { kandiTypeClass } from "@/lib/kandi/typography";

export const kandiButtonBaseClassName =
  `inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 ${kandiTypeClass.title} backdrop-blur-md transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in oklab, var(--accent) 72%, transparent)] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:transform-none`;

const variantClassName = {
  secondary:
    "border-transparent bg-transparent text-[var(--text-strong)] hover:bg-[var(--surface-1)] hover:border-transparent active:bg-[var(--surface-2)]",
  primary:
    "border-transparent bg-[var(--accent)] text-[var(--accent-ink)] hover:border-transparent hover:bg-[color-mix(in_oklab,var(--accent)_78%,white)]",
  compact:
    "min-h-9 min-w-9 shrink-0 border-[var(--border-soft)] bg-[var(--surface-1)] px-2 py-2 text-[var(--text-strong)] hover:bg-[var(--surface-2)]",
  toggleOn:
    "border-transparent bg-[var(--elevated-surface-bg)] text-[var(--text-strong)] hover:!border-transparent hover:bg-[var(--elevated-surface-bg)]",
  toggleOff:
    "border-transparent bg-transparent text-[var(--text-strong)] hover:!border-transparent hover:bg-[var(--surface-2)] hover:text-[var(--text-strong)]",
  shape: "border-[var(--border-soft)] bg-[var(--surface-1)] capitalize text-[var(--text-strong)] hover:bg-[var(--surface-2)]",
} as const;

export type KandiButtonVariant = keyof typeof variantClassName;
const sizeClassName = {
  md: "px-3 py-2 text-sm",
  xl: "h-14 rounded-xl px-7 !text-md leading-7 font-semibold",
} as const;
export type KandiButtonSize = keyof typeof sizeClassName;

export function KandiButton({
  variant,
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant: KandiButtonVariant; size?: KandiButtonSize }) {
  const extra = className ? ` ${className}` : "";
  return (
    <button
      type="button"
      className={`${kandiButtonBaseClassName} ${sizeClassName[size]} ${variantClassName[variant]}${extra}`}
      {...props}
    />
  );
}

export const kandiColorSwatchButtonClassName =
  "h-8 w-full cursor-pointer rounded-lg border border-[var(--border-soft)] transition duration-150 hover:border-[var(--border-strong)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in oklab, var(--accent) 72%, transparent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:transform-none";

const kandiColorSwatchSelectedClassName =
  "z-[1] scale-[1.03] border-[color-mix(in oklab, var(--accent) 28%, white)] shadow-[0_0_0_2px_var(--elevated-surface-bg),0_0_0_4px_color-mix(in_oklab,var(--accent)_64%,transparent)]";

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
