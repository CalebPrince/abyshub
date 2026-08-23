# Abys Hub

Storefront for Abys Hub — genuine Tupperware and Abys Home goods. Built with
Next.js (App Router), Tailwind CSS v4 and shadcn/ui, with three ordering routes:
card payment through **Paystack**, **WhatsApp** orders, and **quote enquiries**.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

The site runs with no configuration at all — Paystack and WhatsApp options
simply hide themselves until their keys are set.

## Configuration

Every setting lives in `.env.local`; see `.env.example` for the annotated list.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public origin. Paystack redirects back here after payment. |
| `NEXT_PUBLIC_CURRENCY` / `NEXT_PUBLIC_LOCALE` | Charge currency and price formatting. Defaults to `GHS` / `en-GH`. |
| `NEXT_PUBLIC_FREE_DELIVERY_THRESHOLD` / `NEXT_PUBLIC_DELIVERY_FLAT_RATE` | Delivery rules, in minor units. |
| `PAYSTACK_SECRET_KEY` | **Server only.** Enables card checkout. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Digits only, with country code. Blank hides all WhatsApp options. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Shown in the footer, and where enquiries are addressed. |
| `NEXT_PUBLIC_LEGAL_ENTITY`, `NEXT_PUBLIC_BUSINESS_ADDRESS`, `NEXT_PUBLIC_BUSINESS_REGISTRATION`, `NEXT_PUBLIC_JURISDICTION` | Company details printed on the legal pages. Blank fields are omitted rather than printed empty. |

### Currency

The shop charges in **Ghana cedis**. Prices are stored as **integer minor units**
(pesewas) throughout — `95000` is GH₵950 — so no float rounding can reach a
charge. Your Paystack account must be enabled for GHS.

To move to another currency, change `NEXT_PUBLIC_CURRENCY` and
`NEXT_PUBLIC_LOCALE`, then restate the prices in `src/lib/products.ts` and the
two delivery thresholds. Nothing else reads a currency figure directly.

## Paystack

1. Put your **secret** key in `PAYSTACK_SECRET_KEY` (test key first).
2. In the Paystack dashboard, set the webhook URL to
   `https://your-domain/api/paystack/webhook`.
3. Pay with a [Paystack test card](https://paystack.com/docs/payments/test-payments/)
   to check the flow end to end.

How a card order runs:

| Step | Where | What happens |
| --- | --- | --- |
| 1 | `src/app/checkout/actions.ts` | The browser posts **product ids and quantities only**. The server rebuilds the order from the catalogue and prices it — a tampered payload cannot change the amount charged. |
| 2 | `src/lib/paystack.ts` | `initializeTransaction` creates the transaction and returns Paystack's hosted payment URL. |
| 3 | Paystack | The customer enters card details on Paystack's page. They never touch this site. |
| 4 | `src/app/checkout/callback/page.tsx` | Paystack redirects back with a reference, which is **verified server-side** before anything is shown as paid. |
| 5 | `src/app/api/paystack/webhook/route.ts` | `charge.success` arrives with an HMAC-SHA512 signature, checked in constant time. This is the authoritative confirmation — the redirect is not, since a customer can close the tab. |

**Before going live**, add persistence: the webhook has a marked `TODO` where the
paid order should be written to a database and confirmation emails sent. Paystack
retries until it receives a 200, so look the reference up first and make the
handler idempotent.

## Lisa, the chat assistant

A launcher sits bottom-right on every page. Lisa answers from a fixed rule set
in `src/lib/chat/scripted-responder.ts` — no network call, no API key, no cost
per message. She covers delivery and payment, brands and warranty, returns, and
finding things on the shelves; product answers come back as cards you can add to
the basket without leaving the chat. Ask for a person and she opens a handoff
form that posts through the same server action as the enquiry page, with a
WhatsApp button alongside carrying the conversation so far.

Product lookups use the same matcher as the listing page (`src/lib/search.ts`),
so Lisa can only ever name real stock.

### Making her AI-powered

`Responder` in `src/lib/chat/types.ts` is the seam:

```ts
type Responder = (input: string, context: ChatContext) => ChatReply | Promise<ChatReply>;
```

Write a second implementation that posts to a route handler wrapping your model,
ground it in `src/lib/products.ts` so it cannot invent stock or prices, and pass
it in: `<ChatWidget responder={aiResponder} />` in `src/app/layout.tsx`. The
scripted one makes a good fallback when the API is down or over budget.

## Legal pages

`/legal/terms`, `/legal/privacy` and `/legal/cookies`, linked from the footer.
They are written against what this site actually does rather than from a
generic template — the cookies page can honestly say the site sets **no
cookies**, because it doesn't: the only client-side storage is the basket and
the theme preference, both in `localStorage`, and the fonts are self-hosted by
`next/font` so no request leaves the origin on a page view.

**These are a starting point, not legal advice.** Before you trade:

- Fill in `NEXT_PUBLIC_LEGAL_ENTITY`, `NEXT_PUBLIC_BUSINESS_ADDRESS` and
  `NEXT_PUBLIC_BUSINESS_REGISTRATION` — the pages are close to meaningless
  without a real registered name and address behind them.
- Have a Ghanaian lawyer review them. The privacy page references the Data
  Protection Act, 2012 (Act 843); whether you also need to register with the
  Data Protection Commission is a question for them, not for this README.
- Bump `LEGAL.updated` in `src/lib/config.ts` whenever you change the wording.

Two changes would make the current text inaccurate and must be reflected there:
adding **any** analytics or tracking (the cookies page promises none), and
switching Lisa to an **AI responder** (the privacy page says chat messages never
leave your browser).

## The welcome modal

`src/components/store/welcome-modal.tsx` shows once per browser tab, keyed on
`sessionStorage` — so a new tab or a new browser sees it again, while moving
around the shop in one tab does not. It is deliberately small on phones (about
40% of the screen) and closes on the X, Escape, a click outside, or either
button.

## The catalogue

`src/lib/products.ts` is the single source of truth — products, categories and
brands all derive from it. The 14 entries there are **sample data**: replace them
with real stock, and put photographs in `public/products/` in place of the
generated SVG illustrations. Nothing else needs to change.

## Project layout

```
src/
  app/
    page.tsx                    home
    products/                   listing + [slug] detail
    cart/  checkout/  enquiry/  the three ordering routes
    checkout/callback/          Paystack return + verification
    api/paystack/webhook/       signed webhook handler
    legal/                      terms, privacy, cookies
  components/
    ui/                         shadcn/ui primitives
    store/                      storefront components
    store/chat/                 Lisa, the chat assistant
  lib/
    products.ts                 catalogue
    search.ts                   product matching, shared by listing and chat
    cart-store.ts               basket (useSyncExternalStore + localStorage)
    totals.ts                   pricing, shared by client and server
    paystack.ts                 server-only Paystack client
    chat/                       chat types and the scripted responder
    config.ts  money.ts         settings and currency formatting
```

The basket lives in an external store read through `useSyncExternalStore`, which
keeps server and hydration renders identical and syncs across browser tabs.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
