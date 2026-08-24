import * as React from "react";

import { CartProvider } from "@/components/store/cart-provider";
import { CartSheet } from "@/components/store/cart-sheet";
import { ChatWidget } from "@/components/store/chat/chat-widget";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { SplashScreen } from "@/components/store/splash-screen";
import { SplashScript } from "@/components/store/splash-script";
import { WelcomeModal } from "@/components/store/welcome-modal";

/**
 * Everything that makes a page feel like the shop: header, basket, chat, the
 * opening splash.
 *
 * Extracted from the root layout when the admin arrived, because none of it
 * belongs around a CRM screen. It lives in a component rather than only in the
 * (storefront) layout so `not-found.tsx` — which Next renders against the root
 * layout, outside any route group — can still be wrapped in the shop.
 */
export function StorefrontShell({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {/* First, so the flag lands on <html> before the splash is parsed. */}
      <SplashScript />
      <SplashScreen />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CartSheet />
      <ChatWidget />
      <WelcomeModal />
    </CartProvider>
  );
}
