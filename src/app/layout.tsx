import * as React from "react";
import type { Metadata } from "next";
import { Archivo, DM_Sans, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/store/theme-provider";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

// Archivo carries the headings — condensed, heavy, poster-like.
const display = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Via SITE_URL rather than a second raw read: a blank NEXT_PUBLIC_SITE_URL
  // reached `new URL("")` here and failed the production build outright.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Abys Hub — Genuine Tupperware & home goods",
    template: "%s | Abys Hub",
  },
  description:
    "Genuine Tupperware and Abys Home goods — airtight food storage, kitchen prep, lunch sets and serveware. Order by card, on WhatsApp, or ask us for a quote.",
  openGraph: {
    title: "Abys Hub",
    description: "Genuine Tupperware and home goods. Buy it once, keep it for years.",
    siteName: "Abys Hub",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Only the document shell lives here now. The shop's header, basket and
          splash moved into the (storefront) group so the admin can render
          without them — see components/store/storefront-shell.tsx. */}
      <body className="flex min-h-full flex-col">
        {/* <Reveal> hides content until its IntersectionObserver fires, which
            never happens without JavaScript — this is the escape hatch. */}
        <noscript>
          <style>{"[data-reveal] { opacity: 1 !important; transform: none !important; }"}</style>
        </noscript>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
