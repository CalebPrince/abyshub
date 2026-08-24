"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutDashboardIcon, MenuIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AccountMenu } from "@/components/store/account-menu";
import { CartButton } from "@/components/store/cart-button";
import { HeaderNav, HeaderSearch } from "@/components/store/header-nav";
import { Logo } from "@/components/store/logo";
import { ThemeToggle } from "@/components/store/theme-toggle";

const ticker = [
  "Genuine Tupperware",
  "Lifetime seal warranty",
  "Nationwide delivery",
  "Pay by card, WhatsApp or on delivery",
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const closeMenu = React.useCallback(() => setMobileOpen(false), []);

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Scrolling claim strip — the shop's first piece of voice. */}
      <div className="bg-primary text-primary-foreground overflow-hidden py-2">
        <div className="animate-marquee flex w-max gap-10 pr-10">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex shrink-0 gap-10"
              aria-hidden={copy === 1}
            >
              {ticker.map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-10 text-[11px] font-semibold tracking-[0.18em] whitespace-nowrap uppercase"
                >
                  {item}
                  <span className="bg-primary-foreground/60 size-1.5 rounded-full" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-background/95 border-foreground/12 supports-[backdrop-filter]:bg-background/80 border-b backdrop-blur">
        <div className="mx-auto flex h-18 max-w-[1400px] items-center gap-4 px-4 lg:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader className="border-foreground/12 border-b">
                <SheetTitle asChild>
                  <Logo />
                </SheetTitle>
              </SheetHeader>

              <React.Suspense fallback={<div className="h-11 px-4" />}>
                <HeaderSearch variant="mobile" onSubmitted={closeMenu} />
              </React.Suspense>
              <React.Suspense fallback={null}>
                <HeaderNav variant="mobile" onNavigate={closeMenu} />
              </React.Suspense>
            </SheetContent>
          </Sheet>

          <Logo />

          <React.Suspense fallback={<div className="hidden lg:block" />}>
            <HeaderNav variant="desktop" />
          </React.Suspense>

          <div className="ml-auto flex items-center gap-0.5">
            <React.Suspense fallback={null}>
              <HeaderSearch variant="desktop" onSubmitted={closeMenu} />
            </React.Suspense>

            <Button
              asChild
              variant="ghost"
              size="icon"
              className="xl:hidden"
              aria-label="Search products"
            >
              <Link href="/products">
                <SearchIcon className="size-5" />
              </Link>
            </Button>
            {/* Sits before the theme and basket icons. Shown to everyone —
                /admin is guarded server-side, so the link reveals a locked
                door rather than what is behind it. */}
            <Button asChild variant="ghost" size="icon" aria-label="Back office">
              <Link href="/admin">
                <LayoutDashboardIcon className="size-5" />
              </Link>
            </Button>
            <AccountMenu />
            <ThemeToggle />
            <CartButton />
          </div>
        </div>
      </div>
    </header>
  );
}
