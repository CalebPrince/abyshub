import type { Metadata } from "next";

import { ComingSoon } from "@/components/store/coming-soon";

export const metadata: Metadata = {
  title: "JIBU Water",
  description: "JIBU purified drinking water is coming to Abys Hub. Ask us about availability and bulk orders.",
};

export default function JibuWaterPage() {
  return (
    <ComingSoon
      eyebrow="JIBU Water"
      title="Clean water, on its way."
      blurb="We are bringing JIBU purified drinking water to Abys Hub — refills and bulk orders for homes, offices and events. Tell us what you need and we will come back to you with sizes and pricing as soon as it lands."
      enquiry="Hello Abys Hub, I would like to know about JIBU Water — sizes, pricing and delivery."
    />
  );
}
