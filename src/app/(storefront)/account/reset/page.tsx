import * as React from "react";
import type { Metadata } from "next";

import { AccountForm } from "@/components/store/account-form";
import { updatePassword } from "@/lib/actions/account";

export const metadata: Metadata = { title: "Choose a new password" };

/**
 * Reached from the emailed recovery link, which signs the browser in with a
 * short-lived recovery session. That session is what authorises the change,
 * which is why no current password is asked for.
 */
export default function ResetPage() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16 lg:py-24">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Your account
      </p>
      <h1 className="font-display mt-2 mb-8 text-3xl leading-[0.95] font-extrabold tracking-tight uppercase">
        Choose a new password
      </h1>

      <React.Suspense fallback={null}>
        <AccountForm
          action={updatePassword}
          fields={["password"]}
          submitLabel="Save password"
          newPassword
        />
      </React.Suspense>
    </div>
  );
}
