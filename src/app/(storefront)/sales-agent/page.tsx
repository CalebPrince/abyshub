import type { Metadata } from "next";
import {
  BadgeCheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ComingSoon } from "@/components/store/coming-soon";

export const metadata: Metadata = {
  title: "Become a Sales Agent",
  description:
    "Sell Tupperware with Abys Hub. Register as a Tupperware demonstrator and earn on what you sell, in your own time.",
};

/**
 * The client's own recruiter link. Registering through it places the new
 * demonstrator in their unit, which is the whole point of using this one
 * rather than a generic sign-up.
 */
const REGISTER_URL = "https://amp.tuppafrica.co.za/register/62527/511";

const REASONS = [
  {
    icon: WalletIcon,
    title: "Earn on what you sell",
    body: "You buy at demonstrator price and keep the difference. The more the unit sells, the better the price gets.",
  },
  {
    icon: ClockIcon,
    title: "Your own hours",
    body: "Sell around a job, a class or a household. There is no shift and no minimum you have to be available for.",
  },
  {
    icon: BadgeCheckIcon,
    title: "Genuine stock",
    body: "Real Tupperware with the seal warranty intact — not a market copy you will have to make excuses for.",
  },
  {
    icon: UsersIcon,
    title: "You are not on your own",
    body: "You join our unit, so there is someone to ask when a customer asks something you have not met before.",
  },
];

/** Taken from the registration form itself, so nobody starts it twice. */
const NEEDED = [
  "Your full name as it appears on your ID",
  "Your ID or passport number",
  "Date of birth",
  "Email address and mobile number",
  "Your home address, town and postcode",
];

export default function SalesAgentPage() {
  return (
    <ComingSoon
      eyebrow="Become a Sales Agent"
      title="Sell with Abys Hub."
      blurb="Register as a Tupperware demonstrator through us and earn on what you sell, in your own time. It takes about ten minutes, and we will walk you through the rest once you are in."
      enquiry="Hello Abys Hub, I am interested in becoming a sales agent. Please tell me how it works."
    >
      <section className="mt-14">
        <h2 className="font-display text-2xl font-extrabold tracking-tight uppercase sm:text-3xl">
          Why people do it
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {REASONS.map((reason) => (
            <div
              key={reason.title}
              className="border-foreground/12 bg-background rounded-2xl border p-5"
            >
              <reason.icon className="text-primary size-5" aria-hidden />
              <p className="mt-3 font-semibold">{reason.title}</p>
              <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                {reason.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-extrabold tracking-tight uppercase sm:text-3xl">
          How it works
        </h2>
        <ol className="mt-6 space-y-5">
          {[
            {
              title: "Fill in the registration form",
              body: "It is Tupperware's own form, and it opens in a new tab so this page stays where it is. You will be registered into our unit.",
            },
            {
              title: "We get in touch",
              body: "Once it comes through, we contact you about your starter kit, prices and how ordering works.",
            },
            {
              title: "Start selling",
              body: "Sell to people you already know, or send them to us and we will handle delivery and payment for you.",
            },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold">
                {index + 1}
              </span>
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-foreground/12 bg-background mt-12 rounded-2xl border p-6">
        <p className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
          Have these ready
        </p>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          The form asks for all of this in one sitting, so it is worth having
          it beside you before you start.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {NEEDED.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" aria-hidden />
              {item}
            </li>
          ))}
        </ul>

        <Button asChild size="lg" className="mt-7 w-full sm:w-auto">
          <a href={REGISTER_URL} target="_blank" rel="noopener noreferrer">
            Register as a Tupperware demonstrator
            <ExternalLinkIcon className="size-4" aria-hidden />
          </a>
        </Button>
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          Opens Tupperware&apos;s registration form in a new tab. You will be
          registered under our unit, which is how we are able to support you.
          Not ready to sign up? Ask us anything first.
        </p>
      </section>
    </ComingSoon>
  );
}
