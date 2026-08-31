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

## Methods

The two tools that take no arguments are GET, with `secret` and `tool` declared
as constant query parameters. A POST carrying no body is refused by tooling on
both sides, and a read with no arguments is a GET anyway. The route accepts both
verbs.

`request_human` must stay POST: everything a GET carries lives in the URL, and
its `session_token` holds a customer phone number, which has no business in an
access log on every hop that handled the request.

Query parameters and body properties are the same node shape, and every node
wants the full set of keys — `id`, `type`, `description`, `required`,
`value_type`, `dynamic_variable`, `constant_value` — whichever two of them it
actually uses. Empty strings for the unused ones. Omitting a key is rejected
even where it is obviously irrelevant, so do not tidy them away.

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

## The shape, taken from the server

These four are copied from what ElevenLabs actually stored for a tool it
accepted — read out of the tool editor's **Edit as JSON** view — rather than
reconstructed from validation errors. That view is the authority; reach for it
first if any of this stops matching.

Two things it settled that guessing did not:

- `request_body_schema` may not be `null` on a POST, and may not be empty
  either — the object is required and needs at least one property. A null body
  is refused with "failed to create tool" and no field named, which is the
  least useful error in the set.
- The two tools that take no arguments therefore carry `session_token`, which
  is a real field rather than a placeholder invented to satisfy the validator:
  the route strips it from the arguments it passes to the tool, and having it
  on every call means anything later wanting to know which conversation asked
  already has it.
- Query parameters belong **inline in the URL**, with `query_params_schema`
  left empty. Declaring them there instead is what broke the two tools that
  would not save.

Every node — the body itself and each property — carries the full key set, with
empty strings where unused:

```
body:     id, type, description, properties[], required, dynamic_variable, value_type
property: id, type, value_type, description, dynamic_variable, constant_value,
          enum, is_system_provided, required
```

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
