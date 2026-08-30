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
  secrets: { title: string; blurb: string; fields: SettingField[] }[];
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

      {secrets.map((group) => (
        <section key={group.title} className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
            {group.title}
          </h2>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">{group.blurb}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <SecretField
                key={field.key}
                field={field}
                isSet={secretsSet.includes(field.key)}
              />
            ))}
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
        Save settings
      </Button>
    </form>
  );
}

function SecretField({
  field,
  isSet,
}: {
  field: SettingField;
  isSet: boolean;
}) {
  // Locked even when nothing is stored yet. An enabled, empty password box on
  // a page you just signed in to is exactly what a browser's password manager
  // fills with your admin password — and the save then writes that over the
  // key. Clicking Set is the deliberate act that opens the box.
  const [replacing, setReplacing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function beginReplacement() {
    setReplacing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function cancelReplacement() {
    if (inputRef.current) inputRef.current.value = "";
    setReplacing(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`secret:${field.key}`}>{field.label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={replacing ? cancelReplacement : beginReplacement}
        >
          {replacing ? "Cancel" : isSet ? "Replace" : "Set"}
        </Button>
      </div>
      <Input
        ref={inputRef}
        id={`secret:${field.key}`}
        name={`secret:${field.key}`}
        // Not `type="password"`. That is the single strongest signal a
        // password manager has, and it will offer to fill the box whatever
        // the autocomplete attribute says. Masking is done with CSS instead,
        // so the value is still hidden over the shoulder while the field
        // reads to a manager as ordinary text it has no business filling.
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        // The managers that ignore autocomplete honour these instead.
        data-1p-ignore
        data-lpignore="true"
        data-bwignore
        data-form-type="other"
        disabled={!replacing}
        placeholder={isSet && !replacing ? "•••••••• (stored)" : field.hint}
        className="h-10 [-webkit-text-security:disc] [text-security:disc]"
        style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
      />
      <p className="text-muted-foreground text-xs">
        {replacing
          ? field.hint ?? "Enter the credential."
          : isSet
            ? "Stored securely. Click Replace only when you want to change it."
            : "Not set. Click Set to enter it."}
      </p>
    </div>
  );
}
