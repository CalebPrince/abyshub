import "server-only";

/**
 * The shared look for everything the shop sends.
 *
 * Written as nested tables with inline styles because that is what mail
 * clients render: no flexbox, no grid, no stylesheet, no web font. Archivo
 * cannot be loaded in a mail client, so headings fall back to a heavy system
 * stack rather than silently arriving as body text.
 *
 * Keeping it here rather than in each message is what stops the customer's
 * receipt and the staff alert drifting into two different-looking brands.
 */

/** The storefront's palette, converted from the oklch tokens in globals.css. */
export const BRAND = {
  primary: "#d6015f",
  ink: "#111111",
  muted: "#fff0f6",
  mutedInk: "#6b6b6b",
  rule: "#e8dfe3",
  page: "#f4f4f5",
} as const;

export const DISPLAY_FONT =
  "'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const BODY_FONT = "Arial, Helvetica, sans-serif";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** The small uppercase caption above each block on the receipt. */
export function eyebrow(text: string, color = BRAND.mutedInk) {
  return `<p style="margin:0 0 8px;color:${color};font-size:11px;font-weight:bold;letter-spacing:1.6px;text-transform:uppercase">${text}</p>`;
}

/** A label/value pair, right-aligned like the printed receipt's rows. */
export function detailRow(label: string, value: string, mono = false) {
  const valueStyle = mono
    ? "font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:600"
    : "font-weight:600";
  return `<tr>
      <td style="padding:3px 0;color:${BRAND.mutedInk};font-size:13px">${label}</td>
      <td style="padding:3px 0;text-align:right;font-size:13px;${valueStyle}">${value}</td>
    </tr>`;
}

/** A full-width padded band. `content` is ordinary HTML, not table rows. */
export function band(content: string, padding = "28px 28px 0") {
  return `<tr><td style="padding:${padding}">${content}</td></tr>`;
}

/**
 * The handover code panel, shared so the customer's copy and the staff alert
 * can never show it differently.
 *
 * Returns nothing at all when there is no code. An order without one must not
 * be given an invented stand-in: staff hold nothing to check it against, and a
 * confident-looking code is worse than no code.
 */
export function collectionCodePanel(
  code: string | undefined,
  collecting: "delivery" | "pickup",
  caption: string
) {
  if (!code) return "";

  return band(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.muted};border-radius:12px">
        <tr><td style="padding:24px;text-align:center">
          ${eyebrow(`Show this code on ${collecting}`)}
          <p style="margin:2px 0 0;font-family:${DISPLAY_FONT};font-size:34px;font-weight:900;letter-spacing:6px;color:${BRAND.ink}">${escapeHtml(code)}</p>
          <p style="margin:12px 0 0;color:${BRAND.mutedInk};font-size:12px;line-height:1.5">${caption}</p>
        </td></tr>
      </table>`,
    "0 28px"
  );
}

/**
 * Wraps table rows in the branded card: primary header bar, white body, and a
 * footer carrying the shop's own contact details so every message says who
 * sent it and how to reply.
 *
 * `rows` must be `<tr>` elements — the surrounding table belongs to the shell.
 */
export function emailShell({
  eyebrow: headerEyebrow,
  heading,
  rows,
  contactEmail,
  siteUrl,
  cta,
  footerNote,
}: {
  eyebrow: string;
  heading: string;
  rows: string;
  contactEmail: string;
  siteUrl: string;
  cta?: { label: string; href: string };
  footerNote?: string;
}) {
  const button = cta
    ? `<a href="${escapeHtml(cta.href)}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:0.6px;padding:13px 30px;border-radius:999px">${escapeHtml(cta.label)}</a>`
    : "";

  const note = footerNote
    ? `<p style="margin:${cta ? "20px" : "0"} 0 0;color:${BRAND.mutedInk};font-size:12px;line-height:1.6">${footerNote}</p>`
    : "";

  return `<div style="background:${BRAND.page};padding:24px 0;font-family:${BODY_FONT};color:${BRAND.ink}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden">

        <tr><td style="background:${BRAND.primary};padding:30px 28px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0;color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:2.4px;text-transform:uppercase">${escapeHtml(headerEyebrow)}</p>
                <p style="margin:8px 0 0;color:#ffffff;font-family:${DISPLAY_FONT};font-size:27px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase">${escapeHtml(heading)}</p>
              </td>
              <!-- The receipt page's ringed tick. Drawn with a border rather
                   than an icon: Gmail strips inline SVG, and a hosted PNG
                   would be a broken-image gap wherever images are blocked.
                   Outlook renders the ring square, which is a fair trade. -->
              <td align="right" width="48" style="width:48px">
                <table role="presentation" cellpadding="0" cellspacing="0" align="right" style="border:2px solid #ffffff;border-radius:24px">
                  <tr><td align="center" valign="middle" width="40" height="40" style="width:40px;height:40px;color:#ffffff;font-size:21px;line-height:40px">&#10003;</td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="height:28px"></td></tr>
        ${rows}

        <tr><td style="padding:34px 28px 30px" align="center">
          ${button}
          ${note}
          <p style="margin:18px 0 0;color:${BRAND.mutedInk};font-size:12px;line-height:1.6">
            Abys Hub &middot; <a href="mailto:${escapeHtml(contactEmail)}" style="color:${BRAND.primary};text-decoration:none">${escapeHtml(contactEmail)}</a><br>
            <a href="${escapeHtml(siteUrl)}" style="color:${BRAND.mutedInk};text-decoration:none">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</div>`;
}
