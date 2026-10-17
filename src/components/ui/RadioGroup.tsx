"use client";

import type { ReactNode } from "react";
import {
  RadioGroup as AriaRadioGroup,
  type RadioGroupProps as AriaRadioGroupProps,
  Label,
  Radio,
  type RadioProps,
} from "react-aria-components";

export interface RadioGroupProps extends Omit<AriaRadioGroupProps, "children"> {
  label: string;
  children: ReactNode;
}

/** Two options render as radios, never a select — matches the Narration language choice. */
export function RadioGroup({
  label,
  children,
  className,
  ...props
}: RadioGroupProps) {
  return (
    <AriaRadioGroup
      {...props}
      className={`flex flex-col gap-2.5 ${typeof className === "string" ? className : ""}`}
    >
      <Label className="font-bold">{label}</Label>
      <div className="flex flex-wrap gap-3">{children}</div>
    </AriaRadioGroup>
  );
}

export function RadioItem({ children, className, ...props }: RadioProps) {
  return (
    <Radio
      {...props}
      className={`inline-flex min-h-13 cursor-pointer items-center gap-3 rounded-control border border-ink/35 bg-surface px-4 data-[selected]:border-2 data-[selected]:border-pen data-[selected]:bg-surface-raised ${typeof className === "string" ? className : ""}`}
    >
      {children}
    </Radio>
  );
}
