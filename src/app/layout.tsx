import * as React from "react";
import type { Metadata } from "next";
import { Archivo, DM_Sans, Geist_Mono } from "next/font/google";

import { CartProvider } from "@/components/store/cart-provider";
import { CartSheet } from "@/components/store/cart-sheet";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { ThemeProvider } from "@/components/store/theme-provider";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
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
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CartProvider>
            <React.Suspense fallback={<div className="h-[104px] border-b" />}>
              <SiteHeader />
            </React.Suspense>
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <CartSheet />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
