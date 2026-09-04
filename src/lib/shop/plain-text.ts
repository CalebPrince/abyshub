import "server-only";

/**
 * Strips em dashes out of copy on its way to the page.
 *
 * The shop's own writing has none, but most product text is imported from the
 * maker and theirs is full of them: "every home cook's best friend-great for
 * mixing". Cleaning it here rather than in the database means it holds for
 * copy that has already been imported and for every import after, without
 * anyone having to remember.
 *
 * Only the em dash. An en dash is doing a different job, usually a range like
 * 4-8oz, and turning that into a comma would change what it says.
 */
const EM_DASH = /\s*—\s*/g;

export function plainText(value: string): string;
export function plainText(value: null | undefined): "";
export function plainText(value: string | null | undefined): string;
export function plainText(value: string | null | undefined): string {
  if (!value) return "";
  return (
    value
      .replace(EM_DASH, ", ")
      // A dash that opened or closed a sentence leaves a comma stranded
      // against the punctuation around it.
      .replace(/,\s*,/g, ",")
      .replace(/\s+,/g, ",")
      .replace(/,\s*([.!?;:])/g, "$1")
      .replace(/^\s*,\s*/, "")
      .replace(/,\s*$/, "")
      .trim()
  );
}
