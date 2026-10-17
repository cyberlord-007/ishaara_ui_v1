"use client";

import type { ReactNode } from "react";
import {
  Dialog as AriaDialog,
  type DialogProps as AriaDialogProps,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from "react-aria-components";

export { DialogTrigger };

export interface DialogProps extends Omit<AriaDialogProps, "children"> {
  title: string;
  children: ReactNode;
}

/** Focus trap and restore are handled by React Aria; wrap with `DialogTrigger`. */
export function Dialog({ title, children, ...props }: DialogProps) {
  return (
    <ModalOverlay
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
    >
      <Modal className="w-full max-w-lg rounded-panel bg-surface p-6">
        <AriaDialog {...props} className="flex flex-col gap-4 outline-none">
          <Heading slot="title" className="m-0 text-section font-bold">
            {title}
          </Heading>
          {children}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
