import type { Metadata } from "next";

import { ComingSoon } from "@/components/store/coming-soon";

export const metadata: Metadata = {
  title: "Media",
  description: "Photos, videos and press about Abys Hub.",
};

export default function MediaPage() {
  return (
    <ComingSoon
      eyebrow="Media"
      title="See it in use."
      blurb="Photos and videos of the range in real kitchens, plus anything written about us, will live here. We are gathering it now, if you are press or a creator wanting to work with us, get in touch."
      enquiry="Hello Abys Hub, I am getting in touch about media and working together."
    />
  );
}
