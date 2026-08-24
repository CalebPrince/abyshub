"use client";

import * as React from "react";
import { AlertCircleIcon, CheckCircle2Icon, LoaderCircleIcon, UserPlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addStaff, type ActionState } from "@/app/admin/data-actions";

export function AddStaffForm() {
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    addStaff,
    { error: null, notice: null }
  );

  return (
    <form action={formAction} className="border-border bg-card rounded-xl border p-5">
      <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
        Add someone
      </h2>
      <p className="text-muted-foreground mt-1 mb-4 text-sm">
        Creates their login and lets them straight in — the account is confirmed
        on creation, so there is no verification email to wait for.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="staff-name">Name</Label>
          <Input id="staff-name" name="name" className="h-10" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="staff-email">Email</Label>
          <Input id="staff-email" name="email" type="email" required className="h-10" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="staff-password">Temporary password</Label>
          <Input
            id="staff-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="h-10"
          />
          <p className="text-muted-foreground text-xs">
            At least 8 characters. Give it to them by some route other than
            email, and have them change it once they are in.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="staff-role">Role</Label>
          <select
            id="staff-role"
            name="role"
            defaultValue="staff"
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
          >
            <option value="staff">Staff</option>
            <option value="owner">Owner — can manage staff</option>
          </select>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive mt-4 flex items-start gap-2 text-sm">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      {state.notice ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2Icon className="size-4" />
          {state.notice}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-5 h-10">
        {pending ? <LoaderCircleIcon className="animate-spin" /> : <UserPlusIcon />}
        Add staff member
      </Button>
    </form>
  );
}
