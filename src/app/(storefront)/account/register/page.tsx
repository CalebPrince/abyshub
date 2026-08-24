import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { AccountForm } from "@/components/store/account-form";
import { register } from "@/lib/actions/account";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16 lg:py-24">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Your account
      </p>
      <h1 className="font-display mt-2 text-3xl leading-[0.95] font-extrabold tracking-tight uppercase">
        Create an account
      </h1>
      <p className="text-muted-foreground mt-3 mb-8 text-sm">
        You will need one to check out, and it keeps your order history in one
        place.
      </p>

      <React.Suspense fallback={null}>
        <AccountForm
          action={register}
          fields={["name", "email", "password"]}
          submitLabel="Create account"
          newPassword
        >
          <p className="text-muted-foreground text-sm">
            Already have one?{" "}
            <Link href="/account/login" className="hover:text-foreground underline">
              Sign in
            </Link>
          </p>
        </AccountForm>
      </React.Suspense>
    </div>
  );
}
