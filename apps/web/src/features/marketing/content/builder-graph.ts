export type BuilderNodeType =
  | "start"
  | "message"
  | "form"
  | "http_request"
  | "condition"
  | "response"
  | "handoff"
  | "end"
  | "knowledge_search";

export interface NodePort {
  x: number;
  y: number;
}

export interface InspectorInputRow {
  key: string;
  value: string;
}

export interface NodeInspectorData {
  title: string;
  subtitle: string;
  badgeType?: "start" | "end" | "http" | "condition" | "message" | "form" | "handoff" | "response" | "knowledge";
  method?: string;
  endpoint?: string;
  inputs?: InspectorInputRow[];
  nextStep?: string;
  rule?: string;
  branchYes?: string;
  branchNeedsHelp?: string;
  trigger?: string;
  channels?: string;
  message?: string;
  fields?: string[];
  reason?: string;
  action?: string;
  source?: string;
  query?: string;
  result?: string;
  output?: string;
}

export interface BuilderNodeData {
  id: string;
  type: BuilderNodeType;
  typeLabel: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  statusDot?: "green" | "red";
  inspector: NodeInspectorData;
}

export interface BuilderConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  pathD: string;
  label?: string;
  labelPosition?: { x: number; y: number };
}

export interface TemplateSettingsDefaults {
  flowName: string;
  welcomeMessage: string;
  handoffInstruction: string;
}

export interface BuilderTemplateData {
  id: "appointment" | "knowledge";
  name: string;
  defaultSelectedNodeId: string;
  settings: TemplateSettingsDefaults;
  viewBox: { width: number; height: number };
  nodes: BuilderNodeData[];
  connections: BuilderConnection[];
  previewSequence: string[]; // Node IDs in sequence
}

const RAW_APPOINTMENT_TEMPLATE: BuilderTemplateData = {
  id: "appointment",
  name: "Appointment Assistant",
  defaultSelectedNodeId: "check_availability",
  settings: {
    flowName: "Appointment Assistant",
    welcomeMessage: "Hi. How can I help you today?",
    handoffInstruction: "Pass the conversation and collected details to the team.",
  },
  viewBox: { width: 1000, height: 380 },
  nodes: [
    {
      id: "entry_point",
      type: "start",
      typeLabel: "START",
      title: "Entry point",
      x: 24,
      y: 140,
      width: 90,
      height: 58,
      statusDot: "green",
      inspector: {
        title: "Entry point",
        subtitle: "Start",
        badgeType: "start",
        trigger: "New conversation",
        channels: "Website chat, Phone calls",
        nextStep: "Welcome",
      },
    },
    {
      id: "welcome",
      type: "message",
      typeLabel: "MESSAGE",
      title: "Welcome",
      x: 154,
      y: 140,
      width: 96,
      height: 58,
      inspector: {
        title: "Welcome",
        subtitle: "Message",
        badgeType: "message",
        message: "Hi. How can I help you today?",
        nextStep: "Collect details",
      },
    },
    {
      id: "collect_details",
      type: "form",
      typeLabel: "FORM",
      title: "Collect details",
      x: 290,
      y: 140,
      width: 104,
      height: 58,
      inspector: {
        title: "Collect details",
        subtitle: "Form",
        badgeType: "form",
        fields: ["Name", "Service", "Preferred date"],
        nextStep: "Check availability",
      },
    },
    {
      id: "check_availability",
      type: "http_request",
      typeLabel: "HTTP REQUEST",
      title: "Check availability",
      x: 434,
      y: 140,
      width: 114,
      height: 58,
      inspector: {
        title: "Check availability",
        subtitle: "HTTP request",
        badgeType: "http",
        method: "POST",
        endpoint: "/availability",
        inputs: [
          { key: "date", value: "Customer date" },
          { key: "service", value: "Selected service" },
        ],
        nextStep: "Available?",
      },
    },
    {
      id: "available_condition",
      type: "condition",
      typeLabel: "CONDITION",
      title: "Available?",
      x: 588,
      y: 140,
      width: 96,
      height: 58,
      inspector: {
        title: "Available?",
        subtitle: "Condition",
        badgeType: "condition",
        rule: "Appointment slot is available",
        branchYes: "Booking result",
        branchNeedsHelp: "Human handoff",
      },
    },
    {
      id: "booking_result",
      type: "response",
      typeLabel: "RESPONSE",
      title: "Booking result",
      x: 752,
      y: 140,
      width: 104,
      height: 58,
      inspector: {
        title: "Booking result",
        subtitle: "Response",
        badgeType: "response",
        message: "Your appointment is confirmed.",
        nextStep: "End",
      },
    },
    {
      id: "end_node",
      type: "end",
      typeLabel: "END",
      title: "End",
      x: 896,
      y: 140,
      width: 80,
      height: 58,
      statusDot: "red",
      inspector: {
        title: "End",
        subtitle: "End",
        badgeType: "end",
        action: "Finish the example flow",
      },
    },
    {
      id: "human_handoff",
      type: "handoff",
      typeLabel: "HANDOFF",
      title: "Human handoff",
      x: 654,
      y: 254,
      width: 110,
      height: 58,
      inspector: {
        title: "Human handoff",
        subtitle: "Handoff",
        badgeType: "handoff",
        reason: "The request needs a person",
        action: "Pass the conversation and collected details to the team",
      },
    },
  ],
  connections: [
    {
      id: "conn_1",
      fromNodeId: "entry_point",
      toNodeId: "welcome",
      pathD: "M 114 169 L 154 169",
    },
    {
      id: "conn_2",
      fromNodeId: "welcome",
      toNodeId: "collect_details",
      pathD: "M 250 169 L 290 169",
    },
    {
      id: "conn_3",
      fromNodeId: "collect_details",
      toNodeId: "check_availability",
      pathD: "M 394 169 L 434 169",
    },
    {
      id: "conn_4",
      fromNodeId: "check_availability",
      toNodeId: "available_condition",
      pathD: "M 548 169 L 588 169",
    },
    {
      id: "conn_5",
      fromNodeId: "available_condition",
      toNodeId: "booking_result",
      pathD: "M 684 169 L 752 169",
      label: "Yes",
      labelPosition: { x: 718, y: 157 },
    },
    {
      id: "conn_6",
      fromNodeId: "booking_result",
      toNodeId: "end_node",
      pathD: "M 856 169 L 896 169",
    },
    {
      id: "conn_handoff",
      fromNodeId: "available_condition",
      toNodeId: "human_handoff",
      pathD: "M 636 198 L 636 268 Q 636 283 650 283 L 654 283",
      label: "Needs help",
      labelPosition: { x: 672, y: 236 },
    },
  ],
  previewSequence: [
    "entry_point",
    "welcome",
    "collect_details",
    "check_availability",
    "available_condition",
    "booking_result",
    "end_node",
  ],
};

const RAW_KNOWLEDGE_TEMPLATE: BuilderTemplateData = {
  id: "knowledge",
  name: "Knowledge Assistant",
  defaultSelectedNodeId: "knowledge_search",
  settings: {
    flowName: "Knowledge Assistant",
    welcomeMessage: "Hi. What would you like to know?",
    handoffInstruction: "Pass the question and relevant context to the team.",
  },
  viewBox: { width: 1000, height: 380 },
  nodes: [
    {
      id: "entry_point",
      type: "start",
      typeLabel: "START",
      title: "Entry point",
      x: 24,
      y: 140,
      width: 90,
      height: 58,
      statusDot: "green",
      inspector: {
        title: "Entry point",
        subtitle: "Start",
        badgeType: "start",
        trigger: "New conversation",
        channels: "Website chat, App access",
        nextStep: "Welcome",
      },
    },
    {
      id: "welcome",
      type: "message",
      typeLabel: "MESSAGE",
      title: "Welcome",
      x: 154,
      y: 140,
      width: 96,
      height: 58,
      inspector: {
        title: "Welcome",
        subtitle: "Message",
        badgeType: "message",
        message: "Hi. What would you like to know?",
        nextStep: "Ask a question",
      },
    },
    {
      id: "ask_question",
      type: "form",
      typeLabel: "FORM",
      title: "Ask a question",
      x: 288,
      y: 140,
      width: 110,
      height: 58,
      inspector: {
        title: "Ask a question",
        subtitle: "Form",
        badgeType: "form",
        fields: ["Customer question"],
        nextStep: "Knowledge search",
      },
    },
    {
      id: "knowledge_search",
      type: "knowledge_search",
      typeLabel: "KNOWLEDGE SEARCH",
      title: "Knowledge search",
      x: 436,
      y: 140,
      width: 126,
      height: 58,
      inspector: {
        title: "Knowledge search",
        subtitle: "Knowledge search",
        badgeType: "knowledge",
        source: "Business documents",
        query: "Customer question",
        result: "Relevant passages",
        nextStep: "Answer found?",
      },
    },
    {
      id: "answer_found",
      type: "condition",
      typeLabel: "CONDITION",
      title: "Answer found?",
      x: 600,
      y: 140,
      width: 100,
      height: 58,
      inspector: {
        title: "Answer found?",
        subtitle: "Condition",
        badgeType: "condition",
        rule: "Useful supporting information was found",
        branchYes: "Reply with sources",
        branchNeedsHelp: "Human handoff",
      },
    },
    {
      id: "reply_sources",
      type: "response",
      typeLabel: "RESPONSE",
      title: "Reply with sources",
      x: 760,
      y: 140,
      width: 118,
      height: 58,
      inspector: {
        title: "Reply with sources",
        subtitle: "Response",
        badgeType: "response",
        output: "Answer with source references",
        nextStep: "End",
      },
    },
    {
      id: "end_node",
      type: "end",
      typeLabel: "END",
      title: "End",
      x: 914,
      y: 140,
      width: 76,
      height: 58,
      statusDot: "red",
      inspector: {
        title: "End",
        subtitle: "End",
        badgeType: "end",
        action: "Finish the example flow",
      },
    },
    {
      id: "human_handoff",
      type: "handoff",
      typeLabel: "HANDOFF",
      title: "Human handoff",
      x: 664,
      y: 254,
      width: 110,
      height: 58,
      inspector: {
        title: "Human handoff",
        subtitle: "Handoff",
        badgeType: "handoff",
        reason: "The request needs a person",
        action: "Pass the question and relevant context to the team",
      },
    },
  ],
  connections: [
    {
      id: "conn_k1",
      fromNodeId: "entry_point",
      toNodeId: "welcome",
      pathD: "M 114 169 L 154 169",
    },
    {
      id: "conn_k2",
      fromNodeId: "welcome",
      toNodeId: "ask_question",
      pathD: "M 250 169 L 288 169",
    },
    {
      id: "conn_k3",
      fromNodeId: "ask_question",
      toNodeId: "knowledge_search",
      pathD: "M 398 169 L 436 169",
    },
    {
      id: "conn_k4",
      fromNodeId: "knowledge_search",
      toNodeId: "answer_found",
      pathD: "M 562 169 L 600 169",
    },
    {
      id: "conn_k5",
      fromNodeId: "answer_found",
      toNodeId: "reply_sources",
      pathD: "M 700 169 L 760 169",
      label: "Yes",
      labelPosition: { x: 730, y: 157 },
    },
    {
      id: "conn_k6",
      fromNodeId: "reply_sources",
      toNodeId: "end_node",
      pathD: "M 878 169 L 914 169",
    },
    {
      id: "conn_k_handoff",
      fromNodeId: "answer_found",
      toNodeId: "human_handoff",
      pathD: "M 650 198 L 650 268 Q 650 283 660 283 L 664 283",
      label: "Needs help",
      labelPosition: { x: 686, y: 236 },
    },
  ],
  previewSequence: [
    "entry_point",
    "welcome",
    "ask_question",
    "knowledge_search",
    "answer_found",
    "reply_sources",
    "end_node",
  ],
};

// One geometry source for readable HTML nodes and their SVG port anchors.
function layoutTemplate(template: BuilderTemplateData): BuilderTemplateData {
  const widths = template.id === "appointment"
    ? [110, 108, 110, 130, 108, 110, 98]
    : [110, 108, 116, 136, 116, 132, 96];
  let x = 18;
  const positioned = new Map<string, BuilderNodeData>();
  template.previewSequence.forEach((id, index) => {
    const source = template.nodes.find((node) => node.id === id)!;
    positioned.set(id, { ...source, x, y: 140, width: widths[index], height: 84 });
    x += widths[index] + 25;
  });
  const condition = [...positioned.values()].find((node) => node.type === "condition")!;
  const handoff = template.nodes.find((node) => node.type === "handoff")!;
  positioned.set(handoff.id, { ...handoff, x: condition.x + 80, y: 280, width: 130, height: 84 });
  const nodes = template.nodes.map((node) => positioned.get(node.id)!);
  const connections = template.connections.map((edge) => {
    const from = positioned.get(edge.fromNodeId)!;
    const to = positioned.get(edge.toNodeId)!;
    if (to.type === "handoff") {
      const sx = from.x + from.width / 2;
      const sy = from.y + from.height;
      const ey = to.y + to.height / 2;
      return { ...edge,
        pathD: `M ${sx} ${sy} L ${sx} ${ey - 16} Q ${sx} ${ey} ${sx + 16} ${ey} L ${to.x} ${ey}`,
        labelPosition: { x: sx + 12, y: sy + 32 },
      };
    }
    const sx = from.x + from.width;
    const y = from.y + from.height / 2;
    return { ...edge, pathD: `M ${sx} ${y} L ${to.x} ${y}`,
      labelPosition: edge.label ? { x: sx + (to.x - sx) / 2, y: y - 14 } : undefined,
    };
  });
  return { ...template, viewBox: { width: 1000, height: 440 }, nodes, connections };
}

export const APPOINTMENT_TEMPLATE = layoutTemplate(RAW_APPOINTMENT_TEMPLATE);
export const KNOWLEDGE_TEMPLATE = layoutTemplate(RAW_KNOWLEDGE_TEMPLATE);

export const SUPPORTING_NODE_INVENTORY = [
  { id: "entry_point", label: "Entry point", icon: "Circle" },
  { id: "welcome", label: "Welcome", icon: "MessageSquare" },
  { id: "conversation", label: "Conversation", icon: "FileText" },
  { id: "ai_prompt", label: "AI prompt", icon: "Sparkles" },
  { id: "intent_router", label: "Intent router", icon: "GitFork" },
  { id: "knowledge_search", label: "Knowledge search", icon: "Database" },
  { id: "http_request", label: "HTTP request", icon: "Link2" },
  { id: "condition", label: "Condition", icon: "Diamond" },
  { id: "human_handoff", label: "Human handoff", icon: "User" },
  { id: "response", label: "Response", icon: "FileText" },
  { id: "end", label: "End", icon: "CircleDot" },
] as const;
