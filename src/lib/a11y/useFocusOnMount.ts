"use client";

import { useEffect, useRef } from "react";

/**
 * Moves focus to the returned ref's element once, when the component mounts.
 * Next.js remounts a page's components on every client-side navigation, so
 * attaching this to a page's `h1` satisfies "focus moves to the page h1 on
 * route change" without any router-level wiring.
 * @returns a ref to attach to the focusable element (give it `tabIndex={-1}`)
 */
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return ref;
}
