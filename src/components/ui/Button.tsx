"use client";

import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components";

type Variant = "primary" | "secondary" | "quiet";

export interface ButtonProps extends AriaButtonProps {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "min-h-14 rounded-control border-0 bg-pen px-7 font-bold text-white",
  secondary:
    "min-h-14 rounded-control border border-ink/35 bg-surface px-5 font-bold text-ink",
  quiet:
    "min-h-11 border-0 bg-transparent px-3 font-bold text-pen underline underline-offset-4",
};

/** Always a text label; put decorative icons inside `children` with `aria-hidden`. */
export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex cursor-pointer items-center justify-center gap-2 font-sans text-lg";
  return (
    <AriaButton
      {...props}
      className={`${base} ${VARIANT_CLASSES[variant]} ${typeof className === "string" ? className : ""}`}
    />
  );
}
