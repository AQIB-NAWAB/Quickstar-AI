# ADR 0028: Built-in agent actions for booking, lead capture, and callbacks

- **Status:** Accepted
- **Date:** 2026-10-24
- **Feature:** Landing-page use cases → real agent actions

## Context

The landing page presents everyday requests: booking an appointment, qualifying a lead, and
following up with a call. The runtime already supported knowledge answers, custom HTTP/MCP tools,
tool guards, and human handoff. But two of those use cases still required the customer to build
their own HTTP tool:

- **Appointment booking** had a starter graph template and a generic `http_request` node, but no
  built-in calendar action, even though workspace-service already stores Google Calendar OAuth
  connections.
- **Lead qualification** had a Leads store and a lead-generation research tool, but no way for a
  conversation to save itself as a qualified lead.
- **Follow-up calls** had campaigns and an outbound voice adapter, but no way for an inbound
  conversation to record “call me tomorrow”.

## Decision

Add first-class built-in tools. They are visible in the agent tools panel and validated in
agent-service; the runtime executes them through internal service routes.

### `builtin_calendar` — Google Calendar

Actions:

| Action | Behavior |
| --- | --- |
| `check_availability` | Calls Google Calendar `freeBusy` for a date, subtracts busy periods from working hours, returns real open slots only |
| `book_slot` | Creates a calendar event with summary, start/end, timezone, and optional attendee email |
| `cancel_event` | Deletes a calendar event by id |

- Tool config carries `calendar_id` (default `primary`), `timezone` (default `UTC`),
  `slot_minutes` (5–240), and `working_hours` (default 09:00–17:00).
- Credentials never enter the agent snapshot or the runtime. The runtime calls
  `POST /internal/workspaces/:id/integrations/google_calendar/actions` on workspace-service with
  the service internal token. Workspace-service loads the stored OAuth secret, refreshes the token
  when it is about to expire (or after a 401), persists the refreshed token, and calls Google.
- If Google Calendar is not connected, the tool returns `calendar_not_connected` with an explicit
  instruction: apologize, do not invent availability, and offer a callback or handoff.

### `builtin_leads` — capture and callback

Two actions were added to the existing lead tool:

| Action | Behavior |
| --- | --- |
| `capture` | Upserts a qualified lead with name/email/phone, intent, score, notes, captured fields, conversation id, and a per-tool-call idempotency key |
| `request_callback` | Same upsert with `source=agent_callback`, `status=qualified`, and `callback_at` in captured fields |

- The runtime calls lead-service's existing internal upsert route
  (`POST /internal/v1/workspaces/:id/leads/upsert`) with the service internal token.
- Leads appear in the existing Leads UI with their conversation link.
- `request_callback` records the request for the team. **It does not auto-dial.** Automated
  outbound callback dialing remains a future slice; the landing-page promise is now “request a
  follow-up call”, which the team performs.

### `builtin_integration` — support, CRM, notifications, data, SMS

The workspace's existing integrations can be used as agent actions. Credentials stay in
workspace-service; the runtime calls
`POST /internal/workspaces/:id/integrations/:provider/actions` with `{ action, input }`.

| Provider | Actions |
| --- | --- |
| Zendesk | `create_ticket`, `get_ticket`, `add_comment` |
| Slack | `post_message` |
| HubSpot | `create_or_update_contact` |
| Salesforce | `create_lead` |
| Google Sheets | `append_row` |
| Mailchimp | `add_subscriber` |
| Twilio | `send_sms` |

- OAuth connections are loaded from the integration repository; access tokens come from the
  secrets vault. Tokens are refreshed when the provider supports it (Google Calendar/Sheets) and
  a 401 triggers one refresh-and-retry.
- Zendesk subdomain, Salesforce instance URL, and Mailchimp data center are captured in
  connection metadata during OAuth so actions do not ask the model for infrastructure details.
- Twilio uses the stored account SID/auth token and the first configured number as the default
  sender; it is not an OAuth provider.
- If a provider is not connected, the tool returns `integration_not_connected` with an explicit
  instruction: apologize, never claim the action succeeded, and offer a handoff.
- The prompt adds an escalation rule when Zendesk ticket creation is attached, and a no-spam rule
  when Slack is attached. The model must only claim success when the tool returns `ok`.

### Tool guard behavior

- Calendar reads (availability) run immediately.
- Booking and cancellation are writes: the existing tool guard asks for confirmation unless the
  visitor already confirmed the specific slot/action.
- Lead capture is treated as a write only in the sense that the agent must have collected the
  details; the tool description tells the model to call it after the visitor shares contact
  details and agrees to be contacted.
- The runtime still enforces tool timeouts, idempotency, and the anti-hallucination instruction:
  empty availability means “no open slots”, never invented times.

## Failure policy

| Condition | Behavior |
| --- | --- |
| Google Calendar not connected | Business precondition; agent apologizes and offers callback/handoff |
| Google token expired | Workspace-service refreshes and retries once |
| Google returns 401 after refresh | Typed upstream error; no fabricated booking |
| Lead service unavailable | Tool error; agent asks the visitor to try again or offers handoff |
| Callback missing phone/time | Validation error; agent asks for the missing detail |
| Duplicate tool call | Lead upsert is idempotent by tool-call key |

## Consequences

- “Book an appointment”, “Qualify a lead”, “Create a support ticket”, “Notify the team”, “Save
  to the CRM”, “Log to a spreadsheet”, “Add to the newsletter”, and “Send an SMS confirmation”
  are now real agent actions, not just starter copy.
- Booking requires the workspace to connect Google Calendar; each integration action requires
  that provider to be connected in Settings → Integrations.
- Order-status questions still use the workspace's custom HTTP/MCP tool or knowledge base; there
  is no generic order system to integrate.
- Notion page creation and other providers without a defined action remain available through a
  custom HTTP/MCP tool.
- Automated outbound callbacks are **not** shipped. The system records the request and the team
  follows up; this is reflected in the landing-page copy.
