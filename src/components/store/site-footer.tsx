import Link from "next/link";
import { MailIcon, MessageCircleIcon } from "lucide-react";

import { Logo } from "@/components/store/logo";
import { categories } from "@/lib/products";
import {
  CONTACT_EMAIL,
  STORE_NAME,
  WHATSAPP_NUMBER,
  whatsappEnabled,
} from "@/lib/config";

const helpLinks = [
  { href: "/products", label: "Everything" },
  { href: "/cart", label: "Your basket" },
  { href: "/checkout", label: "Checkout" },
  { href: "/enquiry", label: "Request a quote" },
];

const legalLinks = [
  { href: "/legal/terms", label: "Terms of Use" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/cookies", label: "Cookies" },
];

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background mt-auto">
      <div className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-4">
            <Logo className="[&_span:first-child]:bg-background [&_span:first-child]:text-foreground text-background" />
            <p className="text-background/65 max-w-xs text-sm">
              Genuine Tupperware and everyday home goods, sold by people who use
              them. Order online, on WhatsApp, or ask us for a quote.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[11px] font-semibold tracking-[0.18em] uppercase">
              Shop
            </h3>
            <ul className="space-y-2.5">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/products?category=${category.slug}`}
                    className="text-background/65 hover:text-background text-sm transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-[11px] font-semibold tracking-[0.18em] uppercase">
              Ordering
            </h3>
            <ul className="space-y-2.5">
              {helpLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-background/65 hover:text-background text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-[11px] font-semibold tracking-[0.18em] uppercase">
              Legal
            </h3>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-background/65 hover:text-background text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-[11px] font-semibold tracking-[0.18em] uppercase">
              Reach us
            </h3>
            <ul className="space-y-2.5 text-sm">
              {whatsappEnabled && (
                <li>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-background/65 hover:text-background inline-flex items-center gap-2 transition-colors"
                  >
                    <MessageCircleIcon className="size-4" /> WhatsApp us
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-background/65 hover:text-background inline-flex items-center gap-2 transition-colors"
                >
                  <MailIcon className="size-4" /> {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-background/15 text-background/50 mt-14 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {STORE_NAME}. Tupperware is a trademark
            of its owner; we are an independent retailer.
          </p>
          <p>
            Built by{" "}
            <a
              href="https://princecaleb.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-background/80 hover:text-background underline underline-offset-4 transition-colors"
            >
              princecaleb.dev
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
