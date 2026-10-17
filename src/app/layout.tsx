import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Mukta } from "next/font/google";
import { AppFooter } from "@/components/AppFooter";
import { Header } from "@/components/Header";
import { SkipLink } from "@/components/SkipLink";
import { Providers } from "@/providers/Providers";
import "@/styles/globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

const mukta = Mukta({
  subsets: ["devanagari", "latin"],
  weight: ["400", "700"],
  variable: "--font-mukta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ishaara",
  description: "Spoken board descriptions for YouTube lectures.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} ${mukta.variable} h-full`}>
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) inject
          attributes like cz-shortcut-listen onto <body> before React hydrates. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Providers>
          <SkipLink />
          <Header />
          <main id="main" className="flex flex-1 flex-col">
            {children}
          </main>
          <AppFooter />
        </Providers>
      </body>
    </html>
  );
}
