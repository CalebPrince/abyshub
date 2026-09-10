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
import { Textarea } from "@/components/ui/textarea";
import {
  previewMobiSync,
  applyMobiSyncChunk,
  type MobiSyncPreview,
} from "@/app/admin/data-actions";

const SNIPPET = `[...document.querySelectorAll('img[src*="virtualstore"]')].map(img=>{
  let c=img.closest('div');
  for(let i=0;i<8&&c;i++){ if(/Recognition/.test(c.innerText)) break; c=c.parentElement; }
  const t=(c?c.innerText:'').replace(/\\s+/g,' ').trim();
  return {
    code:(t.match(/\\b(\\d{5,6})\\b/)||[])[1],
    name:(t.match(/\\d{5,6}\\s+(.+?)\\s+Recognition/)||[])[1],
    priceZAR:(t.match(/Price:\\s*([\\d.]+)/)||[])[1],
    recognition:(t.match(/Recognition:\\s*([\\d.]+)/)||[])[1],
    img:img.src.split('/').pop(),
  };
});`;

type Phase = "idle" | "previewing" | "previewed" | "running" | "done";

/**
 * Paste a MOBI "Sales Force" catalogue snapshot, preview the plan, then apply it
 * in chunks. The browser drives the apply loop — a full sync pulls ~90 images
 * from a slow server, which no single request can hold.
 */
export function MobiSyncDialog() {
  const [open, setOpen] = React.useState(false);
  const [snapshot, setSnapshot] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [plan, setPlan] = React.useState<MobiSyncPreview | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [done, setDone] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [tally, setTally] = React.useState({ updated: 0, created: 0, dropped: 0, failed: 0 });
  const [problems, setProblems] = React.useState<string[]>([]);

  const cancelled = React.useRef(false);

  function reset() {
    setPhase("idle");
    setPlan(null);
    setError(null);
    setDone(0);
    setTotal(0);
    setTally({ updated: 0, created: 0, dropped: 0, failed: 0 });
    setProblems([]);
  }

  async function preview() {
    setError(null);
    setPhase("previewing");
    try {
      const result = await previewMobiSync(snapshot);
      if (result.error) {
        setError(result.error);
        setPhase("idle");
        return;
      }
      setPlan(result);
      setPhase("previewed");
    } catch {
      setError("The preview did not come back. Try again.");
      setPhase("idle");
    }
  }

  async function apply() {
    cancelled.current = false;
    setError(null);
    setProblems([]);
    setTally({ updated: 0, created: 0, dropped: 0, failed: 0 });
    setDone(0);
    setPhase("running");

    let offset = 0;
    let finished = false;
    const acc = { updated: 0, created: 0, dropped: 0, failed: 0 };
    const seen: string[] = [];

    while (true) {
      if (cancelled.current) break;
      let chunk;
      try {
        chunk = await applyMobiSyncChunk(snapshot, offset);
      } catch {
        setError("The sync stopped unexpectedly. Anything already written is saved — re-run to finish.");
        break;
      }
      if (chunk.error) {
        setError(chunk.error);
        break;
      }
      acc.updated += chunk.updated;
      acc.created += chunk.created;
      acc.dropped += chunk.dropped;
      acc.failed += chunk.failed;
      seen.push(...chunk.problems);
      offset = chunk.offset;
      setTotal(chunk.total);
      setDone(offset);
      setTally({ ...acc });
      setProblems(seen.slice(0, 10));
      if (chunk.done) {
        finished = true;
        break;
      }
    }
    // Back to "previewed" if it was stopped or errored partway, so Apply can
    // resume (it is idempotent and picks up where the writes left off).
    setPhase(finished ? "done" : "previewed");
  }

  const running = phase === "running";
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          cancelled.current = true;
          reset();
          setSnapshot("");
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <RefreshCwIcon /> Sync from MOBI
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto p-6">
        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight uppercase">
          Sync from the MOBI portal
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm">
          Makes the Tupperware catalogue match a snapshot of the MOBI Sales Force
          site — prices, photos and what is in stock. Everything else is left
          alone.
        </DialogDescription>

        <div className="mt-5 space-y-4">
          <div className="border-border bg-muted/40 space-y-2 rounded-lg border p-3 text-xs">
            <p className="font-semibold">Getting the snapshot</p>
            <ol className="text-muted-foreground list-decimal space-y-1 pl-4">
              <li>
                Log in to <span className="font-mono">amp.tuppafrica.co.za</span>, open{" "}
                <strong>Shop → All Categories</strong>.
              </li>
              <li>Open the browser console (F12), page through every page, and run this once per page:</li>
            </ol>
            <pre className="bg-background border-border overflow-x-auto rounded border p-2 text-[10px] leading-tight">
              {SNIPPET}
            </pre>
            <p className="text-muted-foreground">
              Collect the results into one array and paste it below.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobi-snapshot">Catalogue snapshot (JSON array)</Label>
            <Textarea
              id="mobi-snapshot"
              value={snapshot}
              onChange={(event) => {
                setSnapshot(event.target.value);
                if (phase === "previewed") reset();
              }}
              disabled={running}
              rows={5}
              placeholder='[ { "code": "183798", "name": "Big T Tumbler 1.1L (Cream)", "recognition": "949.00", "img": "30270.jpg" }, ... ]'
              className="font-mono text-xs"
            />
          </div>

          {error ? (
            <p role="alert" className="text-destructive flex items-start gap-2 text-sm">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}

          {plan && (phase === "previewed" || phase === "running" || phase === "done") ? (
            <div className="border-border space-y-3 rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground text-xs">
                {plan.total} products in the snapshot
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                <Stat label="Update" value={plan.updates.length} />
                <Stat label="Create" value={plan.creates.length} />
                <Stat label="Out of stock" value={plan.drops.length} />
                <Stat label="Unchanged" value={plan.unchanged} />
              </div>

              {plan.creates.length > 0 ? (
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold">
                    New products ({plan.creates.length}) — category is a guess
                  </summary>
                  <ul className="text-muted-foreground mt-1 space-y-0.5">
                    {plan.creates.map((c) => (
                      <li key={c.slug}>
                        {c.slug} · GH₵{c.price} · {c.category}
                        {c.hasImage ? "" : " · no photo"}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {plan.drops.length > 0 ? (
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold">
                    Going out of stock ({plan.drops.length})
                  </summary>
                  <ul className="text-muted-foreground mt-1 space-y-0.5">
                    {plan.drops.map((d) => (
                      <li key={d.slug}>{d.name}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}

          {(running || phase === "done") && total > 0 ? (
            <div className="space-y-2">
              <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {done} of {total} · {tally.updated} updated · {tally.created} created ·{" "}
                {tally.dropped} out of stock
                {tally.failed > 0 ? ` · ${tally.failed} failed` : ""}
              </p>
            </div>
          ) : null}

          {phase === "done" && !error ? (
            <p className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
              Done. The storefront picks this up within the hour, or straight away
              if you save any product.
            </p>
          ) : null}

          {problems.length > 0 ? (
            <p className="text-muted-foreground text-xs">Problems: {problems.join("; ")}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {phase === "idle" || phase === "previewing" ? (
              <Button type="button" onClick={preview} disabled={!snapshot.trim() || phase === "previewing"}>
                {phase === "previewing" ? (
                  <>
                    <LoaderCircleIcon className="animate-spin" /> Reading…
                  </>
                ) : (
                  "Preview"
                )}
              </Button>
            ) : null}

            {phase === "previewed" ? (
              <Button type="button" onClick={apply}>
                Apply {plan ? plan.updates.length + plan.creates.length + plan.drops.length : ""} changes
              </Button>
            ) : null}

            {running ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  cancelled.current = true;
                }}
              >
                Stop
              </Button>
            ) : null}

            {phase === "done" ? (
              <Button type="button" variant="outline" onClick={reset}>
                New sync
              </Button>
            ) : null}

            <Button type="button" variant="ghost" disabled={running} onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>

          {running ? (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <LoaderCircleIcon className="size-3.5 animate-spin" />
              Working through the snapshot. Leave this open.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex flex-col">
      <span className="font-display text-lg font-extrabold tabular-nums">{value}</span>
      <span className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</span>
    </span>
  );
}
