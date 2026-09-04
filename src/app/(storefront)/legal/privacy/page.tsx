import Link from "next/link";
import type { Metadata } from "next";

import { CONTACT_EMAIL, LEGAL, STORE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${STORE_NAME} does with your personal information, and the rights you have over it.`,
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy</h1>
      <p className="text-muted-foreground text-lg">
        We ask for as little as we can, use it only to get your order to you,
        and never sell it.
      </p>

      <h2>Who is responsible</h2>
      <p>
        {LEGAL.entity}
        {LEGAL.address ? `, of ${LEGAL.address},` : ""} decides how the
        information described here is used. Reach us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> about anything
        on this page.
      </p>

      <h2>What we collect</h2>
      <p>Only what you type in, and only when you choose to send it:</p>
      <ul>
        <li>
          <strong>At checkout</strong>, your name, phone number, email address
          and delivery address, plus what you ordered.
        </li>
        <li>
          <strong>Through the enquiry form or the chat handoff</strong>, your
          name, a phone number or email, and whatever you tell us you need.
        </li>
        <li>
          <strong>If you message us on WhatsApp</strong>, the conversation
          itself, which lives in your WhatsApp account and ours.
        </li>
      </ul>
      <p>
        We do not run advertising pixels or third-party trackers on this site,
        and we do not build profiles of you.
      </p>
      <p>
        We do count how the shop is used, and we do it ourselves rather than
        handing it to anyone else. Which pages and products get looked at, what
        is searched for, what reaches a basket and which way people choose to
        pay are written to our own database. Those records carry a random id
        that your browser makes up for one tab and forgets when you close it,
        so they can be counted as a single visit. They are not linked to your
        name, your email or your orders, and if your browser sends a Do Not
        Track signal nothing is recorded at all.
      </p>

      <h3>What stays on your device</h3>
      <p>
        Your basket and your light or dark preference are kept in your
        browser&apos;s local storage. They never reach our servers, see the{" "}
        <Link href="/legal/cookies">cookies page</Link> for the detail.
      </p>

      <h3>The chat assistant</h3>
      <p>
        Messages you type to Mimi are answered by code running in your own
        browser. They are not transmitted to us and we cannot read them, so
        unless you use the &ldquo;talk to a person&rdquo; form, which sends what
        you asked along with your contact details so somebody can reply.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>To take payment, confirm your order and deliver it.</li>
        <li>To answer your questions and quote for bulk orders.</li>
        <li>To handle returns, faults and warranty claims.</li>
        <li>To keep the records that tax and accounting rules require.</li>
      </ul>
      <p>
        We rely on the need to perform our contract with you for order
        information, our legitimate interest in running the shop for enquiries
        and correspondence, and legal obligation for the records we must keep.
      </p>

      <h2>Who else sees it</h2>
      <ul>
        <li>
          <strong>Paystack</strong>, when you pay by card, they receive your
          email and the amount, and they handle the card details themselves. We
          receive back only whether the payment succeeded.
        </li>
        <li>
          <strong>The courier</strong> delivering your order, who needs your
          name, address and phone number.
        </li>
        <li>
          <strong>WhatsApp</strong>, if you choose to order or ask through it,
          under their own terms.
        </li>
        <li>
          Authorities, where the law requires us to hand something over.
        </li>
      </ul>
      <p>
        Nobody buys your information from us, because we do not sell it. Some of
        these providers operate outside {LEGAL.jurisdiction}, which means your
        information may be processed abroad under that provider&apos;s
        safeguards.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Order records are kept for as long as tax and accounting rules require,
        usually six years. Enquiries that do not turn into orders are cleared
        out once the conversation has run its course. Ask us to delete something
        sooner and we will, unless we are required to keep it.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the Data Protection Act, 2012 (Act 843) you can ask us to show you
        what we hold, correct anything wrong, delete it, stop using it for a
        particular purpose, or provide it in a portable form. Write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will come
        back to you.
      </p>
      <p>
        If you are not satisfied with how we have handled it, you can complain
        to Ghana&apos;s Data Protection Commission.
      </p>

      <h2>Keeping it safe</h2>
      <p>
        The site is served over HTTPS and card details never touch it, they go
        straight to Paystack. Access to order information is limited to the
        people who need it to fulfil your order. No system is perfectly secure,
        but we take this seriously and will tell you promptly if something goes
        wrong that affects you.
      </p>

      <h2>Children</h2>
      <p>
        This shop is intended for adults. We do not knowingly collect
        information from children. If you believe a child has sent us personal
        information, tell us and we will remove it.
      </p>

      <h2>Changes</h2>
      <p>
        If we start doing something new with your information, we will update
        this page and change the date below before we do it.
      </p>
    </>
  );
}
