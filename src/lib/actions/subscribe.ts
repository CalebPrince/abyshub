"use server";

import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";

export type SubscribeState = {
  status: "idle" | "sent" | "error";
  message: string | null;
};

/**
 * Deliberately loose: the address only has to be plausible enough to be worth
 * storing. A stricter pattern rejects valid addresses, and the real test is
 * whether the first offer email arrives.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function subscribeToOffers(
  _previous: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim() : "";
  const rawSource = formData.get("source");
  const source = typeof rawSource === "string" && rawSource ? rawSource : "welcome_modal";

  if (!email) {
    return { status: "error", message: "Enter your email address." };
  }
  if (!EMAIL.test(email)) {
    return { status: "error", message: "That email address looks wrong." };
  }

  if (!adminClientAvailable()) {
    console.error("[subscribe] Supabase service role is not configured", { email });
    return {
      status: "error",
      message: "We could not save that just now. Please try again later.",
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("offer_subscribers")
    .insert({ email, source });

  if (error) {
    // 23505 is the unique index on the normalised address. Someone signing up
    // twice has done nothing wrong and should be thanked, not corrected.
    if (error.code === "23505") {
      return { status: "sent", message: "You are already on the list — offers are on their way." };
    }
    console.error("[subscribe] could not record subscriber", error.message, { email });
    return {
      status: "error",
      message: "We could not save that just now. Please try again later.",
    };
  }

  return {
    status: "sent",
    message: "You are on the list. Discount offers will land in your inbox.",
  };
}
