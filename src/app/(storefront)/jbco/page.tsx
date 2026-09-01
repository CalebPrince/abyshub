import type { Metadata } from "next";

import { ComingSoon } from "@/components/store/coming-soon";

export const metadata: Metadata = {
  title: "JBCO",
  description: "Jamaican Black Castor Oil is coming to Abys Hub. Ask us about sizes, pricing and availability.",
};

export default function JbcoPage() {
  return (
    <ComingSoon
      eyebrow="JBCO"
      title="Jamaican Black Castor Oil."
      blurb="Our JBCO range is being put together now — the real thing, for hair and skin, in sizes that make sense for a household. Ask us what you are after and we will let you know the moment it is on the shelf."
      enquiry="Hello Abys Hub, I would like to know about your JBCO (Jamaican Black Castor Oil) range."
    />
  );
}
