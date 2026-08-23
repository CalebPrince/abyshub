import Link from "next/link";
import type { Metadata } from "next";

import { CONTACT_EMAIL, STORE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "Cookies",
  description: `${STORE_NAME} sets no cookies. Here is exactly what this site does store, and where.`,
};

export default function CookiesPage() {
  return (
    <>
      <h1>Cookies</h1>
      <p className="text-muted-foreground text-lg">
        This site sets no cookies at all. Two small things are stored in your
        browser, both of which stay on your device.
      </p>

      <h2>Why there is no banner</h2>
      <p>
        Consent banners exist because most shops load advertising and analytics
        trackers. We load none — no Google Analytics, no advertising pixels, no
        social media widgets, no third-party scripts of any kind. The typefaces
        are served from our own domain rather than fetched from a font provider,
        so even loading a page tells nobody but us that you visited.
      </p>

      <h2>What is stored on your device</h2>
      <p>
        Both of these use your browser&apos;s local storage, not cookies. Local
        storage is never attached to network requests, so unlike a cookie it is
        never transmitted to us or to anyone else.
      </p>
      <ul>
        <li>
          <strong>
            <code>abyshub.cart.v1</code>
          </strong>{" "}
          — what is in your basket, so it survives a reload and follows you
          between tabs. It holds product references and quantities. No personal
          details, no payment information.
        </li>
        <li>
          <strong>
            <code>theme</code>
          </strong>{" "}
          — whether you chose light, dark or system appearance.
        </li>
      </ul>
      <p>
        Both persist until you clear them. Neither identifies you, and neither
        is shared.
      </p>

      <h2>Clearing them</h2>
      <p>
        Clearing site data for this domain in your browser settings removes
        both. Emptying your basket on the{" "}
        <Link href="/cart">basket page</Link> clears the first one on its own.
        Private or incognito windows discard everything when you close them —
        the shop still works, your basket just will not be there next time.
      </p>

      <h2>When you leave the site</h2>
      <p>
        Two places you can go from here do use cookies, under their own policies
        rather than ours:
      </p>
      <ul>
        <li>
          <strong>Paystack</strong>, if you pay by card. Their payment page is
          on their domain and sets what it needs to process the transaction
          securely.
        </li>
        <li>
          <strong>WhatsApp</strong>, if you order or ask a question through it.
        </li>
      </ul>
      <p>
        We have no control over, and no access to, whatever those services
        store.
      </p>

      <h2>If this changes</h2>
      <p>
        Adding anything that sets a cookie or tracks visitors would mean
        updating this page — and asking for your consent first where the law
        requires it. Questions to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}
