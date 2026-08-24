import { DatabaseIcon } from "lucide-react";

/**
 * Shown in place of empty tables when Supabase has not been wired up yet.
 *
 * The admin renders perfectly well without a database — it simply has nothing
 * to show — and saying so plainly beats four zeroes that look like a quiet
 * afternoon rather than a missing connection.
 */
export function SetupNotice() {
  return (
    <div className="border-border bg-muted/40 rounded-xl border border-dashed p-6">
      <div className="flex items-start gap-3">
        <DatabaseIcon className="text-primary mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">The database is not connected yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Create a Supabase project, run{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">
              supabase/migrations/20260824000000_crm_foundation.sql
            </code>{" "}
            in its SQL editor, then set{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_URL
            </code>
            ,{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            and{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">
              SUPABASE_SERVICE_ROLE_KEY
            </code>
            . Redeploy afterwards — the public values are baked in at build time.
          </p>
        </div>
      </div>
    </div>
  );
}
