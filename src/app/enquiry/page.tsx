import type { Metadata } from "next";

import { EnquiryForm } from "@/components/store/enquiry-form";

export const metadata: Metadata = {
  title: "Request a quote",
  description:
    "Buying Tupperware in bulk or for an event? Tell Abys Hub what you need and we will price it.",
};

export default function EnquiryPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-16">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Enquiry
      </p>
      <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
        Tell us what
        <br className="hidden sm:block" /> you need
      </h1>
      <p className="text-muted-foreground mt-4 max-w-lg">
        For bulk orders, gifting and events. We reply with a price including
        delivery, usually the same day.
      </p>

      <EnquiryForm />
    </div>
  );
}
