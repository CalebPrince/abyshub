import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2Icon, CreditCardIcon, XCircleIcon } from "lucide-react";
import { SetupNotice } from "@/components/admin/setup-notice";
import { SettingsForm, type SettingField } from "@/components/admin/settings-form";
import { adminClientAvailable } from "@/lib/supabase/admin";
import { listSettings } from "@/lib/crm/queries";
import { getShopSettings } from "@/lib/shop/settings";
import { readAgentStatus, type AgentStatus } from "@/lib/chat/agent-status";
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
    title: "Mimi",
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
      {
        key: "elevenlabs_voice_id",
        label: "Website voice ID",
        hint: "From elevenlabs.io → Voices. Blank means Mimi uses the browser's own voice on the site; WhatsApp is unaffected either way.",
        placeholder: "21m00Tcm4TlvDq8ikWAM",
      },
      {
        key: "elevenlabs_tts_model",
        label: "Website voice model",
        hint: "Leave blank for eleven_flash_v2_5. This speaks a reply the customer is already reading, so latency matters more than fidelity.",
        placeholder: "eleven_flash_v2_5",
      },
    ],
  },
  {
    title: "Owner",
    blurb:
      "Who runs the shop. Mimi compares these numbers against the caller on WhatsApp so she knows when she is talking to you rather than to a customer — the numbers themselves never reach her, only the answer.",
    fields: [
      { key: "owner_name", label: "Owner name", placeholder: "Gladys Ayertey" },
      {
        key: "owner_whatsapp",
        label: "Owner WhatsApp number",
        hint: "Digits with country code. Blank means Mimi treats every caller as a customer.",
        placeholder: "233XXXXXXXXX",
      },
      {
        key: "owner_phone",
        label: "Owner phone number",
        hint: "A second number to recognise, if you message from more than one.",
        placeholder: "233XXXXXXXXX",
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
    title: "Mimi's AI providers",
    blurb:
      "Mimi answers from whichever of these responds first, in the order shown. Leave one blank and it is skipped. With none set she falls back to the scripted replies, which never invent stock or a price.",
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
    title: "Mimi on WhatsApp and voice",
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
      {
        key: "elevenlabs_postcall_signing_secret",
        label: "Post-call signing secret",
        hint: "Generated by ElevenLabs when you add the post-call webhook, and shown once. Begins wsec_. That webhook is signed rather than sent with a header, so without this no transcript is ever stored.",
      },
    ],
  },
];

export default async function AdminSettingsPage() {
  await requireAdmin();

  const connected = adminClientAvailable();
  const [{ settings, secretsSet }, shop] = await Promise.all([
    listSettings(),
    getShopSettings(),
  ]);
  const agentStatus = await readAgentStatus();

  // Built from the shop's own origin rather than written out, so they stay
  // right on a preview deployment and cannot drift from the live site.
  const origin = shop.siteUrl.replace(/\/$/, "");
  const elevenLabsHooks = [
    {
      label: "Conversation initiation",
      url: `${origin}/api/whatsapp/elevenlabs-init`,
      note: "Hands the agent Mimi's current prompt and the earlier conversation.",
    },
    {
      label: "Server tools",
      url: `${origin}/api/whatsapp/elevenlabs-tool`,
      note: "One URL for all four tools — each is configured separately in the agent and sends its own name.",
    },
    {
      label: "Post-call",
      url: `${origin}/api/whatsapp/elevenlabs-post-call`,
      note: "Stores the transcript. Signed with the secret ElevenLabs generates when you add it — not the shared one. Without it every conversation starts amnesiac.",
    },
  ];

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

      <div className="border-border bg-card mt-6 rounded-xl border p-4">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
          ElevenLabs webhook URLs
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Paste these into the WhatsApp agent in ElevenLabs. The first two
          authenticate with the header{" "}
          <code className="font-semibold">X-ElevenLabs-Secret</code>, set to the
          webhook secret below. The tool URL can carry it as{" "}
          <code className="font-semibold">?secret=…</code> instead, and usually
          should: ElevenLabs does not reliably send custom headers on tool
          calls, which leaves Mimi talking but unable to look anything up. The
          post-call webhook is signed rather than sent with a header — paste the
          secret ElevenLabs generates for it into the post-call signing secret
          field below.
        </p>
        <dl className="mt-4 space-y-4">
          {elevenLabsHooks.map((hook) => (
            <div key={hook.url}>
              <dt className="text-[11px] font-semibold tracking-[0.14em] uppercase">
                {hook.label}
              </dt>
              <dd>
                <code className="mt-1 block overflow-x-auto text-sm font-semibold select-all">
                  {hook.url}
                </code>
                <p className="text-muted-foreground mt-1 text-xs">{hook.note}</p>
              </dd>
            </div>
          ))}
        </dl>
        <AgentStatusLine status={agentStatus} />
      </div>

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

/**
 * The live state of the WhatsApp agent, printed under the URLs it verifies.
 *
 * Prompt overrides get their own line rather than a footnote because it is the
 * failure that looks like success: the webhooks fire, Lisa answers, and every
 * answer is from an empty default because ElevenLabs discarded the prompt.
 */
function AgentStatusLine({ status }: { status: AgentStatus }) {
  if (status.state === "unconfigured") {
    return (
      <p className="text-muted-foreground mt-4 text-xs">
        {status.detail} Fill in the agent ID and API key below and this line
        will say whether the agent answers.
      </p>
    );
  }

  if (status.state === "error") {
    return (
      <p className="text-destructive mt-4 flex items-start gap-1.5 text-xs">
        <XCircleIcon className="mt-px size-3.5 shrink-0" />
        <span>{status.detail}</span>
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-1.5 text-xs">
      <p className="flex items-start gap-1.5 text-emerald-600">
        <CheckCircle2Icon className="mt-px size-3.5 shrink-0" />
        <span>
          Reached the agent <span className="font-semibold">{status.name}</span>.
        </span>
      </p>
      {status.overridesPrompt ? (
        <p className="flex items-start gap-1.5 text-emerald-600">
          <CheckCircle2Icon className="mt-px size-3.5 shrink-0" />
          <span>System-prompt overrides are on, so Mimi gets the live prompt.</span>
        </p>
      ) : (
        <p className="text-destructive flex items-start gap-1.5">
          <XCircleIcon className="mt-px size-3.5 shrink-0" />
          <span>
            System-prompt overrides are off. ElevenLabs will ignore the prompt
            sent by the init webhook and answer from its own empty default —
            turn them on in the agent&rsquo;s security settings.
          </span>
        </p>
      )}
    </div>
  );
}
