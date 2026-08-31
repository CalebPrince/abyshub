# Lisa's tools on ElevenLabs

Four webhook tools for the WhatsApp agent, in the shape the ElevenLabs tool
editor uses. They live here because the dashboard is otherwise the only copy,
and a description that has quietly drifted from `toolDeclarations` in
`src/lib/chat/lisa.ts` produces the one bug nobody goes looking for: Lisa
answering differently on WhatsApp than she does on the website.

Descriptions are copied verbatim from that file. Change one there, change it
here.

## Before pasting

In each file, replace:

- `abyshub.com` — if the live origin differs. It must match the URL shown on the
  admin settings page, which is built from the shop's `siteUrl` setting.
- `REPLACE_WITH_WEBHOOK_SECRET` — the value in the **ElevenLabs webhook secret**
  field in admin settings.

Attach them to the Abys Hub agent only. If the workspace also holds tools from
another project (`check_availability`, `book_appointment`, consent/opt-out),
those post to a different server and must not be attached here.

## Why the URL carries the tool name

All four post to the same endpoint, so something has to say which tool was
called. Putting it in the query string rather than the request body means two of
the four — `get_delivery_terms` and `recommend_products` — need no body schema
at all: their entire configuration is a URL. The remaining two only describe the
arguments the model actually supplies.

The secret rides in the query string for a different reason: ElevenLabs does not
reliably send configured custom headers on tool calls, and a header-only check
fails as an assistant who still talks fluently but has silently lost every tool.
`verifyElevenLabsSecret` accepts either.

## The one field to watch

`request_human` is the only tool needing a dynamic variable — `session_token`,
which the conversation-initiation webhook returns. It is not optional plumbing:
without it that tool runs, reports success, and the handoff reaches nobody. The
customer is told a person will follow up and no person ever learns.

If the editor rejects `value_type` / `dynamic_variable`, those key names are the
likeliest thing to have changed between versions. The rest of the structure
matches the blank tool the editor produces.

## What the route actually requires

If you configure by hand, this is the contract
`src/app/api/whatsapp/elevenlabs-tool/route.ts` reads. It is deliberately
tolerant, because ElevenLabs has shaped these differently across versions:

| Needed | Accepted as |
| --- | --- |
| tool name | `tool` / `name` / `tool_name` in the body, or `?tool=` in the URL |
| arguments | `args` / `parameters` / `input`, or at the top level of the body |
| session token | `session_token`, top level of the body |

A tool that takes no arguments may post an empty body or none at all.

## Verified

Against a running server, with the secret in the query string:

- `?tool=get_delivery_terms`, no body — returns the live delivery terms
- `?tool=search_products`, `{"query":"lunch box"}` — returns the matching product
- `?tool=request_human`, `{"reason":…,"session_token":…}` — records the handoff
- no tool named anywhere — 422 rather than a silent no-op
