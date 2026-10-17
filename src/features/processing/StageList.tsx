import { useTranslations } from "next-intl";
import type { PipelineStage, VideoStatus } from "@/lib/api/schemas";

const STAGE_ORDER: readonly PipelineStage[] = [
  "resolving",
  "analyzing",
  "writing",
  "voicing",
  "saving",
];

export const STAGE_LABEL_KEYS: Record<PipelineStage, string> = {
  resolving: "stageResolving",
  analyzing: "stageAnalyzing",
  writing: "stageWriting",
  voicing: "stageVoicing",
  saving: "stageSaving",
};

type StageState = "done" | "inProgress" | "waiting";

function stateFor(
  stage: PipelineStage,
  currentStage: PipelineStage | null,
  status: VideoStatus,
): StageState {
  if (status === "ready") {
    return "done";
  }
  if (!currentStage) {
    return "waiting";
  }
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const stageIndex = STAGE_ORDER.indexOf(stage);
  if (stageIndex < currentIndex) {
    return "done";
  }
  return stageIndex === currentIndex ? "inProgress" : "waiting";
}

interface StageListProps {
  status: VideoStatus;
  currentStage: PipelineStage | null;
}

/** The five pipeline stages, each marked Done/In progress/Waiting with an icon and a word. */
export function StageList({ status, currentStage }: StageListProps) {
  const t = useTranslations("processing");

  return (
    <section aria-labelledby="steps-heading" className="flex flex-col gap-3">
      <h2 id="steps-heading" className="m-0 text-section font-bold">
        {t("stagesHeading")}
      </h2>
      <ol
        className="m-0 flex flex-col overflow-hidden rounded-panel border border-ink/20 p-0"
        style={{ listStyle: "none" }}
      >
        {STAGE_ORDER.map((stage) => {
          const state = stateFor(stage, currentStage, status);
          return (
            <li
              key={stage}
              aria-current={state === "inProgress" ? "step" : undefined}
              className="flex items-center gap-4 border-b border-ink/20 px-5 py-4 last:border-b-0"
            >
              <StageIcon state={state} />
              <span
                className={
                  state === "inProgress" ? "flex-1 font-bold" : "flex-1"
                }
              >
                {t(STAGE_LABEL_KEYS[stage])}
              </span>
              <span
                className={
                  state === "done"
                    ? "font-bold text-success"
                    : state === "inProgress"
                      ? "font-bold"
                      : "text-ink-muted"
                }
              >
                {t(
                  state === "done"
                    ? "stageDone"
                    : state === "inProgress"
                      ? "stageInProgress"
                      : "stageWaiting",
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StageIcon({ state }: { state: StageState }) {
  if (state === "done") {
    return (
      <svg aria-hidden="true" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="12" fill="var(--color-success)" />
        <path
          d="M8 14.5 L12 18.5 L20 10"
          fill="none"
          stroke="var(--color-surface)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (state === "inProgress") {
    return (
      <svg aria-hidden="true" width="28" height="28" viewBox="0 0 28 28">
        <circle
          cx="14"
          cy="14"
          r="11"
          fill="var(--color-highlighter)"
          stroke="#0f1c3f"
          strokeWidth="2"
        />
        <circle cx="14" cy="14" r="4" fill="#0f1c3f" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" width="28" height="28" viewBox="0 0 28 28">
      <circle
        cx="14"
        cy="14"
        r="11"
        fill="none"
        stroke="var(--color-ink-muted)"
        strokeWidth="2"
      />
    </svg>
  );
}
