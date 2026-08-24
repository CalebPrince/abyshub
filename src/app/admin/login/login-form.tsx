"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircleIcon, LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type SignInState } from "@/app/admin/actions";

export function LoginForm() {
  const params = useSearchParams();
  // Where proxy.ts wanted to send them before it found no session.
  const next = params.get("next") ?? "/admin";

  const [state, formAction, pending] = React.useActionState<SignInState, FormData>(
    signIn,
    { error: null }
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive flex items-start gap-2 text-sm">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
        Sign in
      </Button>
    </form>
  );
}
