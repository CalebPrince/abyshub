"use client";

import * as React from "react";
import Link from "next/link";
import {
  LogOutIcon,
  PackageIcon,
  UserIcon,
  UserPlusIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/actions/account";

/**
 * The account menu.
 *
 * Session state is read in the browser rather than on the server: the shop's
 * pages are statically rendered, and asking Supabase who this is on every
 * render would end that for the sake of one menu. The menu therefore starts in
 * its signed-out shape and settles on hydration.
 *
 * Nothing here is a security boundary. Everything behind these links checks
 * the session again on the server, and the row-level policies mean a customer
 * only ever gets their own orders back regardless of what this component
 * believes.
 */
export function AccountMenu() {
  const [email, setEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });

    // Keeps the menu honest when the session changes in another tab, or when a
    // token refresh fails and drops them out.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Your account">
          <UserIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {email ? (
          <>
            <DropdownMenuLabel className="truncate font-normal">
              <span className="text-muted-foreground block text-xs">
                Signed in as
              </span>
              <span className="truncate font-semibold">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">
                <UserIcon className="size-4" /> Your account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/orders">
                <PackageIcon className="size-4" /> Your orders
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* A form, not a link: signing out changes state, and a GET that
                changes state can be triggered by anything that prefetches. */}
            <form action={signOut}>
              <button
                type="submit"
                className="hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
              >
                <LogOutIcon className="size-4" /> Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <DropdownMenuLabel className="font-normal">
              <span className="text-muted-foreground text-xs">
                Sign in to track your orders
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account/login">
                <UserIcon className="size-4" /> Sign in
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/register">
                <UserPlusIcon className="size-4" /> Create an account
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
