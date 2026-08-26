"use client";

import * as React from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  RefreshCwIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { importChunk, type ChunkResult } from "@/app/admin/data-actions";
import { SUPPLIERS } from "@/lib/suppliers/registry";

type Totals = {
  imported: number;
  refreshed: number;
  skipped: number;
  failed: number;
  unpriced: number;
  problems: string[];
};

const EMPTY: Totals = {
  imported: 0,
  refreshed: 0,
  skipped: 0,
  failed: 0,
  unpriced: 0,
  problems: [],
};

/**
 * Pulls a partner's whole catalogue.
 *
 * The loop runs here rather than on the server: four hundred products is four
 * hundred page fetches, which no single request can hold, and a job queue is a
 * lot of machinery for something run a few times a year. Driving it from the
 * browser also means progress is visible and stopping halfway is safe — every
 * product is written on its own.
 */
export function BulkImportDialog() {
  const [open, setOpen] = React.useState(false);
  const [supplierId, setSupplierId] = React.useState(SUPPLIERS[0]?.id ?? "");
  const [mode, setMode] = React.useState<"new" | "refresh">("new");

  const [running, setRunning] = React.useState(false);
  const [total, setTotal] = React.useState(0);
  const [done, setDone] = React.useState(0);
  const [totals, setTotals] = React.useState<Totals>(EMPTY);
  const [error, setError] = React.useState<string | null>(null);
  const [finished, setFinished] = React.useState(false);

  // Lets Stop halt the loop between chunks without abandoning one mid-write.
  const cancelled = React.useRef(false);

  async function run() {
    cancelled.current = false;
    setRunning(true);
    setFinished(false);
    setError(null);
    setTotals(EMPTY);
    setDone(0);

    let offset = 0;
    const tally: Totals = { ...EMPTY, problems: [] };

    while (true) {
      if (cancelled.current) break;

      let chunk: ChunkResult;
      try {
        chunk = await importChunk(supplierId, offset, mode);
      } catch {
        setError("The import stopped unexpectedly. Anything already brought in is saved.");
        break;
      }

      if (chunk.error) {
        setError(chunk.error);
        break;
      }

      tally.imported += chunk.imported;
      tally.refreshed += chunk.refreshed;
      tally.skipped += chunk.skipped;
      tally.failed += chunk.failed;
      tally.unpriced += chunk.unpriced;
      tally.problems.push(...chunk.problems);

      offset = chunk.offset;
      setTotal(chunk.total);
      setDone(offset);
      setTotals({ ...tally, problems: tally.problems.slice(0, 8) });

      if (chunk.done) {
        setFinished(true);
        break;
      }
    }

    setRunning(false);
  }

  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const supplier = SUPPLIERS.find((s) => s.id === supplierId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Never leave a run going behind a closed dialog.
        if (!next) cancelled.current = true;
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <RefreshCwIcon /> Sync catalogue
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg p-6">
        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight uppercase">
          Sync a partner catalogue
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm">
          Reads the whole catalogue from the sitemap the partner publishes, a
          few products at a time. Leave this open until it finishes; you can
          stop at any point and everything already brought in is kept.
        </DialogDescription>

        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-supplier">Partner</Label>
              <select
                id="bulk-supplier"
                value={supplierId}
                disabled={running}
                onChange={(event) => setSupplierId(event.target.value)}
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              >
                {SUPPLIERS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-mode">Products already on the shelf</Label>
              <select
                id="bulk-mode"
                value={mode}
                disabled={running}
                onChange={(event) => setMode(event.target.value as "new" | "refresh")}
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="new">Skip them</option>
                <option value="refresh">Refresh their details</option>
              </select>
            </div>
          </div>

          <div className="border-border bg-muted/40 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">
              {supplier
                ? `${supplier.label} list in ${supplier.currency}, converted at today’s rate`
                : "Partner prices are converted at today’s rate"}{" "}
              with your import markup added, and they go{" "}
              <strong>straight onto the shelf, marked out of stock</strong> —
              neither partner&apos;s page says anything about Ghana, so new imports
              wait for you to confirm one is actually available before it can
              sell. Set your markup in Settings first: it is what every product
              here sells at until you edit it. Anything the page did not price
              stays visible at zero until you set a shop price. A refresh
              records their new price but never changes yours, your listing, or
              your stock decision.
            </p>
          </div>

          {supplier ? (
            <div className="border-border bg-muted/40 rounded-lg border p-3">
              <p className="text-xs font-semibold">Checking what&apos;s in stock in Ghana</p>
              <p className="text-muted-foreground mt-1 text-xs">{supplier.ghanaCheck.note}</p>
              {supplier.ghanaCheck.links?.length ? (
                <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {supplier.ghanaCheck.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium underline underline-offset-2"
                    >
                      {link.label}
                    </a>
                  ))}
                </p>
              ) : null}
            </div>
          ) : null}

          {(running || finished || total > 0) && !error ? (
            <div className="space-y-2">
              <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {done} of {total} read · {totals.imported} added ·{" "}
                {totals.refreshed} refreshed · {totals.skipped} skipped ·{" "}
                {totals.failed} failed
                {totals.unpriced > 0 ? ` · ${totals.unpriced} with no price on the page` : ""}
              </p>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-destructive flex items-start gap-2 text-sm">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}

          {finished ? (
            <p className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
              Finished. {totals.imported} added, {totals.refreshed} refreshed.
              {totals.imported > 0
                ? ` The ${totals.imported} new ${totals.imported === 1 ? "one is" : "ones are"} marked out of stock until confirmed available in Ghana.`
                : ""}
            </p>
          ) : null}

          {totals.problems.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              Could not read: {totals.problems.join(", ")}
              {totals.failed > totals.problems.length
                ? ` and ${totals.failed - totals.problems.length} more`
                : ""}
              .
            </p>
          ) : null}

          <div className="flex gap-2">
            {running ? (
              <Button
                type="button"
                variant="destructive"
                className="h-10"
                onClick={() => {
                  cancelled.current = true;
                }}
              >
                Stop
              </Button>
            ) : (
              <Button type="button" className="h-10" onClick={run}>
                <RefreshCwIcon /> Start
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="h-10"
              disabled={running}
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>

          {running ? (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <LoaderCircleIcon className="size-3.5 animate-spin" />
              Working through their catalogue. This takes a few minutes for a
              large one.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
