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
import { signOut } from "@/lib/actions/account";
import { useSessionEmail } from "@/components/store/use-session-email";

/** The account menu. See useSessionEmail for how the session is read. */
export function AccountMenu() {
  const email = useSessionEmail();

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
