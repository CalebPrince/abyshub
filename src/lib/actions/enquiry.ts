"use server";

import { CONTACT_EMAIL } from "@/lib/config";
import { resolveLines } from "@/lib/totals";
import type { CartItem } from "@/lib/types";

export type EnquiryState = {
  status: "idle" | "sent" | "error";
  message: string | null;
};

function text(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitEnquiry(
  _previous: EnquiryState,
  formData: FormData
): Promise<EnquiryState> {
  const name = text(formData, "name");
  const email = text(formData, "email");
  const phone = text(formData, "phone");
  const details = text(formData, "details");
  // The chat handoff sends the conversation as `details` and anything the
  // person typed as `note`; the enquiry page sends `details` alone.
  const note = text(formData, "note");
  const fullDetails = note ? `${details}\n\nThey added: ${note}` : details;

  if (!name || !details || (!email && !phone)) {
    return {
      status: "error",
      message:
        "We need your name, what you are after, and either an email or a phone number.",
    };
  }

  if (email && !email.includes("@")) {
    return { status: "error", message: "That email address looks wrong." };
  }

  // A basket may or may not be attached — the form works from a cold start too.
  let basketSummary = "No basket attached.";
  const rawCart = formData.get("cart");
  if (typeof rawCart === "string" && rawCart.length > 0) {
    try {
      const parsed: unknown = JSON.parse(rawCart);
      if (Array.isArray(parsed)) {
        const lines = resolveLines(parsed as CartItem[]);
        if (lines.length > 0) {
          basketSummary = lines
            .map((line) => `${line.product.name} x${line.quantity}`)
            .join(", ");
        }
      }
    } catch {
      // A malformed basket should not stop the enquiry going through.
    }
  }

  // TODO: send this to your inbox (Resend, Postmark, Paystack-adjacent CRM…)
  // or write it to a database. Logging keeps the flow honest until then.
  console.info("[enquiry] new enquiry", {
    name,
    email,
    phone,
    details: fullDetails,
    basketSummary,
    forwardTo: CONTACT_EMAIL,
  });

  return {
    status: "sent",
    message:
      "Thank you — we have your enquiry and will come back to you with a price.",
  };
}
