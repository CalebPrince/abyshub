import Link from "next/link";

import { LEGAL } from "@/lib/config";

const pages = [
  { href: "/legal/terms", label: "Terms of Use" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/cookies", label: "Cookies" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-16">
      <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Legal pages" className="lg:sticky lg:top-32 lg:self-start">
          <p className="text-primary mb-4 text-[11px] font-semibold tracking-[0.24em] uppercase">
            Legal
          </p>
          <ul className="space-y-1">
            {pages.map((page) => (
              <li key={page.href}>
                <Link
                  href={page.href}
                  className="hover:bg-foreground/6 block rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/*
          Styled here rather than per page so the three read as one document.
          No typography plugin in use, hence the descendant selectors.
        */}
        <article
          className="max-w-2xl [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_h1]:font-display [&_h1]:mb-3 [&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:uppercase [&_h2]:font-display [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:uppercase [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_li]:leading-relaxed [&_p]:leading-relaxed [&_p]:text-pretty [&_p+p]:mt-3 [&_ul+h2]:mt-10 [&_ul+p]:mt-3 [&_ul]:mt-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:[list-style:disc]"
        >
          {children}
          <p className="text-muted-foreground border-foreground/12 mt-12 border-t pt-6 text-sm">
            Last updated {LEGAL.updated}.
          </p>
        </article>
      </div>
    </div>
  );
}
