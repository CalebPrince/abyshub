import type { Metadata } from "next";

import { ComingSoon } from "@/components/store/coming-soon";

export const metadata: Metadata = {
  title: "Monthly Offers",
  description: "This month's Tupperware offers from Abys Hub.",
};

export default function OffersPage() {
  return (
    <ComingSoon
      eyebrow="Monthly Offers"
      title="This month's offers."
      blurb="Every month we put together a short list of Tupperware sets at a better price than usual. The next one is being finalised, ask us what is on it, or check the discounted items already in the shop."
      enquiry="Hello Abys Hub, what are this month's Tupperware offers?"
    />
  );
}
