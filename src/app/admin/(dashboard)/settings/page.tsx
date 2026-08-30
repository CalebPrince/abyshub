import type { Metadata } from "next";
import Link from "next/link";
import { CreditCardIcon } from "lucide-react";
import { SetupNotice } from "@/components/admin/setup-notice";
import { SettingsForm, type SettingField } from "@/components/admin/settings-form";
import { adminClientAvailable } from "@/lib/supabase/admin";
import { listSettings } from "@/lib/crm/queries";
import { requireAdmin } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Settings" };

const groups: { title: string; blurb: string; fields: SettingField[] }[] = [
  {
    title: "Shop",
    blurb: "How the shop introduces itself and where people reach you.",
    fields: [
      { key: "site_url", label: "Site URL", placeholder: "https://abyshub.com" },
      { key: "contact_email", label: "Contact email", placeholder: "orders@abyshub.com" },
      {
        key: "resend_from_email",
        label: "Resend sender email",
        hint: "Must use a domain verified in Resend, for example Abys Hub <orders@abyshub.com>.",
        placeholder: "Abys Hub <orders@abyshub.com>",
      },
      {
        key: "whatsapp_number",
        label: "WhatsApp number",
        hint: "Digits only, with country code. Blank hides WhatsApp ordering.",
        placeholder: "233XXXXXXXXX",
      },
    ],
  },
  {
    title: "Lisa",
    blurb:
      "The assistant on the storefront and on WhatsApp. Both read the same catalogue, prices and delivery rules, so the two cannot answer differently. API keys live under Credentials below.",
    fields: [
      {
        key: "elevenlabs_agent_id",
        label: "ElevenLabs agent ID",
        placeholder: "agent_…",
      },
      {
        key: "whatsapp_business_number",
        label: "WhatsApp Business number",
        placeholder: "233…",
      },
    ],
  },
  {
    title: "Legal",
    blurb: "Printed on the terms, privacy and cookie pages.",
    fields: [
      { key: "legal_entity", label: "Registered name" },
      { key: "business_address", label: "Business address" },
      { key: "business_registration", label: "Registration number" },
      { key: "jurisdiction", label: "Jurisdiction", placeholder: "Ghana" },
    ],
  },
];

const secrets: { title: string; blurb: string; fields: SettingField[] }[] = [
  {
    title: "Credentials",
    blurb:
      "Held in a table no browser key can read — only the server can. Order notifications use Resend and are delivered to the Contact email above. The Paystack secret key remains on the Payments page.",
    fields: [
      {
        key: "resend_api_key",
        label: "Resend API key",
        hint: "Create a sending-access key in Resend. It begins re_.",
      },
    ],
  },
  {
    // Three keys rather than one because Lisa tries them in order and stops at
    // the first that answers. They bill separately, so all three being out of
    // credit at the same moment is the only thing that silences her — and any
    // one of them on its own is enough to run.
    title: "Lisa's AI providers",
    blurb:
      "Lisa answers from whichever of these responds first, in the order shown. Leave one blank and it is skipped. With none set she falls back to the scripted replies, which never invent stock or a price.",
    fields: [
      {
        key: "gemini_api_key",
        label: "Google Gemini API key",
        hint: "Tried first — fastest and the most generous free tier. From aistudio.google.com.",
      },
      {
        key: "anthropic_api_key",
        label: "Anthropic API key",
        hint: "Tried second. Best at following the shop's rules exactly. Begins sk-ant-.",
      },
      {
        key: "groq_api_key",
        label: "Groq API key",
        hint: "Tried last, and the one still standing when the other two are out of credit. Begins gsk_.",
      },
    ],
  },
  {
    // ElevenLabs runs the WhatsApp conversation on its own servers, so these
    // are what let it reach back for Lisa's current prompt and tools instead
    // of answering from a prompt pasted into its dashboard months ago.
    title: "Lisa on WhatsApp and voice",
    blurb:
      "ElevenLabs hosts the WhatsApp agent against the shop's Meta Business number. The webhook secret is what proves an inbound request is really ElevenLabs — without it the webhooks refuse every call, which is the safe default.",
    fields: [
      {
        key: "elevenlabs_api_key",
        label: "ElevenLabs API key",
        hint: "From elevenlabs.io → Developers → API keys. Needed for voice and to read the agent back.",
      },
      {
        key: "elevenlabs_webhook_secret",
        label: "ElevenLabs webhook secret",
        hint: "Any long random string. Paste the same value into the agent's webhook settings — the two must match.",
      },
    ],
  },
];

export default async function AdminSettingsPage() {
  await requireAdmin();

  const connected = adminClientAvailable();
  const { settings, secretsSet } = await listSettings();

  const values = Object.fromEntries(
    settings.map((row) => [row.key, row.value ?? ""])
  ) as Record<string, string>;

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Settings
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Stored in the database and read by the shop, so changing one does not
        mean editing an environment variable and waiting for a rebuild. An
        environment variable is still the fallback wherever a value is blank.
      </p>

      <Link
        href="/admin/payments"
        className="border-border bg-card hover:border-primary/40 mt-6 flex items-center gap-3 rounded-xl border p-4 text-sm transition-colors"
      >
        <CreditCardIcon className="text-primary size-5 shrink-0" />
        <span>
          <span className="font-semibold">Delivery charges and Paystack</span>{" "}
          <span className="text-muted-foreground">
            moved to the Payments page — pricing tiers next to the transactions they charge.
          </span>
        </span>
      </Link>

      {!connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : (
        <SettingsForm
          groups={groups}
          secrets={secrets}
          values={values}
          secretsSet={secretsSet}
        />
      )}
    </div>
  );
}
