"use client";

import * as React from "react";
import { AlertCircleIcon, CheckCircle2Icon, LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { savePageContent, type ActionState } from "@/app/admin/data-actions";

export type ContentBlock = {
  page: string;
  key: string;
  label: string;
  value: string;
  multiline?: boolean;
};

export function ContentForm({ pages }: { pages: { page: string; title: string; blocks: ContentBlock[] }[] }) {
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    savePageContent,
    { error: null, notice: null }
  );

  return (
    <form action={formAction} className="mt-8 space-y-8">
      {pages.map((group) => (
        <section key={group.page} className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
            {group.title}
          </h2>

          <div className="mt-4 space-y-4">
            {group.blocks.map((block) => {
              // content:<page>:<key> — the action splits on the colons.
              const field = `content:${block.page}:${block.key}`;
              return (
                <div className="space-y-2" key={field}>
                  <Label htmlFor={field}>{block.label}</Label>
                  <Textarea
                    id={field}
                    name={field}
                    defaultValue={block.value}
                    rows={block.multiline ? 4 : 2}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {state.error ? (
        <p role="alert" className="text-destructive flex items-start gap-2 text-sm">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      {state.notice ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2Icon className="size-4" />
          {state.notice}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="h-11">
        {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
        Save content
      </Button>
    </form>
  );
}
