import type { Metadata } from "next";

import { CheckoutForm } from "@/components/store/checkout-form";
import { paystackConfigured } from "@/lib/paystack";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Abys Hub order by card, WhatsApp or enquiry.",
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-16">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Checkout
      </p>
      <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
        Almost yours
      </h1>

      <CheckoutForm paystackReady={paystackConfigured()} />
    </div>
  );
}
