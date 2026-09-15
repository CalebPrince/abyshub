import type { NextConfig } from "next";

/**
 * Product photographs uploaded from the admin live in Supabase Storage, and
 * next/image refuses any host it has not been told about.
 *
 * Scoped to the storage path of one project rather than opening the whole
 * host: the pattern is built from NEXT_PUBLIC_SUPABASE_URL, so a different
 * project cannot have its images proxied through this site's optimiser.
 */
const supabaseHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    // A malformed value must not fail the build — that lesson is already
    // learned once in lib/config.ts.
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https" as const,
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/product-images/**",
          },
        ]
      : [],
    // Next's own default ("attachment") tells a link-preview crawler to
    // download the image rather than render it, which along with Supabase
    // Storage's own `x-robots-tag: none` on every object is why WhatsApp and
    // Facebook show a bare link for a product with a perfectly good photo:
    // product pages route og:image through the optimiser (below) specifically
    // to shed that header, so it must not hand back a different one of its own.
    contentDispositionType: "inline",
  },
};

export default nextConfig;
