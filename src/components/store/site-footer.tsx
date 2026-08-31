import Link from "next/link";
import { MailIcon, MessageCircleIcon } from "lucide-react";

import { Logo } from "@/components/store/logo";
import { getCategories } from "@/lib/shop/catalogue";
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

const linkClass =
  "text-background/65 hover:text-background text-sm transition-colors";

const headingClass =
  "text-[11px] font-semibold tracking-[0.18em] uppercase";

export async function SiteFooter() {
  const categories = await getCategories();

  return (
    <footer className="bg-primary text-primary-foreground mt-auto">
      <div className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,3.2fr)] lg:gap-16">
          <div className="space-y-4">
            <Logo tone="paper" />
            <p className="text-background/65 max-w-xs text-sm">
              Genuine Tupperware and everyday home goods, sold by people who use
              them. Order online, on WhatsApp, or ask us for a quote.
            </p>
          </div>

          {/* The menus sit two-up from the narrowest screen rather than
              stacking, and the category list flows into its own pair of
              columns. A catalogue that keeps growing widens the footer instead
              of pushing it further down the page. */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-5">
            <div className="col-span-2 space-y-4">
              <h3 className={headingClass}>Shop</h3>
              {/* Margin sits on the items, not as space-y on the list: in a
                  multi-column flow a top margin would land on whichever item
                  starts the second column and knock the two out of line. */}
              <ul className="columns-2 gap-x-8">
                {categories.map((category) => (
                  <li key={category.slug} className="mb-2.5 break-inside-avoid">
                    <Link
                      href={`/products?category=${category.slug}`}
                      className={linkClass}
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className={headingClass}>Ordering</h3>
              <ul className="space-y-2.5">
                {helpLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className={headingClass}>Legal</h3>
              <ul className="space-y-2.5">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className={headingClass}>Reach us</h3>
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
                    <MailIcon className="size-4" />{" "}
                    <span className="break-all">{CONTACT_EMAIL}</span>
                  </a>
                </li>
              </ul>
            </div>
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
