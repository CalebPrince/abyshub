"use client";

import Link from "next/link";
import { LogOutIcon, PackageIcon, UserIcon, UserPlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/account";
import { useSessionEmail } from "@/components/store/use-session-email";

/**
 * Signing in from the drawer.
 *
 * The account menu lives behind an icon in the header bar, which is where a
 * phone has least room and where it is most easily missed. The drawer is
 * already open and already the place people go looking for everything else.
 */
export function DrawerAccount({ onNavigate }: { onNavigate?: () => void }) {
  const email = useSessionEmail();

  return (
    <div className="border-foreground/12 mt-2 border-t px-4 pt-4 pb-6">
      {email ? (
        <>
          <p className="text-muted-foreground text-[10px] font-bold tracking-[0.16em] uppercase">
            Signed in as
          </p>
          <p className="mt-1 truncate text-sm font-semibold">{email}</p>

          <div className="mt-4 flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/account" onClick={onNavigate}>
                <UserIcon className="size-4" /> Your account
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/account/orders" onClick={onNavigate}>
                <PackageIcon className="size-4" /> Your orders
              </Link>
            </Button>

            {/* A form, not a link: signing out changes state, and a GET that
                changes state can be triggered by anything that prefetches. */}
            <form action={signOut} onSubmit={onNavigate}>
              <Button
                type="submit"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground w-full justify-start"
              >
                <LogOutIcon className="size-4" /> Sign out
              </Button>
            </form>
          </div>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            Sign in to track your orders.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild className="justify-center">
              <Link href="/account/login" onClick={onNavigate}>
                <UserIcon className="size-4" /> Sign in
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-center">
              <Link href="/account/register" onClick={onNavigate}>
                <UserPlusIcon className="size-4" /> Create an account
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
