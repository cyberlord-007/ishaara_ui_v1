"use client";

import {
  Slider as AriaSlider,
  type SliderProps as AriaSliderProps,
  Label,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "react-aria-components";

export interface SliderProps extends AriaSliderProps {
  label: string;
}

/** Announces its value via `getValueLabel`/`SliderOutput`, e.g. "1.25 times". */
export function Slider({ label, className, ...props }: SliderProps) {
  return (
    <AriaSlider
      {...props}
      className={`flex flex-col gap-2 ${typeof className === "string" ? className : ""}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <Label className="font-bold">{label}</Label>
        <SliderOutput className="font-bold tabular-nums" />
      </div>
      <SliderTrack className="relative flex h-11 items-center">
        {({ state }) => (
          <>
            <div className="absolute inset-x-0 h-2 rounded-full border border-ink/35 bg-surface-raised" />
            <div
              className="absolute h-2 rounded-full bg-pen"
              style={{ width: `${state.getThumbPercent(0) * 100}%` }}
            />
            <SliderThumb className="size-7 rounded-full border-2 border-surface bg-pen shadow" />
          </>
        )}
      </SliderTrack>
    </AriaSlider>
  );
}
