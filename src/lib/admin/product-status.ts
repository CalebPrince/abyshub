/**
 * Shared with both the server page (to build the query and validate the
 * param) and the client filter component (to render the buttons). Kept out
 * of the "use client" file on purpose: a Server Component can render a
 * client module's default export as JSX, but calling one of its plain
 * function exports directly — as the page does with the validator below —
 * is not something an RSC client-reference module supports.
 */
export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "featured", label: "Featured" },
  { value: "available", label: "Available (GH)" },
  { value: "out-of-stock", label: "Out of stock" },
  { value: "unlisted", label: "Unlisted" },
] as const;

export type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

export function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_OPTIONS.some((option) => option.value === value);
}
