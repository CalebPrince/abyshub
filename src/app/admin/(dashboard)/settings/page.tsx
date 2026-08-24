import type { Metadata } from "next";
import { ShieldAlertIcon } from "lucide-react";

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
        key: "whatsapp_number",
        label: "WhatsApp number",
        hint: "Digits only, with country code. Blank hides WhatsApp ordering.",
        placeholder: "233XXXXXXXXX",
      },
    ],
  },
  {
    title: "Money and delivery",
    blurb:
      "Amounts are in minor units — 50000 is GH₵500.00. Whole numbers only, so nothing is ever held as a float.",
    fields: [
      { key: "currency", label: "Currency", placeholder: "GHS" },
      { key: "locale", label: "Locale", placeholder: "en-GH" },
      {
        key: "free_delivery_threshold",
        label: "Free delivery over",
        placeholder: "50000",
      },
      { key: "delivery_flat_rate", label: "Delivery charge", placeholder: "3500" },
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

const secrets = {
  title: "Credentials",
  blurb:
    "Held in a table no browser key can read — only the server can. Existing values are never shown here, not even to you: this form can set a credential, not reveal one.",
  fields: [
    { key: "paystack_secret_key", label: "Paystack secret key", hint: "sk_live_… or sk_test_…" },
    { key: "smtp_host", label: "SMTP host" },
    { key: "smtp_user", label: "SMTP username" },
    { key: "smtp_password", label: "SMTP password" },
  ] as SettingField[],
};

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
        Stored in the database, so changing one does not mean editing an
        environment variable and waiting for a rebuild.
      </p>

      <div className="border-border bg-muted/40 mt-6 flex items-start gap-3 rounded-xl border border-dashed p-4">
        <ShieldAlertIcon className="text-primary mt-0.5 size-5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Environment variables still win</p>
          <p className="text-muted-foreground mt-1">
            Nothing here is read by the running code yet — the shop is still
            served by its environment variables. These values are stored and
            editable, and wiring each one across is the next step. Setting a
            credential here does not switch payments over.
          </p>
        </div>
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
