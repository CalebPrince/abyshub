import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { AccountForm } from "@/components/store/account-form";
import { AccountShowcase } from "@/components/store/account-showcase";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/actions/account";
import { getCatalogue, featuredFrom } from "@/lib/shop/catalogue";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/account/login">) {
  const [{ products }, query] = await Promise.all([getCatalogue(), searchParams]);

  // Someone sent here from checkout should land back there whichever route
  // they take, so the destination follows them into registration. Only ever a
  // path on this site — never an absolute URL someone appended.
  const next = typeof query.next === "string" ? query.next : "";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";
  const registerHref = safeNext
    ? `/account/register?next=${encodeURIComponent(safeNext)}`
    : "/account/register";

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
            Existing customer
          </p>
          <h1 className="font-display mt-2 mb-8 text-3xl leading-[0.95] font-extrabold tracking-tight uppercase">
            Sign in to your account
          </h1>

          {/* useSearchParams needs a Suspense boundary above it. */}
          <React.Suspense fallback={null}>
            <AccountForm
              action={signIn}
              fields={["email", "password"]}
              submitLabel="Sign in"
            >
              <p className="text-muted-foreground text-center text-sm">
                <Link href="/account/forgot" className="hover:text-foreground underline">
                  Forgot password
                </Link>
              </p>
            </AccountForm>
          </React.Suspense>

          {/* A first-time visitor lands on this page from the header and has
              no account to sign in with. Registration was a text link beside
              "Forgot password", which is where the eye goes last — so it gets
              its own band and a button the same size as the one above. */}
          <div className="border-foreground/12 mt-10 border-t pt-8 text-center">
            <p className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
              New customer
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              If you have not shopped with us before, use the button below to
              create an account. It keeps your delivery details ready and every
              order you have placed in one list.
            </p>
            <Button asChild variant="outline" size="lg" className="mt-5 w-full">
              <Link href={registerHref}>Create an account</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
