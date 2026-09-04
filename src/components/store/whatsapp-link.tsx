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
  onClick,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  /** Fires before the browser leaves for WhatsApp. */
  onClick?: () => void;
}) {
  if (!whatsappEnabled) return null;

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={className}
    >
      {children}
    </a>
  );
}
