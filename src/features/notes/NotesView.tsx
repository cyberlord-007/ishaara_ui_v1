"use client";

import DOMPurify from "dompurify";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError, toUserMessage } from "@/lib/api/errors";
import { useNotes, useNotesMarkdown } from "@/lib/api/hooks";
import type { VideoKey } from "@/lib/api/schemas";
import { linkifyBoardMarkers } from "@/lib/notesHtml";

interface NotesViewProps {
  videoKey: VideoKey;
  title: string;
}

function downloadMarkdown(markdown: string, title: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Sanitised HTML notes, with `[Board, mm:ss]` markers linked back to Watch. */
export function NotesView({ videoKey, title }: NotesViewProps) {
  const t = useTranslations("notes");
  const notesQuery = useNotes(videoKey, true);
  const markdownQuery = useNotesMarkdown(videoKey);

  const sanitizedHtml = useMemo(() => {
    if (!notesQuery.data) {
      return null;
    }
    return linkifyBoardMarkers(DOMPurify.sanitize(notesQuery.data), videoKey);
  }, [notesQuery.data, videoKey]);

  async function handleDownload() {
    const result = await markdownQuery.refetch();
    if (result.data) {
      downloadMarkdown(result.data, title);
    }
  }

  if (notesQuery.isError) {
    const { message } = toUserMessage(
      notesQuery.error instanceof ApiError
        ? notesQuery.error.code
        : "network_error",
      notesQuery.error instanceof ApiError
        ? notesQuery.error.detail
        : undefined,
    );
    return (
      <p role="alert" className="m-0 text-danger">
        {message}
      </p>
    );
  }

  if (!sanitizedHtml) {
    return <output className="block text-ink-muted">{t("loading")}</output>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3 print:hidden">
        <Button
          variant="secondary"
          onPress={handleDownload}
          isDisabled={markdownQuery.isFetching}
        >
          {t("download")}
        </Button>
        <Button variant="secondary" onPress={() => window.print()}>
          {t("print")}
        </Button>
      </div>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with DOMPurify above, then linkified with our own deterministic hrefs. */}
      <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
    </div>
  );
}
