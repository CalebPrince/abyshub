"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MenuIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CartButton } from "@/components/store/cart-button";
import { Logo } from "@/components/store/logo";
import { ThemeToggle } from "@/components/store/theme-toggle";
import { categories } from "@/lib/products";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/products", label: "Everything" },
  ...categories.map((category) => ({
    href: `/products?category=${category.slug}`,
    label: category.name,
  })),
];

const ticker = [
  "Genuine Tupperware",
  "Lifetime seal warranty",
  "Nationwide delivery",
  "Pay by card, WhatsApp or on delivery",
];

export function SiteHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const activeQuery = searchParams.get("q") ?? "";
  const activeCategory = searchParams.get("category");

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q");
    const trimmed = typeof query === "string" ? query.trim() : "";

    router.push(
      trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : "/products"
    );
    setMobileOpen(false);
  }

  function isActive(href: string) {
    const [path, search] = href.split("?");
    if (pathname !== path) return false;
    if (!search) return !activeCategory;
    return search === `category=${activeCategory}`;
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Scrolling claim strip — the shop's first piece of voice. */}
      <div className="bg-foreground text-background overflow-hidden py-2">
        <div className="animate-marquee flex w-max gap-10 pr-10">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 gap-10" aria-hidden={copy === 1}>
              {ticker.map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-10 text-[11px] font-semibold tracking-[0.18em] whitespace-nowrap uppercase"
                >
                  {item}
                  <span className="bg-primary size-1.5" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-background/95 border-foreground/12 border-b backdrop-blur supports-[backdrop-filter]:bg-background/80">
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

              <form onSubmit={handleSearch} role="search" className="px-4">
                <Input
                  key={activeQuery}
                  type="search"
                  name="q"
                  defaultValue={activeQuery}
                  placeholder="Search the shop"
                  aria-label="Search products"
                />
              </form>

              <nav className="flex flex-col px-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "font-display border-foreground/10 border-b py-3.5 text-lg font-bold tracking-tight uppercase transition-colors",
                      isActive(link.href)
                        ? "text-primary"
                        : "hover:text-primary"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Logo />

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative py-1 text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors",
                  isActive(link.href)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="bg-primary absolute -bottom-0.5 left-0 h-[3px] w-full" />
                )}
              </Link>
            ))}
          </nav>

          <form
            onSubmit={handleSearch}
            role="search"
            className="ml-auto hidden max-w-[240px] flex-1 xl:block"
          >
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                key={activeQuery}
                type="search"
                name="q"
                defaultValue={activeQuery}
                placeholder="Search"
                aria-label="Search products"
                className="h-10 pl-9"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-0.5 xl:ml-0">
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
            <ThemeToggle />
            <CartButton />
          </div>
        </div>
      </div>
    </header>
  );
}
