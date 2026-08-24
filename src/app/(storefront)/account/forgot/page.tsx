import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { AccountForm } from "@/components/store/account-form";
import { requestPasswordReset } from "@/lib/actions/account";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16 lg:py-24">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Your account
      </p>
      <h1 className="font-display mt-2 text-3xl leading-[0.95] font-extrabold tracking-tight uppercase">
        Reset your password
      </h1>
      <p className="text-muted-foreground mt-3 mb-8 text-sm">
        We will email you a link to set a new one.
      </p>

      <React.Suspense fallback={null}>
        <AccountForm
          action={requestPasswordReset}
          fields={["email"]}
          submitLabel="Send reset link"
        >
          <p className="text-muted-foreground text-sm">
            <Link href="/account/login" className="hover:text-foreground underline">
              Back to sign in
            </Link>
          </p>
        </AccountForm>
      </React.Suspense>
    </div>
  );
}
