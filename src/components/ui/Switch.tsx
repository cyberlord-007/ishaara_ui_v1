"use client";

import type { ReactNode } from "react";
import {
  Switch as AriaSwitch,
  type SwitchProps as AriaSwitchProps,
} from "react-aria-components";

export interface SwitchProps extends Omit<AriaSwitchProps, "children"> {
  children: ReactNode;
}

export function Switch({ children, className, ...props }: SwitchProps) {
  return (
    <AriaSwitch
      {...props}
      className={`group flex min-h-13 cursor-pointer items-center justify-between gap-4 ${typeof className === "string" ? className : ""}`}
    >
      <span className="flex flex-col font-sans">{children}</span>
      <span className="relative inline-flex h-8.5 w-15 shrink-0 rounded-full bg-ink/35 transition-colors group-data-[selected]:bg-pen">
        <span className="absolute top-1 left-1 size-6.5 rounded-full bg-surface transition-transform group-data-[selected]:translate-x-6.5" />
      </span>
    </AriaSwitch>
  );
}
