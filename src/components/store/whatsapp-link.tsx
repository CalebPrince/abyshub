"use client";

import * as React from "react";

import { WHATSAPP_NUMBER, whatsappEnabled } from "@/lib/config";

/**
 * Wraps children in a wa.me link with a prefilled message. Renders nothing when
 * no number is configured, so the option disappears rather than 404s.
 */
export function WhatsAppLink({
  message,
  children,
  className,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!whatsappEnabled) return null;

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
