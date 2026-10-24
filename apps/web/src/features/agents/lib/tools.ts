import type { CustomToolItem } from "@/features/settings/lib/types";
import type { AgentToolDefinition, ToolParameterSchema } from "./types";

/**
 * Converts a workspace custom tool into an attachable agent tool definition.
 * Agents store the inlined definition, so published snapshots stay self-contained.
 */
export function customToolToAgentTool(tool: CustomToolItem): AgentToolDefinition {
  const config = tool.config ?? {};
  const parameters = (config.parameters as ToolParameterSchema | undefined) ?? undefined;
  const base = {
    id: `custom:${tool.id}:${tool.name}`,
    name: tool.name,
    description: tool.description || tool.name,
    ...(parameters ? { parameters } : {}),
    ...(typeof config.timeout_ms === "number" ? { timeout_ms: config.timeout_ms } : {}),
    ...(config.idempotent !== undefined ? { idempotent: Boolean(config.idempotent) } : {}),
  };
  if (tool.kind === "http") {
    return {
      ...base,
      type: "http",
      method: (config.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE") ?? "GET",
      base_url: String(config.base_url ?? ""),
      allowed_hosts: (config.allowed_hosts as string[]) ?? [],
      ...(config.path_template ? { path_template: String(config.path_template) } : {}),
      ...(config.headers && Object.keys(config.headers as Record<string, string>).length > 0
        ? { headers: config.headers as Record<string, string> }
        : {}),
      ...(config.auth
        ? { auth: config.auth as { type: "bearer_secret"; secret_name: string } }
        : {}),
    };
  }
  return {
    ...base,
    type: "mcp",
    server_url: String(config.server_url ?? ""),
    allowed_tool_names: (config.allowed_tool_names as string[]) ?? [],
  };
}

export const BUILTIN_TOOLS: AgentToolDefinition[] = [
  {
    id: "builtin:web_scrape",
    name: "web_scrape",
    description: "Scrape the text content of a public web page given its URL",
    type: "builtin_web",
    action: "scrape",
    parameters: {
      type: "object",
      properties: { url: { type: "string", description: "The public page URL to scrape" } },
      required: ["url"],
    },
  },
  {
    id: "builtin:web_search",
    name: "web_search",
    description: "Search the web for current public information",
    type: "builtin_web",
    action: "search",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "The search query" } },
      required: ["query"],
    },
  },
  {
    id: "builtin:leads_start",
    name: "leads_start_research",
    description: "Start a business lead research run for a category and location",
    type: "builtin_leads",
    action: "start",
  },
  {
    id: "builtin:leads_status",
    name: "leads_run_status",
    description: "Check the status of a lead research run",
    type: "builtin_leads",
    action: "status",
    parameters: {
      type: "object",
      properties: { run_id: { type: "string", description: "The lead run id" } },
      required: ["run_id"],
    },
  },
  {
    id: "builtin:leads_results",
    name: "leads_run_results",
    description: "Fetch accepted leads from a completed research run",
    type: "builtin_leads",
    action: "results",
    parameters: {
      type: "object",
      properties: { run_id: { type: "string", description: "The lead run id" } },
      required: ["run_id"],
    },
  },
  {
    id: "builtin:leads_cancel",
    name: "leads_cancel_run",
    description: "Cancel a running lead research job",
    type: "builtin_leads",
    action: "cancel",
    parameters: {
      type: "object",
      properties: { run_id: { type: "string", description: "The lead run id" } },
      required: ["run_id"],
    },
  },
  {
    id: "builtin:leads_capture",
    name: "save_qualified_lead",
    description:
      "Save the current conversation as a qualified lead. Call only after the visitor has shared their details (name, contact, need, timeline) and agreed to be contacted.",
    type: "builtin_leads",
    action: "capture",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Visitor's full name" },
        email: { type: "string", description: "Visitor's email address" },
        phone: { type: "string", description: "Visitor's phone number" },
        intent: {
          type: "string",
          description: "What the visitor wants help with, in one short sentence",
        },
        qualification_score: {
          type: "number",
          description: "Optional fit score from 0 to 100",
        },
        notes: { type: "string", description: "Short qualification notes for the sales team" },
        captured_fields: {
          type: "object",
          description:
            "Additional qualification answers, e.g. team_size, weekly_enquiries, timeline, budget",
        },
      },
      required: ["intent"],
    },
  },
  {
    id: "builtin:leads_callback",
    name: "request_callback",
    description:
      "Record a request for the team to call the visitor back. Use only after the visitor gives a phone number and a preferred time.",
    type: "builtin_leads",
    action: "request_callback",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Visitor's full name" },
        phone: { type: "string", description: "Phone number to call" },
        email: { type: "string", description: "Optional email address" },
        callback_at: {
          type: "string",
          description: "Preferred callback time in ISO 8601 or a clear local description",
        },
        reason: { type: "string", description: "Why the visitor wants a call" },
        captured_fields: {
          type: "object",
          description: "Any extra details the team should know",
        },
      },
      required: ["phone", "callback_at"],
    },
  },
  {
    id: "builtin:calendar_check",
    name: "check_calendar_availability",
    description:
      "Check open appointment slots for a date using the workspace's connected Google Calendar. Returns real free slots only.",
    type: "builtin_calendar",
    action: "check_availability",
    timezone: "UTC",
    slot_minutes: 30,
    working_hours: { start: "09:00", end: "17:00" },
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date to check in YYYY-MM-DD format",
        },
        timezone: {
          type: "string",
          description: "IANA timezone, e.g. America/New_York",
        },
        slot_minutes: {
          type: "number",
          description: "Slot length in minutes (5-240)",
        },
        max_slots: {
          type: "number",
          description: "Maximum number of slots to return (1-20)",
        },
        calendar_id: {
          type: "string",
          description: "Google Calendar id; defaults to the primary calendar",
        },
        working_hours_start: {
          type: "string",
          description: "Business hours start in HH:mm (default 09:00)",
        },
        working_hours_end: {
          type: "string",
          description: "Business hours end in HH:mm (default 17:00)",
        },
      },
      required: ["date"],
    },
  },
  {
    id: "builtin:calendar_book",
    name: "book_calendar_slot",
    description:
      "Create an appointment in the workspace's connected Google Calendar after the visitor confirms a slot.",
    type: "builtin_calendar",
    action: "book_slot",
    timezone: "UTC",
    parameters: {
      type: "object",
      properties: {
        start: {
          type: "string",
          description: "Appointment start (ISO 8601, or YYYY-MM-DDTHH:mm in the calendar timezone)",
        },
        end: {
          type: "string",
          description: "Appointment end (ISO 8601, or YYYY-MM-DDTHH:mm in the calendar timezone)",
        },
        summary: { type: "string", description: "Event title, e.g. Consultation — Alex Morgan" },
        description: { type: "string", description: "Optional event description or notes" },
        attendee_email: {
          type: "string",
          description: "Optional visitor email to add as an attendee",
        },
        timezone: { type: "string", description: "IANA timezone for the event" },
      },
      required: ["start", "end"],
    },
  },
  {
    id: "builtin:calendar_cancel",
    name: "cancel_calendar_event",
    description:
      "Cancel an appointment in the workspace's connected Google Calendar when the visitor asks to cancel.",
    type: "builtin_calendar",
    action: "cancel_event",
    timezone: "UTC",
    parameters: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "Google Calendar event id" },
        timezone: { type: "string", description: "IANA timezone for the calendar" },
      },
      required: ["event_id"],
    },
  },
  {
    id: "builtin:zendesk_create_ticket",
    name: "create_support_ticket",
    description:
      "Create a support ticket in the workspace's connected Zendesk account for an issue the agent cannot resolve.",
    type: "builtin_integration",
    provider: "zendesk",
    action: "create_ticket",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Short ticket subject" },
        description: { type: "string", description: "Full issue description" },
        requester_name: { type: "string", description: "Visitor's name" },
        requester_email: { type: "string", description: "Visitor's email" },
        priority: { type: "string", description: "urgent | high | normal | low" },
        tags: { type: "array", items: { type: "string" }, description: "Optional tags" },
      },
      required: ["subject", "description"],
    },
  },
  {
    id: "builtin:zendesk_get_ticket",
    name: "get_support_ticket",
    description: "Look up a Zendesk support ticket by id.",
    type: "builtin_integration",
    provider: "zendesk",
    action: "get_ticket",
    parameters: {
      type: "object",
      properties: { ticket_id: { type: "string", description: "Zendesk ticket id" } },
      required: ["ticket_id"],
    },
  },
  {
    id: "builtin:zendesk_comment",
    name: "add_support_ticket_comment",
    description: "Add a public reply or internal note to an existing Zendesk ticket.",
    type: "builtin_integration",
    provider: "zendesk",
    action: "add_comment",
    parameters: {
      type: "object",
      properties: {
        ticket_id: { type: "string", description: "Zendesk ticket id" },
        body: { type: "string", description: "Comment text" },
        public: { type: "boolean", description: "Visible to the requester (default true)" },
      },
      required: ["ticket_id", "body"],
    },
  },
  {
    id: "builtin:slack_post",
    name: "post_team_message",
    description: "Post a message to a Slack channel, e.g. notify the team about a handoff or urgent issue.",
    type: "builtin_integration",
    provider: "slack",
    action: "post_message",
    parameters: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Slack channel id or name" },
        text: { type: "string", description: "Message text" },
      },
      required: ["channel", "text"],
    },
  },
  {
    id: "builtin:hubspot_contact",
    name: "save_crm_contact",
    description:
      "Create or update a HubSpot contact. Use after the visitor shares an email and any CRM fields.",
    type: "builtin_integration",
    provider: "hubspot",
    action: "create_or_update_contact",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string", description: "Contact email" },
        firstname: { type: "string", description: "First name" },
        lastname: { type: "string", description: "Last name" },
        phone: { type: "string", description: "Phone number" },
        properties: { type: "object", description: "Additional HubSpot contact properties" },
      },
      required: ["email"],
    },
  },
  {
    id: "builtin:salesforce_lead",
    name: "create_salesforce_lead",
    description: "Create a lead in Salesforce after collecting the visitor's details.",
    type: "builtin_integration",
    provider: "salesforce",
    action: "create_lead",
    parameters: {
      type: "object",
      properties: {
        last_name: { type: "string", description: "Lead last name" },
        company: { type: "string", description: "Company name" },
        email: { type: "string", description: "Email" },
        phone: { type: "string", description: "Phone" },
        description: { type: "string", description: "What the lead needs" },
      },
      required: ["last_name", "company"],
    },
  },
  {
    id: "builtin:sheets_append",
    name: "append_google_sheet_row",
    description: "Append a row to a Google Sheet, e.g. log a lead or a callback request.",
    type: "builtin_integration",
    provider: "google_sheets",
    action: "append_row",
    parameters: {
      type: "object",
      properties: {
        spreadsheet_id: { type: "string", description: "Google Sheets spreadsheet id" },
        range: { type: "string", description: "Sheet name or A1 range (default Sheet1)" },
        values: {
          type: "array",
          items: { type: "string" },
          description: "Row values in column order",
        },
      },
      required: ["spreadsheet_id", "values"],
    },
  },
  {
    id: "builtin:mailchimp_subscribe",
    name: "add_mailchimp_subscriber",
    description: "Add a visitor to a Mailchimp audience after they agree to receive email.",
    type: "builtin_integration",
    provider: "mailchimp",
    action: "add_subscriber",
    parameters: {
      type: "object",
      properties: {
        list_id: { type: "string", description: "Mailchimp audience/list id" },
        email_address: { type: "string", description: "Subscriber email" },
        merge_fields: { type: "object", description: "Optional merge fields" },
      },
      required: ["list_id", "email_address"],
    },
  },
  {
    id: "builtin:twilio_sms",
    name: "send_sms",
    description: "Send an SMS confirmation or follow-up to the visitor through Twilio.",
    type: "builtin_integration",
    provider: "twilio",
    action: "send_sms",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient phone number in E.164" },
        body: { type: "string", description: "Message text" },
        from: { type: "string", description: "Optional Twilio sender number" },
      },
      required: ["to", "body"],
    },
  },
];
