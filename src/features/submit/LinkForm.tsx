"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, type FieldErrors, useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { toastQueue } from "@/components/ui/Toast";
import { LanguagePicker } from "@/features/submit/LanguagePicker";
import { useAnnounce } from "@/lib/a11y/useAnnounce";
import { ApiError, toUserMessage } from "@/lib/api/errors";
import { useSubmitVideo } from "@/lib/api/hooks";
import { SubmitVideoRequest } from "@/lib/api/schemas";
import { usePreferencesStore } from "@/stores/preferencesStore";

/** The YouTube link field, narration language choice, and submit button on Home. */
export function LinkForm() {
  const t = useTranslations("home");
  const announce = useAnnounce();
  const router = useRouter();
  const defaultLanguage = usePreferencesStore(
    (state) => state.narrationLanguage,
  );
  const submitVideo = useSubmitVideo();
  const [submitError, setSubmitError] = useState<{
    message: string;
    nextStep: string;
  } | null>(null);

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<SubmitVideoRequest>({
    resolver: zodResolver(SubmitVideoRequest),
    defaultValues: { youtube_url: "", narration_language: defaultLanguage },
  });

  /** Focus moves to the first invalid field, per the plan's Forms requirements. */
  function onInvalid(formErrors: FieldErrors<SubmitVideoRequest>) {
    if (formErrors.youtube_url) {
      toastQueue.add({ title: toUserMessage("invalid_youtube_url").message });
      setFocus("youtube_url");
    }
  }

  async function onSubmit(values: SubmitVideoRequest) {
    setSubmitError(null);
    try {
      const video = await submitVideo.mutateAsync(values);
      const destination = video.status === "ready" ? "/watch" : "/processing";
      router.push(`${destination}?v=${video.video_key}` as Route);
    } catch (error) {
      const { message, nextStep } =
        error instanceof ApiError
          ? toUserMessage(error.code, error.detail)
          : toUserMessage("unknown_error");
      setSubmitError({ message, nextStep });
      announce(message, "assertive");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      noValidate
      className="flex flex-col gap-7"
    >
      <Controller
        control={control}
        name="youtube_url"
        render={({ field }) => (
          <TextField
            ref={field.ref}
            label={t("linkLabel")}
            description={t("linkHint")}
            type="text"
            inputMode="url"
            autoComplete="off"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            isInvalid={Boolean(errors.youtube_url)}
            errorMessage={
              errors.youtube_url
                ? toUserMessage("invalid_youtube_url").message
                : undefined
            }
          />
        )}
      />

      <Controller
        control={control}
        name="narration_language"
        render={({ field }) => (
          <LanguagePicker value={field.value} onChange={field.onChange} />
        )}
      />

      {submitError ? (
        <p
          role="alert"
          className="m-0 flex flex-col gap-1 text-base text-danger"
        >
          <span>{submitError.message}</span>
          <span>{submitError.nextStep}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" isDisabled={submitVideo.isPending}>
          {t("submit")}
        </Button>
        <p className="m-0 text-base text-ink-muted">{t("submitHint")}</p>
      </div>
    </form>
  );
}
