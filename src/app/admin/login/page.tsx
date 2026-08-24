import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeftIcon } from "lucide-react";

import { LoginForm } from "@/app/admin/login/login-form";
import { STORE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "Sign in",
  // Staff screens have no business in a search index.
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span
            aria-hidden
            className="bg-foreground text-background font-display grid size-9 place-items-center rounded-xl text-sm font-extrabold tracking-tighter"
          >
            AH
          </span>
          <span className="font-display text-xl leading-none font-extrabold tracking-tight uppercase">
            Abys<span className="text-primary">Hub</span>
          </span>
        </div>

        <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
          Staff only
        </p>
        <h1 className="font-display mt-2 text-3xl leading-[0.95] font-extrabold tracking-tight uppercase">
          Sign in to
          <br />
          the back office
        </h1>
        <p className="text-muted-foreground mt-3 mb-8 text-sm">
          {STORE_NAME} orders, enquiries and customers.
        </p>

        {/* useSearchParams needs a Suspense boundary above it, or the whole
            route opts out of static rendering. */}
        <React.Suspense fallback={null}>
          <LoginForm />
        </React.Suspense>

        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mt-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeftIcon className="size-4" />
          Return to website
        </Link>
      </div>
    </div>
  );
}
