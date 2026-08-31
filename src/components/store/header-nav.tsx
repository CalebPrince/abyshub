"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

const HEADER_CATEGORY_LIMIT = 6;

/**
 * Built from the shelves passed in rather than a hardcoded list, so a category
 * added in the admin reaches the header without a deploy.
 */
function buildNav(categories: Category[]) {
  return [
    { href: "/products", label: "Everything" },
    ...categories.slice(0, HEADER_CATEGORY_LIMIT).map((category) => ({
      href: `/products?category=${category.slug}`,
      label: category.name,
    })),
    { href: "/contact", label: "Contact" },
  ];
}

/**
 * Everything in the header that reads the URL lives here.
 *
 * useSearchParams puts its component in a Suspense boundary, and a deferred
 * boundary hydrates *after* the cart store has read localStorage — so anything
 * cart-dependent rendered inside it would mismatch the server HTML. Keeping
 * these pieces separate lets the cart button hydrate with the rest of the page.
 */
export function HeaderNav({
  categories,
  variant,
  onNavigate,
}: {
  categories: Category[];
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const navLinks = buildNav(categories);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  function isActive(href: string) {
    const [path, search] = href.split("?");
    if (pathname !== path) return false;
    if (!search) return !activeCategory;
    return search === `category=${activeCategory}`;
  }

  if (variant === "mobile") {
    return (
      <nav className="flex flex-col px-4">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "font-display border-foreground/10 border-b py-3.5 text-lg font-bold tracking-tight uppercase transition-colors",
              isActive(link.href) ? "text-primary" : "hover:text-primary"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="hidden min-w-0 flex-1 items-center gap-4 overflow-hidden lg:flex">
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
            <span className="bg-primary absolute -bottom-0.5 left-0 h-[3px] w-full rounded-full" />
          )}
        </Link>
      ))}
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
