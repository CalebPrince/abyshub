import type { Metadata } from "next";
import { ExternalLinkIcon } from "lucide-react";

import { ComingSoon } from "@/components/store/coming-soon";

export const metadata: Metadata = {
  title: "Become a Sales Agent",
  description: "Sell Tupperware with Abys Hub, or register directly with Tupperware as an independent consultant.",
};

/** Tupperware's own sign-up for independent consultants. */
const TUPPERWARE_JOIN_URL = "https://www.tupperware.com/pages/join-us";

export default function SalesAgentPage() {
  return (
    <ComingSoon
      eyebrow="Become a Sales Agent"
      title="Sell with Abys Hub."
      blurb="If you want to earn by selling genuine Tupperware and our home range, we would like to hear from you. The full terms are being written up — send us a message and we will walk you through how it works."
      enquiry="Hello Abys Hub, I am interested in becoming a sales agent. Please tell me how it works."
    >
      <div className="border-foreground/12 bg-background mt-12 rounded-2xl border p-6">
        <p className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
          Register with Tupperware
        </p>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          You can also sign up with Tupperware directly as an independent sales
          consultant, on their own site.
        </p>
        <a
          href={TUPPERWARE_JOIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground mt-4 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
        >
          Register as a Tupperware consultant
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </a>
        {/* Said plainly rather than discovered after paying: the kit on that
            page is priced in USD and CAD, and Tupperware has no Ghana sign-up
            of its own — the authorised distributor here sells through social
            media. Anyone in Ghana is better off starting with us. */}
        <p className="text-muted-foreground mt-4 text-xs leading-5">
          Tupperware runs that programme for the US and Canada, and the starter
          kit is priced in dollars. If you are in Ghana, talk to us first.
        </p>
      </div>
    </ComingSoon>
  );
}
