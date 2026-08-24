import type { Metadata } from "next";

import { CartView } from "@/components/store/cart-view";

export const metadata: Metadata = {
  title: "Your basket",
  description: "Review your Abys Hub basket before ordering.",
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-16">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Basket
      </p>
      <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
        Your basket
      </h1>
      <CartView />
    </div>
  );
}
