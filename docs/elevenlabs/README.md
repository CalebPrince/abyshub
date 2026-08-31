# Lisa's tools on ElevenLabs

Four tool definitions for the WhatsApp agent. They exist as files because the
ElevenLabs dashboard is the only other place they live, and a tool whose
description has quietly drifted from the one in `src/lib/chat/lisa.ts` is the
kind of difference nobody notices until Lisa starts answering differently on
WhatsApp than she does on the website.

Descriptions here are copied verbatim from `toolDeclarations` in
`src/lib/chat/lisa.ts`. If you change one there, change it here too.

## Adding them

Create four **server / webhook tools** on the agent — not one. All four post to
the same URL; the `tool` field in the body is how `elevenlabs-tool/route.ts`
knows which was called.

Before pasting, in every file replace:

- `abyshub.com` — if the live origin differs. It must match the URL shown on the
  admin settings page, which is built from the shop's `siteUrl` setting.
- `REPLACE_WITH_WEBHOOK_SECRET` — the value in the **ElevenLabs webhook secret**
  field in admin settings.

The secret rides in the query string rather than a header on purpose:
ElevenLabs does not reliably send configured custom headers on tool calls, and
a header-only check fails as an assistant who still talks fluently but has
silently lost every tool. `verifyElevenLabsSecret` accepts either.

Attach them to the Abys Hub agent only. If the workspace also holds tools from
another project (`check_availability`, `book_appointment`, consent/opt-out),
those point at a different server and must not be attached here.

## What the shop actually requires

If the dashboard's import rejects these files, configure by hand to this
contract — it is what `src/app/api/whatsapp/elevenlabs-tool/route.ts` reads,
and it is deliberately tolerant about naming:

| Body field | Accepted as | Required |
| --- | --- | --- |
| tool name | `tool`, `name` or `tool_name` | yes — without it nothing dispatches |
| arguments | `args`, `parameters` or `input` | only for the two tools that take any |
| session token | `session_token` (top level, not nested in args) | yes for `request_human`; wanted by all |

`session_token` comes from the conversation-initiation webhook, which returns it
as a dynamic variable alongside `caller_phone`. It is not optional plumbing:
`request_human` will run without it and report success, and the handoff will
never reach anyone.

## The field names most likely to need adjusting

`value_type`, `constant_value` and `dynamic_variable` follow the ElevenLabs
conversational-AI tool schema, which has changed shape between versions. If the
import complains, those three keys are the first place to look — the rest of the
structure (`type`, `name`, `description`, `api_schema.url`, `api_schema.method`,
`request_body_schema`) has been stable.
