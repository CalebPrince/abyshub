# Notes for working with Claude on this project

## Credential handling

Claude never enters a username, password, API key, or token into any login
form or field — not even with explicit permission from the account owner,
and not even when the credentials are supplied directly in chat. This is a
fixed rule, not a per-request judgment call.

When Prince says **"can I login for you to see [something]?"**, he means
*he* will log in himself, in his own browser, typing his own credentials —
not a request for Claude to log in. Once he's logged in, Claude sees the
result one of two ways:

- **Claude in Chrome** — reads an already-authenticated page in Prince's
  real browser (his existing session), without ever touching the
  credentials.
- **Export / screenshot / copy-paste** — Prince logs in, pulls whatever the
  page shows (a download, a screenshot, pasted text), and hands that to
  Claude directly.

This came up specifically with the Tupperware Ghana distributor's stock
portal (`amp.tuppafrica.co.za`), which the client gave Prince a personal
login to — but the rule and the phrasing convention apply generally, to any
login-walled resource.
