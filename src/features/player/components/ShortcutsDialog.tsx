"use client";

import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTrigger } from "@/components/ui/Dialog";

interface ShortcutsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const SHORTCUTS = [
  { keys: "Space / K", actionKey: "playPause" },
  { keys: "R", actionKey: "repeat" },
  { keys: "N / P", actionKey: "nextPrevious" },
  { keys: "J / L", actionKey: "seekBackForward" },
  { keys: "S", actionKey: "skip" },
  { keys: "T", actionKey: "announceTime" },
  { keys: "Escape", actionKey: "closeDialog" },
] as const;

/** Opened by the `?` hotkey (controlled via `isOpen`) or its own visible button. */
export function ShortcutsDialog({
  isOpen,
  onOpenChange,
}: ShortcutsDialogProps) {
  const t = useTranslations("watch.shortcuts");

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button variant="secondary">{t("openButton")}</Button>
      <Dialog title={t("title")}>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          {SHORTCUTS.map(({ keys, actionKey }) => (
            <Fragment key={actionKey}>
              <dt className="m-0 font-bold tabular-nums">{keys}</dt>
              <dd className="m-0">{t(actionKey)}</dd>
            </Fragment>
          ))}
        </dl>
      </Dialog>
    </DialogTrigger>
  );
}
