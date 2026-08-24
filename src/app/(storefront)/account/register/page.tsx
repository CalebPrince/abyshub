import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { AccountForm } from "@/components/store/account-form";
import { AccountShowcase } from "@/components/store/account-showcase";
import { register } from "@/lib/actions/account";
import { getCatalogue, featuredFrom } from "@/lib/shop/catalogue";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage() {
  const { products } = await getCatalogue();
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
        eyebrow="Join us"
        heading={
          <>
            Buy it once.
            <br />
            <span className="text-foreground">Keep it</span>
            <br />
            for years.
          </>
        }
        body="An account keeps your delivery details ready and every order you have placed in one list."
      />

      <div className="flex items-start justify-center px-4 pt-10 pb-16 lg:px-12 lg:pt-16">
        <div className="w-full max-w-sm">
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
      </div>
    </div>
  );
}
