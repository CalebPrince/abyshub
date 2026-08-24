import "server-only";

import { unstable_cache } from "next/cache";

import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";

export const CONTENT_TAG = "page-content";

export type PageCopy = (key: string, fallback: string) => string;

/**
 * Editable copy, addressed as page + key.
 *
 * Everything falls back to the wording already written into the component. A
 * page with nothing saved reads exactly as it did before, so an empty table is
 * an unedited shop rather than a blank one — and a half-filled table leaves the
 * untouched blocks alone instead of blanking them.
 */
const loadContent = unstable_cache(
  async (): Promise<Record<string, string>> => {
    if (!adminClientAvailable()) return {};

    const supabase = createAdminClient();
    const { data } = await supabase.from("page_content").select("page, key, value");

    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      const value = typeof row.value === "string" ? row.value : String(row.value ?? "");
      if (value.trim()) map[`${row.page}:${row.key}`] = value;
    }
    return map;
  },
  ["shop-content"],
  { tags: [CONTENT_TAG], revalidate: 300 }
);

/** Returns a lookup for one page: `copy("hero_heading", "Buy it once.")`. */
export async function getPageCopy(page: string): Promise<PageCopy> {
  const map = await loadContent();
  return (key, fallback) => map[`${page}:${key}`] ?? fallback;
}
