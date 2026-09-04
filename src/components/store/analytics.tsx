"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { track } from "@/lib/analytics/track";

/**
 * Records a page view on first paint and on every client-side navigation.
 *
 * A product page reports twice on purpose: once as a page view so the funnel's
 * first step counts every visit, and once as a product view so the back office
 * can rank what people actually look at.
 */
export function Analytics() {
  const pathname = usePathname();

  React.useEffect(() => {
    track({ name: "page_view", path: pathname });

    const match = pathname.match(/^\/products\/([^/]+)$/);
    if (match) track({ name: "product_view", path: pathname, productSlug: match[1] });
  }, [pathname]);

  return null;
}
