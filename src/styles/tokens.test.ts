import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

const TOKENS_CSS = readFileSync(
  path.join(import.meta.dirname, "tokens.css"),
  "utf-8",
);
const MIN_TEXT_CONTRAST = 7;

function extractBlock(selector: RegExp): string {
  const match = selector.exec(TOKENS_CSS);
  if (!match) {
    throw new Error(`tokens.css: no block matching ${selector}`);
  }
  return match[0];
}

function extractColor(block: string, tokenName: string): string {
  const match = new RegExp(`--color-${tokenName}:\\s*(#[0-9a-fA-F]{6})`).exec(
    block,
  );
  if (!match?.[1]) {
    throw new Error(`tokens.css: no --color-${tokenName} in block`);
  }
  return match[1];
}

const THEME_BLOCKS = [
  ["light", extractBlock(/@theme\s*\{[^}]*\}/)],
  ["dark", extractBlock(/:root\[data-theme="dark"\]\s*\{[^}]*\}/)],
  [
    "high-contrast",
    extractBlock(/:root\[data-theme="high-contrast"\]\s*\{[^}]*\}/),
  ],
] as const;

describe("design tokens: text contrast", () => {
  it.each(
    THEME_BLOCKS,
  )("ink, ink-muted and pen on surface meet 7:1 in %s", (_theme, block) => {
    const surface = extractColor(block, "surface");
    for (const tokenName of ["ink", "ink-muted", "pen"]) {
      expect(
        contrastRatio(extractColor(block, tokenName), surface),
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });

  it.each(
    THEME_BLOCKS,
  )("danger and success text meet 7:1 on surface in %s", (_theme, block) => {
    const surface = extractColor(block, "surface");
    for (const tokenName of ["danger", "success"]) {
      expect(
        contrastRatio(extractColor(block, tokenName), surface),
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });

  // The highlighter mark is #FFD43B in every theme (only set once, in @theme), so text
  // painted on it is always dark ink (per the Watch mockups), never the current theme's
  // --color-ink, which goes near-white in dark mode.
  it("dark ink on the highlighter mark meets 7:1", () => {
    const [, lightBlock] = THEME_BLOCKS[0];
    const highlighter = extractColor(lightBlock, "highlighter");
    expect(contrastRatio("#0f1c3f", highlighter)).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
  });
});
