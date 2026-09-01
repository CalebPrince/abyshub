"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
};

/**
 * The shop is organised by the ranges it carries, so the menu is written out
 * rather than generated from the catalogue's shelves: a range keeps its place
 * in the header whether or not there is stock against it yet.
 */
const NAV: NavItem[] = [
  { href: "/", label: "Home" },
  {
    href: "/products?brand=Tupperware",
    label: "Tupperware",
    children: [
      { href: "/products?brand=Tupperware", label: "Shop" },
      { href: "/offers", label: "Monthly Offers" },
      { href: "/products?sale=1", label: "Discounted Items" },
      { href: "/sales-agent", label: "Become a Sales Agent" },
      { href: "/media", label: "Media" },
    ],
  },
  { href: "/products?brand=Oriflame", label: "Oriflame" },
  { href: "/jibu-water", label: "JIBU Water" },
  { href: "/jbco", label: "JBCO" },
  { href: "/contact", label: "Contact Us" },
];

/** The params that narrow the shop, so a bare /products is only "active" when none are set. */
const FILTER_PARAMS = ["category", "brand", "sale"] as const;

/**
 * Everything in the header that reads the URL lives here.
 *
 * useSearchParams puts its component in a Suspense boundary, and a deferred
 * boundary hydrates *after* the cart store has read localStorage — so anything
 * cart-dependent rendered inside it would mismatch the server HTML. Keeping
 * these pieces separate lets the cart button hydrate with the rest of the page.
 */
export function HeaderNav({
  variant,
  onNavigate,
}: {
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = React.useCallback(
    (href: string) => {
      const [path, search] = href.split("?");
      if (pathname !== path) return false;
      // An unfiltered link is only current while nothing is narrowing the list,
      // otherwise "Tupperware" and "Discounted Items" would both look selected.
      if (!search) return FILTER_PARAMS.every((key) => !searchParams.get(key));

      const wanted = new URLSearchParams(search);
      for (const [key, value] of wanted) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    },
    [pathname, searchParams]
  );

  function branchActive(item: NavItem) {
    return isActive(item.href) || (item.children ?? []).some((child) => isActive(child.href));
  }

  if (variant === "mobile") {
    return (
      <nav className="flex flex-col px-4">
        {NAV.map((item) => (
          <div key={item.label}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "font-display border-foreground/10 block border-b py-3.5 text-lg font-bold tracking-tight uppercase transition-colors",
                branchActive(item) ? "text-primary" : "hover:text-primary"
              )}
            >
              {item.label}
            </Link>

            {/* Laid out flat rather than behind a toggle: the drawer already
                scrolls, and a second tap to reach Monthly Offers is a tap
                most people will not make. */}
            {item.children ? (
              <div className="border-foreground/10 flex flex-col border-b py-1 pl-4">
                {item.children.map((child) => (
                  <Link
                    key={child.label}
                    href={child.href}
                    onClick={onNavigate}
                    className={cn(
                      "py-2 text-sm font-semibold transition-colors",
                      isActive(child.href)
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav className="hidden min-w-0 flex-1 items-center gap-4 lg:flex">
      {NAV.map((item) =>
        item.children ? (
          // modal={false} on purpose: the modal variant locks body scroll and
          // blanks pointer events behind it, which a header menu should not do.
          <DropdownMenu key={item.label} modal={false}>
            <DropdownMenuTrigger
              className={cn(
                "relative flex cursor-pointer items-center gap-1 py-1 text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors outline-none",
                branchActive(item)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
              <ChevronDownIcon className="size-3.5" aria-hidden />
              {branchActive(item) && (
                <span className="bg-primary absolute -bottom-0.5 left-0 h-[3px] w-[calc(100%-1.125rem)] rounded-full" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {item.children.map((child) => (
                <DropdownMenuItem key={child.label} asChild>
                  <Link
                    href={child.href}
                    className={cn(
                      "cursor-pointer text-[12px] font-semibold tracking-[0.08em] uppercase",
                      isActive(child.href) && "text-primary"
                    )}
                  >
                    {child.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "relative py-1 text-[12px] font-semibold tracking-[0.12em] whitespace-nowrap uppercase transition-colors",
              isActive(item.href)
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
            {isActive(item.href) && (
              <span className="bg-primary absolute -bottom-0.5 left-0 h-[3px] w-full rounded-full" />
            )}
          </Link>
        )
      )}
    </nav>
  );
}

export function HeaderSearch({
  variant,
  onSubmitted,
}: {
  variant: "desktop" | "mobile";
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeQuery = searchParams.get("q") ?? "";

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q");
    const trimmed = typeof query === "string" ? query.trim() : "";

    router.push(
      trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : "/products"
    );
    onSubmitted?.();
  }

  if (variant === "mobile") {
    return (
      <form onSubmit={handleSearch} role="search" className="px-4">
        <Input
          // Remounting on navigation reseeds the field from the URL without an
          // effect syncing it back into state.
          key={activeQuery}
          type="search"
          name="q"
          defaultValue={activeQuery}
          placeholder="Search the shop"
          aria-label="Search products"
        />
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSearch}
      role="search"
      className="hidden max-w-[240px] flex-1 xl:block"
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
  );
}
