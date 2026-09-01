import type { Metadata } from "next";

import { ComingSoon } from "@/components/store/coming-soon";

export const metadata: Metadata = {
  title: "Become a Sales Agent",
  description: "Sell Tupperware with Abys Hub. Ask us how to become a sales agent.",
};

export default function SalesAgentPage() {
  return (
    <ComingSoon
      eyebrow="Become a Sales Agent"
      title="Sell with Abys Hub."
      blurb="If you want to earn by selling genuine Tupperware and our home range, we would like to hear from you. The full terms are being written up — send us a message and we will walk you through how it works."
      enquiry="Hello Abys Hub, I am interested in becoming a sales agent. Please tell me how it works."
    />
  );
}
