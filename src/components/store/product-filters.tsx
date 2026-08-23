"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brands, categories } from "@/lib/products";
import { cn } from "@/lib/utils";

export const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "name", label: "Name A–Z" },
] as const;

export type SortOption = (typeof sortOptions)[number]["value"];

export function ProductFilters({ resultCount }: { resultCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category") ?? "all";
  const activeBrand = searchParams.get("brand") ?? "all";
  const activeSort = searchParams.get("sort") ?? "featured";
  const activeQuery = searchParams.get("q") ?? "";

  const pushParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const search = params.toString();
      router.push(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  const hasFilters =
    activeCategory !== "all" ||
    activeBrand !== "all" ||
    activeSort !== "featured" ||
    activeQuery !== "";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const query = new FormData(event.currentTarget).get("q");
            pushParams({
              q: typeof query === "string" ? query.trim() || null : null,
            });
          }}
          className="relative w-full sm:max-w-xs"
        >
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            // Remounting on navigation reseeds the field from the URL
            // without an effect syncing it back into state.
            key={activeQuery}
            type="search"
            name="q"
            defaultValue={activeQuery}
            placeholder="Search products"
            aria-label="Search products"
            className="pl-9"
          />
        </form>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {resultCount} {resultCount === 1 ? "item" : "items"}
          </span>
          <Select
            value={activeBrand}
            onValueChange={(value) =>
              pushParams({ brand: value === "all" ? null : value })
            }
          >
            <SelectTrigger className="w-40" aria-label="Filter by brand">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={activeSort}
            onValueChange={(value) =>
              pushParams({ sort: value === "featured" ? null : value })
            }
          >
            <SelectTrigger className="w-48" aria-label="Sort products">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={activeCategory === "all"}
          onClick={() => pushParams({ category: null })}
        >
          All
        </FilterChip>
        {categories.map((category) => (
          <FilterChip
            key={category.slug}
            active={activeCategory === category.slug}
            onClick={() => pushParams({ category: category.slug })}
          >
            {category.name}
          </FilterChip>
        ))}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() =>
              pushParams({ category: null, brand: null, sort: null, q: null })
            }
          >
            <XIcon /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "cursor-pointer border px-4 py-2 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-foreground/20 hover:border-foreground"
      )}
    >
      {children}
    </button>
  );
}
