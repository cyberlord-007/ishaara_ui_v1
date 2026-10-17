"use client";

import {
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  FieldError,
  Input,
  Label,
  Text,
} from "react-aria-components";

export interface TextFieldProps extends AriaTextFieldProps {
  label: string;
  description?: string | undefined;
  errorMessage?: string | undefined;
  inputClassName?: string | undefined;
}

/** Label, description and error slot wired by React Aria; placeholders are never used as labels. */
export function TextField({
  label,
  description,
  errorMessage,
  inputClassName,
  className,
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField
      {...props}
      className={`flex flex-col gap-2 ${typeof className === "string" ? className : ""}`}
    >
      <Label className="font-bold">{label}</Label>
      {description ? (
        <Text slot="description" className="m-0 text-base text-ink-muted">
          {description}
        </Text>
      ) : null}
      <Input
        className={`box-border min-h-14 w-full rounded-control border-2 border-pen bg-surface px-4 font-sans text-xl text-ink data-[invalid]:border-danger ${inputClassName ?? ""}`}
      />
      <FieldError className="m-0 flex items-start gap-2 text-base text-danger">
        {errorMessage}
      </FieldError>
    </AriaTextField>
  );
}
