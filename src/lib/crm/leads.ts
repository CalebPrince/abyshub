import "server-only";

import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";

export type LeadInput = {
  name: string;
  email?: string;
  phone?: string;
  details: string;
  basketSummary?: string;
  source: "enquiry" | "chat" | "whatsapp" | "manual";
};

/**
 * Writes an enquiry as a lead, and links it to a customer record when there is
 * an email to match on — so someone who enquires and later buys shows up as one
 * person rather than two.
 *
 * Returns a result rather than throwing: an enquiry that fails to save must
 * still be acknowledged to the person who sent it. Losing a lead is bad;
 * telling a customer their message failed when we simply could not file it is
 * worse.
 */
export async function recordLead(input: LeadInput) {
  if (!adminClientAvailable()) {
    return { ok: false as const, error: "Supabase service role is not configured." };
  }

  const supabase = createAdminClient();
  const email = input.email?.trim().toLowerCase() || null;

  let customerId: string | null = null;

  if (email) {
    const { data: customer } = await supabase
      .from("customers")
      .upsert(
        {
          email,
          name: input.name || null,
          phone: input.phone || null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      )
      .select("id")
      .maybeSingle();

    customerId = customer?.id ?? null;
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      customer_id: customerId,
      name: input.name,
      email,
      phone: input.phone || null,
      details: input.details,
      basket_summary: input.basketSummary || null,
      source: input.source,
      stage: "new",
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Lead was not written." };
  }

  return { ok: true as const, leadId: data.id };
}
