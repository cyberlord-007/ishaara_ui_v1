"use client";

import { useSelector } from "@xstate/react";
import { useTranslations } from "next-intl";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  TextField as AriaTextField,
  Label,
  TextArea,
} from "react-aria-components";
import { Button } from "@/components/ui/Button";
import type { PlayerActorRef } from "@/features/player/components/PlayerShell";
import { useAnnounce } from "@/lib/a11y/useAnnounce";
import { ApiError, toUserMessage } from "@/lib/api/errors";
import { useAskQuestion } from "@/lib/api/hooks";
import type { VideoKey } from "@/lib/api/schemas";
import { AnswerCard } from "./AnswerCard";

const MAX_LENGTH = 500;
const ANNOUNCE_THRESHOLDS = [50, 0] as const;

interface AskPanelProps {
  videoKey: VideoKey;
  actorRef: PlayerActorRef;
}

/** "Ask a question": the always-visible form, or the answer once one arrives. */
export function AskPanel({ videoKey, actorRef }: AskPanelProps) {
  const t = useTranslations("ask");
  const announce = useAnnounce();
  const askQuestion = useAskQuestion(videoKey);

  const [question, setQuestion] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const announcedThresholdsRef = useRef<Set<number>>(new Set());
  const wasAnsweringRef = useRef(false);

  const isAsking = useSelector(actorRef, (snapshot) =>
    snapshot.matches("asking"),
  );
  const isAnswering = useSelector(actorRef, (snapshot) =>
    snapshot.matches({ asking: "answering" }),
  );

  useEffect(() => {
    if (isAsking) {
      textareaRef.current?.focus();
    }
  }, [isAsking]);

  useEffect(() => {
    if (wasAnsweringRef.current && !isAnswering) {
      submitButtonRef.current?.focus();
      setQuestion("");
      askQuestion.reset();
      announcedThresholdsRef.current.clear();
    }
    wasAnsweringRef.current = isAnswering;
  }, [isAnswering, askQuestion]);

  function handleQuestionChange(value: string) {
    setQuestion(value);
    const remaining = MAX_LENGTH - value.length;
    for (const threshold of ANNOUNCE_THRESHOLDS) {
      if (
        remaining === threshold &&
        !announcedThresholdsRef.current.has(threshold)
      ) {
        announcedThresholdsRef.current.add(threshold);
        announce(t("charactersRemaining", { count: remaining }), "polite");
      } else if (remaining > threshold) {
        announcedThresholdsRef.current.delete(threshold);
      }
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    actorRef.send({ type: "ASK" });
    askQuestion.mutate(
      {
        question,
        at_seconds: actorRef.getSnapshot().context.currentSeconds,
      },
      {
        onSuccess: (answer) => {
          actorRef.send({ type: "ANSWER_RECEIVED", answer });
        },
      },
    );
  }

  if (isAnswering) {
    return <AnswerCard actorRef={actorRef} />;
  }

  const errorMessage = askQuestion.isError
    ? toUserMessage(
        askQuestion.error instanceof ApiError
          ? askQuestion.error.code
          : "network_error",
        askQuestion.error instanceof ApiError
          ? askQuestion.error.detail
          : undefined,
      )
    : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <AriaTextField
        value={question}
        onChange={handleQuestionChange}
        className="flex flex-col gap-2"
      >
        <Label className="font-bold">{t("questionLabel")}</Label>
        <TextArea
          ref={textareaRef}
          maxLength={MAX_LENGTH}
          rows={3}
          onFocus={() => actorRef.send({ type: "ASK" })}
          className="box-border w-full rounded-control border-2 border-pen bg-surface px-4 py-3 font-sans text-xl text-ink"
        />
      </AriaTextField>
      {errorMessage ? (
        <p role="alert" className="m-0 text-danger">
          {errorMessage.message} {errorMessage.nextStep}
        </p>
      ) : null}
      <Button
        ref={submitButtonRef}
        type="submit"
        isDisabled={askQuestion.isPending || question.trim().length === 0}
        className="self-start"
      >
        {askQuestion.isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
