export type StepKey = "knowledge" | "behavior" | "test" | "publish";

export interface StepMeta {
  key: StepKey;
  num: string;
  title: string;
  description: string;
  toolbarTitle: string;
  contentHeading: string;
  contentDescription: string;
  footerDefaultSummary: string;
  footerActionLabel: string;
}

export const HOW_IT_WORKS_STEPS: StepMeta[] = [
  {
    key: "knowledge",
    num: "01",
    title: "Teach it your business.",
    description: "Upload documents, add web pages, connect your tools.",
    toolbarTitle: "Business knowledge",
    contentHeading: "Start with what you already know.",
    contentDescription: "Your documents give every answer a reliable source.",
    footerDefaultSummary: "2 sources ready",
    footerActionLabel: "Continue →",
  },
  {
    key: "behavior",
    num: "02",
    title: "Tell it how to behave.",
    description: "Set instructions, tools and the steps it follows.",
    toolbarTitle: "Agent instructions",
    contentHeading: "Tell it how to help.",
    contentDescription: "Set its role, its tone and the actions it can take.",
    footerDefaultSummary: "Instructions ready",
    footerActionLabel: "Continue →",
  },
  {
    key: "test",
    num: "03",
    title: "Test it before anyone sees it.",
    description: "Try the draft and review its answers.",
    toolbarTitle: "Test your draft",
    contentHeading: "Check the answer before you publish.",
    contentDescription: "Try a customer question and review the result.",
    footerDefaultSummary: "3 example checks passed",
    footerActionLabel: "Continue →",
  },
  {
    key: "publish",
    num: "04",
    title: "Publish and go live.",
    description: "Put your agent on your website, phone or API.",
    toolbarTitle: "Publish your agent",
    contentHeading: "Choose where your agent works.",
    contentDescription: "Publish a version and switch on the channels you need.",
    footerDefaultSummary: "Draft ready to review",
    footerActionLabel: "Publish example →",
  },
];

export interface ExampleSource {
  id: string;
  name: string;
  category: string;
  status: "Queued" | "Processing" | "Ready";
  sampleSnippet?: string;
  isExample?: boolean;
}

export const INITIAL_SOURCES: ExampleSource[] = [
  {
    id: "src-handbook",
    name: "Business handbook.pdf",
    category: "Company information",
    status: "Ready",
    sampleSnippet:
      "Working hours: Monday to Friday, 9:00 AM – 5:00 PM. Weekend appointments available on request with 24-hour advance notice. Response time for non-urgent enquiries is within two business hours.",
    isExample: true,
  },
  {
    id: "src-pricing",
    name: "Services and pricing.pdf",
    category: "Products and services",
    status: "Ready",
    sampleSnippet:
      "Standard studio consultation: 45 minutes. Diagnostic inspection and estimate included. Bookings can be rescheduled up to 4 hours before the allocated appointment window at no additional cost.",
    isExample: true,
  },
];

export const DEFAULT_INSTRUCTIONS = `You help customers of Example Studio.
Answer from the business information provided.
Keep replies clear and concise.
Ask before booking or changing an appointment.
Hand over to a person when you cannot help.`;

export interface ExampleTool {
  id: string;
  name: string;
  identifier: string;
  description: string;
  enabled: boolean;
}

export const INITIAL_TOOLS: ExampleTool[] = [
  {
    id: "tool-check-availability",
    name: "Check availability",
    identifier: "check_availability",
    description: "Verify open calendar slots for the requested date.",
    enabled: true,
  },
  {
    id: "tool-book-slot",
    name: "Book an appointment",
    identifier: "book_slot",
    description: "Hold a consultation slot after confirming with the customer.",
    enabled: true,
  },
];

export interface TestCheckItem {
  id: string;
  label: string;
}

export const TEST_CHECKS: TestCheckItem[] = [
  { id: "check-grounded", label: "Uses business information" },
  { id: "check-source", label: "Includes a source" },
  { id: "check-concise", label: "Keeps the reply clear" },
];

export interface ChannelItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const INITIAL_CHANNELS: ChannelItem[] = [
  {
    id: "chan-chat",
    name: "Website chat",
    description: "Embed on your site with one script tag.",
    enabled: true,
  },
  {
    id: "chan-phone",
    name: "Phone calls",
    description: "Answer inbound calls with low-latency voice.",
    enabled: false,
  },
  {
    id: "chan-api",
    name: "API access",
    description: "Invoke the turns endpoint from your own application.",
    enabled: false,
  },
];
