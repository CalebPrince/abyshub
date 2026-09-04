"use client";

import type { SiteEvent } from "@/lib/analytics/events";

const SESSION_KEY = "abyshub.session.v1";
const SOURCE_KEY = "abyshub.source.v1";

type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
};

/** Best effort throughout: storage can throw in a private window. */
function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Nothing to do. The visit simply goes uncounted.
  }
}

/**
 * A random id for this tab, in sessionStorage rather than a cookie: it is
 * never sent as a header, never shared across sites, and is gone when the tab
 * closes. Enough to join one visit's events together, useless afterwards.
 */
function sessionId(): string {
  const existing = read(SESSION_KEY);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  write(SESSION_KEY, id);
  return id;
}

/**
 * Where this visit came from, captured once and replayed on every later event,
 * so a funnel can be cut by source without walking back to the first row.
 */
function attribution(): Attribution {
  const stored = read(SOURCE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as Attribution;
    } catch {
      // Fall through and recapture.
    }
  }

  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || undefined;
  let host: string | undefined;
  try {
    host = referrer ? new URL(referrer).hostname : undefined;
  } catch {
    host = undefined;
  }

  const internal = host === window.location.hostname;
  const found: Attribution = {
    source:
      params.get("utm_source") ??
      (internal ? undefined : host) ??
      (referrer ? undefined : "direct"),
    medium: params.get("utm_medium") ?? undefined,
    campaign: params.get("utm_campaign") ?? undefined,
    referrer: internal ? undefined : referrer,
  };

  write(SOURCE_KEY, JSON.stringify(found));
  return found;
}

/**
 * Sends one event. Uses sendBeacon where it exists so a click that navigates
 * away still reports, and never returns a rejected promise: analytics must not
 * be able to break a page.
 */
export function track(event: SiteEvent) {
  if (typeof window === "undefined") return;
  // Honours the browser's own signal. Someone who has asked not to be
  // followed is not an exception worth making for our own numbers.
  if (navigator.doNotTrack === "1") return;

  try {
    const body = JSON.stringify({
      ...event,
      ...attribution(),
      sessionId: sessionId(),
      path: event.path ?? window.location.pathname,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Deliberately silent.
  }
}
