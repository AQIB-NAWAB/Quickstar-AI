/**
 * Demo Scenarios Content Specification
 * S5 "Try one before you build one"
 * Structured, typed scenario scripts matching the owner-approved design reference.
 */

export interface SourceSnippet {
  id: string;
  label: string;
  title: string;
  snippet: string;
}

export interface ActivityStep {
  id: string;
  label: string;
  secondary?: string;
}

export interface AppointmentData {
  name: string;
  service: string;
  date: string;
  time: string;
  status: string;
}

export interface LeadData {
  business: string;
  need: string;
  weeklyEnquiries: string;
  timeline: string;
  status: string;
}

export interface MessageItem {
  id: string;
  sender: "visitor" | "agent";
  text?: string;
  supportingText?: string;
  sources?: SourceSnippet[];
  appointment?: AppointmentData;
  lead?: LeadData;
  showHandoffButton?: boolean;
}

export interface ScriptTimelineEvent {
  stepIndex: number;
  revealedMessageCount: number;
  delayMs: number;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  activityTitle: string;
  activitySubtitle: string;
  messages: MessageItem[];
  activitySteps: ActivityStep[];
  timeline: ScriptTimelineEvent[];
}

export const DEMO_SCENARIOS: ScenarioDefinition[] = [
  {
    id: "answer-question",
    title: "Answer a question",
    activityTitle: "Behind the answer",
    activitySubtitle: "From your knowledge to a helpful reply",
    activitySteps: [
      { id: "step-1", label: "Message received" },
      { id: "step-2", label: "Context loaded" },
      { id: "step-3", label: "Knowledge searched", secondary: "2 sources found" },
      { id: "step-4", label: "Answer checked" },
      { id: "step-5", label: "Reply sent", secondary: "Ready for your customer" },
    ],
    messages: [
      {
        id: "m1",
        sender: "visitor",
        text: "Can I get a refund if I change my mind?",
      },
      {
        id: "m2",
        sender: "agent",
        text: "Yes. You can request a refund within 30 days of purchase.",
        supportingText:
          "Keep your receipt and contact our support team to get started.",
        sources: [
          {
            id: "source-1",
            label: "[1] Refund policy",
            title: "Refund policy",
            snippet: "“Refund requests are accepted within 30 days of purchase.”",
          },
          {
            id: "source-2",
            label: "[2] Support guide",
            title: "Support guide",
            snippet:
              "“Have your receipt ready and contact support to request a refund.”",
          },
        ],
      },
    ],
    timeline: [
      { stepIndex: 0, revealedMessageCount: 1, delayMs: 400 },
      { stepIndex: 1, revealedMessageCount: 1, delayMs: 600 },
      { stepIndex: 2, revealedMessageCount: 1, delayMs: 650 },
      { stepIndex: 3, revealedMessageCount: 1, delayMs: 650 },
      { stepIndex: 4, revealedMessageCount: 2, delayMs: 700 },
    ],
  },
  {
    id: "book-appointment",
    title: "Book an appointment",
    activityTitle: "Behind the answer",
    activitySubtitle: "From your knowledge to a helpful reply",
    activitySteps: [
      { id: "step-1", label: "Message received" },
      {
        id: "step-2",
        label: "Details collected",
        secondary: "Name, service and preferred time",
      },
      { id: "step-3", label: "Availability checked" },
      { id: "step-4", label: "Appointment booked" },
      { id: "step-5", label: "Confirmation sent" },
    ],
    messages: [
      {
        id: "b1",
        sender: "visitor",
        text: "I’d like to book a consultation.",
      },
      {
        id: "b2",
        sender: "agent",
        text: "Of course. What’s your name, and when would you like to visit?",
      },
      {
        id: "b3",
        sender: "visitor",
        text: "Alex Morgan. Tuesday, April 20, 2027 at 10:00 AM.",
      },
      {
        id: "b4",
        sender: "agent",
        text: "Your consultation is booked for Tuesday, April 20 at 10:00 AM.",
        appointment: {
          name: "Alex Morgan",
          service: "Consultation",
          date: "April 20, 2027",
          time: "10:00 AM",
          status: "Booked",
        },
      },
    ],
    timeline: [
      { stepIndex: 0, revealedMessageCount: 2, delayMs: 650 },
      { stepIndex: 1, revealedMessageCount: 3, delayMs: 750 },
      { stepIndex: 2, revealedMessageCount: 3, delayMs: 700 },
      { stepIndex: 3, revealedMessageCount: 4, delayMs: 750 },
      { stepIndex: 4, revealedMessageCount: 4, delayMs: 650 },
    ],
  },
  {
    id: "qualify-lead",
    title: "Qualify a lead",
    activityTitle: "Behind the answer",
    activitySubtitle: "From your knowledge to a helpful reply",
    activitySteps: [
      { id: "step-1", label: "Conversation started" },
      { id: "step-2", label: "Needs collected" },
      { id: "step-3", label: "Lead qualified" },
      { id: "step-4", label: "Record prepared" },
      { id: "step-5", label: "Handoff offered" },
    ],
    messages: [
      {
        id: "q1",
        sender: "agent",
        text: "What would you like help with?",
      },
      {
        id: "q2",
        sender: "visitor",
        text: "Following up with new enquiries.",
      },
      {
        id: "q3",
        sender: "agent",
        text: "About how many enquiries do you receive each week?",
      },
      {
        id: "q4",
        sender: "visitor",
        text: "Around 50.",
      },
      {
        id: "q5",
        sender: "agent",
        text: "When would you like to get started?",
      },
      {
        id: "q6",
        sender: "visitor",
        text: "This month.",
      },
      {
        id: "q7",
        sender: "agent",
        text: "Thanks. I’ll pass these details to your team so they can follow up.",
        lead: {
          business: "Example Studio",
          need: "Enquiry follow-up",
          weeklyEnquiries: "Around 50",
          timeline: "This month",
          status: "Qualified",
        },
        showHandoffButton: true,
      },
    ],
    timeline: [
      { stepIndex: 0, revealedMessageCount: 2, delayMs: 600 },
      { stepIndex: 1, revealedMessageCount: 4, delayMs: 700 },
      { stepIndex: 2, revealedMessageCount: 6, delayMs: 750 },
      { stepIndex: 3, revealedMessageCount: 7, delayMs: 750 },
      { stepIndex: 4, revealedMessageCount: 7, delayMs: 650 },
    ],
  },
];
