import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { AccountForm } from "@/components/store/account-form";
import { signIn } from "@/lib/actions/account";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16 lg:py-24">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Your account
      </p>
      <h1 className="font-display mt-2 mb-8 text-3xl leading-[0.95] font-extrabold tracking-tight uppercase">
        Sign in
      </h1>

      {/* useSearchParams needs a Suspense boundary above it. */}
      <React.Suspense fallback={null}>
        <AccountForm action={signIn} fields={["email", "password"]} submitLabel="Sign in">
          <div className="text-muted-foreground flex justify-between text-sm">
            <Link href="/account/forgot" className="hover:text-foreground underline">
              Forgot password
            </Link>
            <Link href="/account/register" className="hover:text-foreground underline">
              Create an account
            </Link>
          </div>
        </AccountForm>
      </React.Suspense>
    </div>
  );
}
