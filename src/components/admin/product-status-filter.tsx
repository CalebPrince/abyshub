"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  STATUS_OPTIONS,
  isStatusFilter,
  type StatusFilter,
} from "@/lib/admin/product-status";

/**
 * Quick status filter for the product table.
 *
 * A page filter rather than a client-side one: with hundreds of rows spread
 * over forty pages, filtering only what happens to be on the current page
 * would miss almost everything. Changing status resets to page 1 — a filter
 * that kept you on page 12 of a now-nine-row result would just show "nothing
 * here" until you noticed why.
 */
export function ProductStatusFilter({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawStatus = searchParams.get("status") ?? "all";
  const activeStatus: StatusFilter = isStatusFilter(rawStatus) ? rawStatus : "all";

  function setStatus(next: StatusFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("status");
    else params.set("status", next);
    params.delete("page");
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setStatus(option.value)}
          aria-pressed={activeStatus === option.value}
          className={cn(
            "cursor-pointer rounded-full border px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase transition-colors",
            activeStatus === option.value
              ? "border-foreground bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
      <span className="text-muted-foreground ml-auto text-xs">
        {total} {total === 1 ? "match" : "matches"}
      </span>
    </div>
  );
}
