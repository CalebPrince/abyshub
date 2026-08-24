import { StorefrontShell } from "@/components/store/storefront-shell";

/**
 * A route group, so none of this changes a URL — it exists purely to keep the
 * shop's chrome off the admin, which sits in its own group next door.
 */
export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
