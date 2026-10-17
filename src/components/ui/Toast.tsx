"use client";

import {
  UNSTABLE_Toast as AriaToast,
  Text,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastRegion as ToastRegion,
} from "react-aria-components";

export interface ToastContent {
  title: string;
}

/**
 * Non-blocking confirmations only — an error must also appear somewhere
 * else on the page (an inline error block or the assertive live region),
 * never only here.
 */
export const toastQueue = new ToastQueue<ToastContent>({ maxVisibleToasts: 3 });

/** Mounted once near the root; every `toastQueue.add()` call renders here. */
export function ToastRegionRoot() {
  return (
    <ToastRegion
      queue={toastQueue}
      className="fixed right-6 bottom-6 z-50 flex flex-col gap-3"
    >
      {({ toast }) => (
        <AriaToast
          toast={toast}
          className="flex items-center gap-3 rounded-control bg-ink px-5 py-4 text-surface shadow-lg"
        >
          <Text slot="title">{toast.content.title}</Text>
        </AriaToast>
      )}
    </ToastRegion>
  );
}
