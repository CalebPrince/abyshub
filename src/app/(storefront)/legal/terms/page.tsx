import Link from "next/link";
import type { Metadata } from "next";

import { CONTACT_EMAIL, LEGAL, STORE_NAME } from "@/lib/config";
import { formatPrice } from "@/lib/money";
import { getShopSettings } from "@/lib/shop/settings";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms you agree to when you use ${STORE_NAME} or place an order with us.`,
};

export default async function TermsPage() {
  // The figures the shop actually charges, not the build-time defaults: this
  // page is a statement of terms, so quoting a stale threshold is a promise
  // checkout will not keep.
  const settings = await getShopSettings();

  return (
    <>
      <h1>Terms of Use</h1>
      <p className="text-muted-foreground text-lg">
        These terms cover using this website and buying from us. By browsing the
        shop or placing an order you accept them.
      </p>

      <h2>Who you are dealing with</h2>
      <p>
        This shop is run by {LEGAL.entity}
        {LEGAL.registration ? `, registered as ${LEGAL.registration}` : ""}
        {LEGAL.address ? `, of ${LEGAL.address}` : ""}. You can reach us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <p>
        We are an independent retailer. Tupperware is a trademark of its owner
        and we are not affiliated with, endorsed by, or acting as an agent of
        that company. Product names and brands belong to their respective
        owners.
      </p>

      <h2>Using the site</h2>
      <p>
        You may browse, search and order for your own use or for a business you
        represent. Please do not attempt to interfere with the site, extract its
        contents in bulk, or use it to break the law.
      </p>

      <h2>Products and prices</h2>
      <ul>
        <li>
          Prices are shown in Ghana cedis and include no delivery charge until
          checkout.
        </li>
        <li>
          Delivery is {formatPrice(settings.deliveryFlatRate)}, and free once
          your basket passes {formatPrice(settings.freeDeliveryThreshold)}.
        </li>
        <li>
          Product photographs and illustrations are representative. Sizes,
          colours and packaging can differ slightly from what is shown.
        </li>
        <li>
          We try to keep stock and prices accurate, but mistakes happen. If an
          item is mispriced or turns out to be unavailable after you order, we
          will tell you and you can confirm at the corrected price or cancel for
          a full refund.
        </li>
      </ul>

      <h2>Placing an order</h2>
      <p>You can order in three ways, and all three reach the same people:</p>
      <ul>
        <li>Paying by card at checkout.</li>
        <li>Sending your basket to us on WhatsApp.</li>
        <li>
          Asking for a quote through the{" "}
          <Link href="/enquiry">enquiry form</Link>.
        </li>
      </ul>
      <p>
        An order you place is an offer to buy. A contract exists once we confirm
        the order, not when you submit it and not when a payment page loads. If
        we cannot fulfil an order we will say so and refund anything you have
        paid.
      </p>

      <h2>Payment</h2>
      <p>
        Card, bank transfer and USSD payments are processed by Paystack on their
        own pages. We never see or store your card number, PIN or one-time
        codes. Their terms apply to that part of the transaction alongside ours.
      </p>
      <p>
        Where you order by WhatsApp or by quote, we will confirm the total and
        how to pay before anything is dispatched.
      </p>

      <h2>Delivery</h2>
      <p>
        Orders confirmed before 3pm are dispatched the same working day. Any
        delivery date we give is an estimate, not a guarantee, we do not
        control the courier once a parcel leaves us. Risk in the goods passes to
        you on delivery.
      </p>
      <p>
        If nobody is available to receive a delivery and it comes back to us, we
        may ask you to cover the cost of sending it again.
      </p>

      <h2>Cancellations, returns and faults</h2>
      <ul>
        <li>
          Tell us before dispatch and we will cancel and refund the order in
          full.
        </li>
        <li>
          If something arrives faulty, damaged or is not what you ordered,
          contact us within a few days of delivery and we will arrange a
          replacement or a refund, including the cost of returning it.
        </li>
        <li>
          Goods returned because you changed your mind must be unused and in
          their original packaging, and the return postage is yours to cover.
        </li>
        <li>
          Nothing here limits any right you have under Ghanaian consumer law.
        </li>
      </ul>

      <h2>Manufacturer warranties</h2>
      <p>
        Tupperware products carry the manufacturer&apos;s warranty, including
        the lifetime seal warranty on the items it applies to. That warranty is
        given by the manufacturer, on their terms, and sits on top of your
        rights against us as the seller.
      </p>

      <h2>The chat assistant</h2>
      <p>
        Mimi, the assistant on this site, gives general information about stock,
        delivery and payment. Treat her answers as a guide, the price and
        availability confirmed on your order are what count. She cannot see your
        account or look up past orders.
      </p>

      <h2>Our content</h2>
      <p>
        The text, layout, illustrations and code on this site belong to{" "}
        {LEGAL.entity} unless stated otherwise. You may not copy or republish
        them commercially without our permission.
      </p>

      <h2>Liability</h2>
      <p>
        We stand behind what we sell, and we are responsible for loss we cause
        by failing to meet these terms or by lack of reasonable care. We are not
        responsible for losses that were not foreseeable, for business losses
        such as lost profit or opportunity, or for interruptions to the site
        itself. Nothing here excludes liability that cannot lawfully be
        excluded, including for death or personal injury caused by our
        negligence, or for fraud.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms as the shop changes. The version published
        when you place an order is the one that governs it.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of {LEGAL.jurisdiction}, and the
        courts of {LEGAL.jurisdiction} have jurisdiction over any dispute.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms go to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}
