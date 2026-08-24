"use client";

import * as React from "react";
import { AlertCircleIcon, CheckCircle2Icon, LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSettings, type ActionState } from "@/app/admin/data-actions";

export type SettingField = {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
};

export function SettingsForm({
  groups,
  secrets,
  values,
  secretsSet,
}: {
  groups: { title: string; blurb: string; fields: SettingField[] }[];
  secrets: { title: string; blurb: string; fields: SettingField[] };
  values: Record<string, string>;
  secretsSet: string[];
}) {
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    saveSettings,
    { error: null, notice: null }
  );

  return (
    <form action={formAction} className="mt-8 space-y-8">
      {groups.map((group) => (
        <section
          key={group.title}
          className="border-border bg-card rounded-xl border p-5"
        >
          <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
            {group.title}
          </h2>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">{group.blurb}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <div className="space-y-2" key={field.key}>
                <Label htmlFor={`setting:${field.key}`}>{field.label}</Label>
                <Input
                  id={`setting:${field.key}`}
                  name={`setting:${field.key}`}
                  defaultValue={values[field.key] ?? ""}
                  placeholder={field.placeholder}
                  className="h-10"
                />
                {field.hint ? (
                  <p className="text-muted-foreground text-xs">{field.hint}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="border-border bg-card rounded-xl border p-5">
        <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
          {secrets.title}
        </h2>
        <p className="text-muted-foreground mt-1 mb-4 text-sm">{secrets.blurb}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {secrets.fields.map((field) => {
            const isSet = secretsSet.includes(field.key);
            return (
              <div className="space-y-2" key={field.key}>
                <Label htmlFor={`secret:${field.key}`}>{field.label}</Label>
                <Input
                  id={`secret:${field.key}`}
                  name={`secret:${field.key}`}
                  type="password"
                  autoComplete="off"
                  // Never populated: the value is not read out of the database
                  // and does not travel to the browser. The form reports only
                  // whether one is stored.
                  placeholder={isSet ? "•••••••• (stored)" : "Not set"}
                  className="h-10"
                />
                <p className="text-muted-foreground text-xs">
                  {isSet
                    ? "Stored. Leave blank to keep it, or type a new value to replace it."
                    : field.hint ?? "Not set."}
                </p>
              </div>
            );
          })}
        </div>
      </section>

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
        Save settings
      </Button>
    </form>
  );
}
