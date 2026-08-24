import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { requireAdmin } from "@/lib/admin/dal";
import { getCatalogue } from "@/lib/shop/catalogue";
import { WhatsAppOrderForm } from "@/components/admin/whatsapp-order-form";

export const metadata: Metadata = { title: "New WhatsApp order" };

export default async function NewWhatsAppOrderPage() {
  await requireAdmin();

  const { products } = await getCatalogue();

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/orders"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeftIcon className="size-4" /> Orders
      </Link>

      <p className="text-primary mt-4 text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        New WhatsApp order
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Build an order from a WhatsApp conversation — pick products, set a
        price per line for bulk pricing, and get a payment link to send back.
      </p>

      <WhatsAppOrderForm products={products} />
    </div>
  );
}
