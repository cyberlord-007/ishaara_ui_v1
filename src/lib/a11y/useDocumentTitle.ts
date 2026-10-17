"use client";

import { useEffect } from "react";

/**
 * Sets `document.title` to `"<pageTitle> · Ishaara"` for as long as the
 * calling component is mounted, re-applying it if `pageTitle` changes.
 * @param pageTitle the current page's name, e.g. "Sign in"
 */
export function useDocumentTitle(pageTitle: string): void {
  useEffect(() => {
    document.title = `${pageTitle} · Ishaara`;
  }, [pageTitle]);
}
