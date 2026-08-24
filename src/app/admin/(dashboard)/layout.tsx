import Link from "next/link";
import type { Metadata } from "next";
import {
  ClipboardListIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MessageSquareTextIcon,
  PackageIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin/dal";

/**
 * Never prerender the back office.
 *
 * Without this the segment can be statically rendered whenever the auth check
 * short-circuits before it touches cookies() — which is exactly what happens
 * while Supabase is unconfigured. A staff screen baked at build time and
 * served from a CDN is not a caching win, it is a data leak waiting to happen.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Back office", template: "%s · Abys Hub admin" },
  robots: { index: false, follow: false },
};

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/admin/orders", label: "Orders", icon: ClipboardListIcon },
  { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquareTextIcon },
  { href: "/admin/customers", label: "Customers", icon: UsersIcon },
  { href: "/admin/products", label: "Products", icon: PackageIcon },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // The real gate. proxy.ts already bounced anyone without a session, but that
  // is an optimistic cookie check running on a CDN edge — this is the one that
  // sits next to the data and verifies the user is actually staff.
  const user = await requireAdmin();

  return (
    <div className="flex min-h-dvh">
      <aside className="bg-foreground text-background hidden w-60 shrink-0 flex-col p-5 lg:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-2.5">
          <span
            aria-hidden
            className="bg-background text-foreground font-display grid size-9 place-items-center rounded-xl text-sm font-extrabold tracking-tighter"
          >
            AH
          </span>
          <span className="font-display text-lg leading-none font-extrabold tracking-tight uppercase">
            Back<span className="text-primary">office</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-background/70 hover:bg-background/10 hover:text-background flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-background/15 mt-6 border-t pt-4">
          <p className="truncate text-sm font-semibold">
            {user.fullName ?? user.email}
          </p>
          <p className="text-background/50 text-xs capitalize">{user.role}</p>
          <form action={signOut} className="mt-3">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-background/70 hover:bg-background/10 hover:text-background h-8 w-full justify-start px-2"
            >
              <LogOutIcon className="size-4" /> Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Phones get the nav as a strip rather than a drawer — the admin is a
          desk tool, and a scrollable row beats a hamburger for six links. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="bg-foreground text-background flex gap-1 overflow-x-auto px-3 py-2 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-background/75 hover:text-background flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap uppercase"
            >
              <item.icon className="size-3.5" />
              {item.label}
            </Link>
          ))}
        </div>

        <main className="min-w-0 flex-1 px-4 py-8 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
