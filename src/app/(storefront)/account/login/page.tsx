import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { AccountForm } from "@/components/store/account-form";
import { AccountShowcase } from "@/components/store/account-showcase";
import { signIn } from "@/lib/actions/account";
import { getCatalogue, featuredFrom } from "@/lib/shop/catalogue";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const { products } = await getCatalogue();
  // Featured first, then anything in stock, so the panel is never empty.
  const showcase = [
    ...featuredFrom(products),
    ...products.filter((p) => p.inStock),
  ]
    .filter((p, i, all) => all.findIndex((x) => x.id === p.id) === i)
    .slice(0, 3);

  return (
    <div className="grid min-h-[calc(100dvh-14rem)] lg:grid-cols-2">
      <AccountShowcase
        products={showcase}
        eyebrow="Members"
        heading={
          <>
            Your basket,
            <br />
            <span className="text-foreground">your orders,</span>
            <br />
            in one place.
          </>
        }
        body="Sign in to check out faster and follow an order from paid to delivered."
      />

      <div className="flex items-start justify-center px-4 pt-10 pb-16 lg:px-12 lg:pt-16">
        <div className="w-full max-w-sm">
          <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
            Your account
          </p>
          <h1 className="font-display mt-2 mb-8 text-3xl leading-[0.95] font-extrabold tracking-tight uppercase">
            Sign in
          </h1>

          {/* useSearchParams needs a Suspense boundary above it. */}
          <React.Suspense fallback={null}>
            <AccountForm
              action={signIn}
              fields={["email", "password"]}
              submitLabel="Sign in"
            >
              <div className="text-muted-foreground flex justify-between text-sm">
                <Link href="/account/forgot" className="hover:text-foreground underline">
                  Forgot password
                </Link>
                <Link
                  href="/account/register"
                  className="hover:text-foreground underline"
                >
                  Create an account
                </Link>
              </div>
            </AccountForm>
          </React.Suspense>
        </div>
      </div>
    </div>
  );
}
