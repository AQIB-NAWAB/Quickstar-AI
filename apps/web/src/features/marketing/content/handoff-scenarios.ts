export interface HandoffScenario {
  id: "alex" | "jamie" | "morgan";
  customerName: string;
  customerLabel: string;
  avatarSrc: string;
  avatarAlt: string;
  contextLine: string;
  question: string;
  teamLabel: string;
  teamReply: string;
  agentLabel: string;
  agentMessage: string;
}

export const HANDOFF_SCENARIOS: readonly HandoffScenario[] = [
  {
    id: "alex",
    customerName: "Alex",
    customerLabel: "Alex · Customer",
    avatarSrc: "/marketing/human-handoff/avatar-alex.png",
    avatarAlt: "Alex, fictional customer avatar",
    contextLine: "I need to change my delivery address.",
    question: "“Can I speak to someone about my order?”",
    teamLabel: "You · Team member",
    teamReply: "Hi Alex. I can help with that.\nLet’s update your delivery details.",
    agentLabel: "QuickStart agent",
    agentMessage: "Hi Alex. I’ll connect you with our team and share your delivery details.",
  },
  {
    id: "jamie",
    customerName: "Jamie",
    customerLabel: "Jamie · Customer",
    avatarSrc: "/marketing/use-cases/portrait-appointment.png",
    avatarAlt: "Jamie, fictional customer avatar",
    contextLine: "I need to move my appointment.",
    question: "“Could someone help me find another time?”",
    teamLabel: "You · Team member",
    teamReply: "Hi Jamie. I can help reschedule.\nLet’s find a time that works for you.",
    agentLabel: "QuickStart agent",
    agentMessage: "Hi Jamie. I’ll connect you with our team to help you reschedule.",
  },
  {
    id: "morgan",
    customerName: "Morgan",
    customerLabel: "Morgan · Customer",
    avatarSrc: "/marketing/use-cases/portrait-lead.png",
    avatarAlt: "Morgan, fictional customer avatar",
    contextLine: "I have a question about my invoice.",
    question: "“Can I speak to your team about this charge?”",
    teamLabel: "You · Team member",
    teamReply: "Hi Morgan. I can help review it.\nLet’s go through the invoice together.",
    agentLabel: "QuickStart agent",
    agentMessage: "Hi Morgan. I’ll share your invoice question with our team.",
  },
];
