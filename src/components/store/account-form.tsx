"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircleIcon, CheckCircle2Icon, LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccountState } from "@/lib/actions/account";

type Field = "name" | "email" | "password";

const config: Record<Field, { label: string; type: string; autoComplete: string }> = {
  name: { label: "Your name", type: "text", autoComplete: "name" },
  email: { label: "Email", type: "email", autoComplete: "email" },
  password: { label: "Password", type: "password", autoComplete: "current-password" },
};

/**
 * Fixed copy for the codes /auth/callback sends people back with. The message
 * is looked up rather than read from the URL: free text in a query parameter,
 * rendered above a sign-in form, is a gift to anyone building a phishing link.
 */
const linkErrors: Record<string, string> = {
  expired: "That link has expired or has already been used. Ask for a new one below.",
  browser:
    "That link has to be opened in the browser you asked for it from. Sign in below instead.",
  unavailable: "Accounts are not available right now. Please try again shortly.",
};

/**
 * Shared shell for sign in, register, forgot and reset. The differences
 * between those four are which fields show and which action runs, so they
 * share one component rather than four that drift apart.
 */
export function AccountForm({
  action,
  fields,
  submitLabel,
  newPassword = false,
  children,
}: {
  action: (state: AccountState, formData: FormData) => Promise<AccountState>;
  fields: Field[];
  submitLabel: string;
  /** Switches the password box to "new password" for register and reset. */
  newPassword?: boolean;
  children?: React.ReactNode;
}) {
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";

  const [state, formAction, pending] = React.useActionState<AccountState, FormData>(
    action,
    { error: null, notice: null }
  );

  // Whatever this attempt just said comes first; the emailed link's complaint
  // is only there to explain how they arrived here.
  const error = state.error ?? linkErrors[params.get("error") ?? ""] ?? null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {fields.map((field) => {
        const item = config[field];
        const autoComplete =
          field === "password" && newPassword ? "new-password" : item.autoComplete;

        return (
          <div className="space-y-2" key={field}>
            <Label htmlFor={field}>{item.label}</Label>
            <Input
              id={field}
              name={field}
              type={item.type}
              autoComplete={autoComplete}
              required
              className="h-11"
            />
          </div>
        );
      })}

      {error ? (
        <p role="alert" className="text-destructive flex items-start gap-2 text-sm">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {state.notice ? (
        <p className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
          {state.notice}
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
        {submitLabel}
      </Button>

      {children}
    </form>
  );
}
