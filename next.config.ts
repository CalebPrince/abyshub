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
  },
};

export default nextConfig;
