import type { Metadata } from "next";
import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";

import { SetupNotice } from "@/components/admin/setup-notice";
import { SettingsForm, type SettingField } from "@/components/admin/settings-form";
import { adminClientAvailable } from "@/lib/supabase/admin";
import { listPayments, getPaymentsSummary, listSettings } from "@/lib/crm/queries";
import { formatPrice } from "@/lib/money";
import { paystackConfigured } from "@/lib/paystack";
import { requireAdmin } from "@/lib/admin/dal";
import { getShopSettings } from "@/lib/shop/settings";

export const metadata: Metadata = { title: "Payments" };

const channelTone: Record<string, string> = {
  card: "bg-muted text-muted-foreground",
  whatsapp: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  manual: "bg-muted text-muted-foreground",
};

const groups: { title: string; blurb: string; fields: SettingField[] }[] = [
  {
    title: "Paystack public key",
    blurb:
      "Safe to use in the browser. Use the live key from Paystack now that the account is approved.",
    fields: [
      {
        key: "paystack_public_key",
        label: "Public key",
        hint: "Use pk_live_… for live payments or pk_test_… while testing.",
        placeholder: "pk_live_…",
      },
    ],
  },
  {
    title: "Pricing tiers",
    blurb:
      "What Paystack charges the customer, before their card ever sees a checkout page. Amounts are in minor units — 100000 is GH₵1,000.00 — and whole numbers only, so nothing is ever held as a float.",
    fields: [
      {
        key: "free_delivery_threshold",
        label: "Free delivery over",
        hint: "Orders at or above this subtotal skip the delivery charge entirely.",
        placeholder: "100000",
      },
      {
        key: "delivery_flat_rate",
        label: "Delivery charge",
        hint: "Added to every order under the free-delivery threshold.",
        placeholder: "3500",
      },
      {
        key: "price_markup_percent",
        label: "Import markup",
        hint: "Whole percent added to every partner price when it is converted to cedis at the day’s rate. 0 imports at the bare converted figure.",
        placeholder: "35",
      },
    ],
  },
];

const secrets = [
  {
    title: "Paystack credentials",
    blurb:
      "Held in a table no browser key can read — only the server can. Existing values are never shown here, not even to you: this form can set the key, not reveal it. Saving one here takes effect immediately, no redeploy needed.",
    fields: [
      {
        key: "paystack_secret_key",
        label: "Paystack secret key",
        hint: "sk_live_… for real charges, sk_test_… while testing.",
      },
    ] as SettingField[],
  },
];

export default async function AdminPaymentsPage() {
  await requireAdmin();

  const connected = adminClientAvailable();
  const [configured, payments, summary, shopSettings, { settings, secretsSet }] =
    await Promise.all([
      paystackConfigured(),
      listPayments(50),
      getPaymentsSummary(),
      getShopSettings(),
      listSettings(),
    ]);
  const webhookUrl = `${shopSettings.siteUrl.replace(/\/$/, "")}/api/paystack/webhook`;

  const values = Object.fromEntries(
    settings.map((row) => [row.key, row.value ?? ""])
  ) as Record<string, string>;

  const tiles = [
    { label: "Revenue received", value: formatPrice(summary.revenue) },
    { label: "Settled transactions", value: String(summary.count) },
    { label: "Average order", value: formatPrice(summary.averageOrder) },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>

      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Payments
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
        Every transaction here was written by the Paystack webhook when a
        charge settled — not when a customer clicked back to the site, so a
        closed tab still leaves a record. The pricing tiers below are what
        Paystack is asked to charge; change one and the very next checkout
        uses it.
      </p>

      <div className="border-border bg-card mt-6 rounded-xl border p-4">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
          Paystack webhook URL
        </p>
        <code className="mt-2 block overflow-x-auto text-sm font-semibold select-all">
          {webhookUrl}
        </code>
        <p className="text-muted-foreground mt-2 text-xs">
          Add this under Settings → API Keys &amp; Webhooks in your Paystack dashboard.
        </p>
      </div>

      {!connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : (
        <div
          className={`mt-8 flex items-start gap-3 rounded-xl border p-4 ${
            configured
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-amber-500/30 bg-amber-500/10"
          }`}
        >
          {configured ? (
            <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <CircleAlertIcon className="text-primary mt-0.5 size-5 shrink-0" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {configured ? "Paystack is connected" : "Paystack is not connected"}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {configured
                ? "A secret key is set, so card checkout and WhatsApp payment links both work."
                : "Add a secret key below to switch on card checkout. Until then customers can only order by WhatsApp or enquiry."}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="border-border bg-card rounded-xl border p-4">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
              {tile.label}
            </p>
            <p className="font-display mt-2 text-2xl font-extrabold tracking-tight">
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      <h2 className="font-display mt-10 text-lg font-extrabold tracking-tight uppercase">
        Transactions
      </h2>
      <div className="border-border mt-3 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Reference
              </th>
              <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Customer
              </th>
              <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Started via
              </th>
              <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Paid
              </th>
              <th className="p-3 text-right text-[11px] font-semibold tracking-[0.14em] uppercase">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground p-6 text-center">
                  No settled payments yet.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="p-3 font-mono text-xs">{payment.reference}</td>
                  <td className="p-3">
                    <p className="font-medium">{payment.name ?? "—"}</p>
                    <p className="text-muted-foreground text-xs">{payment.email}</p>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        channelTone[payment.channel] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {payment.channel}
                    </span>
                  </td>
                  <td className="text-muted-foreground p-3 text-xs whitespace-nowrap">
                    {new Date(payment.paid_at).toLocaleString("en-GH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="p-3 text-right font-semibold whitespace-nowrap">
                    {formatPrice(payment.total, payment.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {connected ? (
        <div className="mt-10">
          <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
            Tiers and credentials
          </h2>
          <SettingsForm
            groups={groups}
            secrets={secrets}
            values={values}
            secretsSet={secretsSet}
          />
        </div>
      ) : null}
    </div>
  );
}
