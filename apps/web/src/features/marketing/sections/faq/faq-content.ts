export interface FaqItem {
  id: string;
  question: string;
  answerHeading: string;
  answer: string;
}

export const DEFAULT_FAQ_ID = "do-i-need-to-code";

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "what-is-quickstart",
    question: "What is QuickStart AI?",
    answerHeading: "One agent for your business.",
    answer:
      "Build an agent that knows your business and use it on your website, on calls, and in campaigns. Your team can follow conversations and step in when needed.",
  },
  {
    id: "do-i-need-to-code",
    question: "Do I need to know how to code?",
    answerHeading: "No coding needed.",
    answer:
      "Add your documents, write your instructions, then test and publish. Use the API when you want to go further.",
  },
  {
    id: "human-takeover",
    question: "Can a person take over?",
    answerHeading: "Your team can step in.",
    answer:
      "Take over a conversation from the inbox and reply as yourself. When you’re ready, hand it back to the agent.",
  },
  {
    id: "phone-calls",
    question: "Can my agent handle phone calls?",
    answerHeading: "Inbound and outbound calls.",
    answer:
      "Connect a supported telephony provider to let your agent answer incoming calls or make outbound calls. Review the conversations from your workspace.",
  },
  {
    id: "pricing-status",
    question: "Are the prices final?",
    answerHeading: "Pricing is still proposed.",
    answer:
      "The plans shown are proposed. Prices, included usage, and availability are not yet final, and usage limits are being finalized during early access.",
  },
];
