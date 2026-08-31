import type { Metadata } from "next";
import { Clock3Icon, MailIcon, MessageCircleIcon } from "lucide-react";

import { ContactForm } from "@/components/store/contact-form";
import { getShopSettings } from "@/lib/shop/settings";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Send Abys Hub a message about products, orders, delivery or anything else you need help with.",
};

export default async function ContactPage() {
  const shop = await getShopSettings();
  const whatsappHref = shop.whatsappEnabled
    ? `https://wa.me/${shop.whatsappNumber.replace(/\D/g, "")}`
    : null;

  return (
    <div className="bg-muted/25 min-h-[70vh]">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16 lg:px-8 lg:py-20">
        <section className="self-start lg:sticky lg:top-32">
          <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">Contact Abys Hub</p>
          <h1 className="font-display mt-4 max-w-lg text-4xl leading-[0.95] font-extrabold tracking-tight uppercase sm:text-6xl">
            Let’s sort it out together.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-md text-base leading-7">
            Product question, delivery update, bulk order or something else? Send one message and it lands with the team who can help.
          </p>

          <div className="mt-10 space-y-3">
            <ContactRoute icon={MailIcon} label="Email" value={shop.contactEmail} href={`mailto:${shop.contactEmail}`} />
            {whatsappHref ? <ContactRoute icon={MessageCircleIcon} label="WhatsApp" value={`+${shop.whatsappNumber.replace(/\D/g, "")}`} href={whatsappHref} /> : null}
            <ContactRoute icon={Clock3Icon} label="Response time" value="Usually within one business day" />
          </div>
        </section>

        <ContactForm />
      </div>
    </div>
  );
}

function ContactRoute({ icon: Icon, label, value, href }: {
  icon: typeof MailIcon;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-4">
      <span className="border-foreground/10 bg-background grid size-11 place-items-center rounded-full border"><Icon className="text-primary size-4" /></span>
      <span><span className="text-muted-foreground block text-[10px] font-bold tracking-[0.15em] uppercase">{label}</span><span className="mt-0.5 block text-sm font-semibold">{value}</span></span>
    </div>
  );
  return href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener" : undefined} className="block rounded-xl py-1 transition-transform hover:translate-x-1">{content}</a> : content;
}
