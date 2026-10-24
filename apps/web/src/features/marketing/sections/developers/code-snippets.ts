export interface CodeToken {
  text: string;
  type?: "tag" | "attr" | "string" | "punct" | "plain";
}

export interface CodeLine {
  number: number;
  tokens: CodeToken[];
  isHighlighted?: boolean;
}

export interface CodeSnippet {
  id: "widget" | "http" | "mcp";
  tabLabel: string;
  fileLabel: string;
  rawText: string;
  lines: CodeLine[];
}

export const WIDGET_SNIPPET_RAW = `<script
  async
  src="https://YOUR-QUICKSTART-WEB-HOST/quickstart-widget.js"
  data-gateway-url="https://YOUR-QUICKSTART-GATEWAY"
  data-publishable-key="pk_live_..."
  data-agent-id="PUBLISHED_AGENT_UUID"
  data-title="Chat with us"
></script>`;

export const HTTP_TOOLS_SNIPPET_RAW = `HTTP APIs and MCP servers
Define tools in Workspace settings.
Attach them to your agent.
Credentials are injected when the tool runs.`;

export const CODE_SNIPPETS: Record<"widget" | "http" | "mcp", CodeSnippet> = {
  widget: {
    id: "widget",
    tabLabel: "Website widget",
    fileLabel: "index.html",
    rawText: WIDGET_SNIPPET_RAW,
    lines: [
      {
        number: 1,
        tokens: [
          { text: "<", type: "punct" },
          { text: "script", type: "tag" },
        ],
      },
      {
        number: 2,
        tokens: [
          { text: "  ", type: "plain" },
          { text: "async", type: "attr" },
        ],
      },
      {
        number: 3,
        tokens: [
          { text: "  ", type: "plain" },
          { text: "src", type: "attr" },
          { text: "=", type: "punct" },
          { text: '"https://YOUR-QUICKSTART-WEB-HOST/quickstart-widget.js"', type: "string" },
        ],
      },
      {
        number: 4,
        tokens: [
          { text: "  ", type: "plain" },
          { text: "data-gateway-url", type: "attr" },
          { text: "=", type: "punct" },
          { text: '"https://YOUR-QUICKSTART-GATEWAY"', type: "string" },
        ],
      },
      {
        number: 5,
        isHighlighted: true,
        tokens: [
          { text: "  ", type: "plain" },
          { text: "data-publishable-key", type: "attr" },
          { text: "=", type: "punct" },
          { text: '"pk_live_..."', type: "string" },
        ],
      },
      {
        number: 6,
        tokens: [
          { text: "  ", type: "plain" },
          { text: "data-agent-id", type: "attr" },
          { text: "=", type: "punct" },
          { text: '"PUBLISHED_AGENT_UUID"', type: "string" },
        ],
      },
      {
        number: 7,
        tokens: [
          { text: "  ", type: "plain" },
          { text: "data-title", type: "attr" },
          { text: "=", type: "punct" },
          { text: '"Chat with us"', type: "string" },
        ],
      },
      {
        number: 8,
        tokens: [
          { text: ">", type: "punct" },
          { text: "<", type: "punct" },
          { text: "/script", type: "tag" },
          { text: ">", type: "punct" },
        ],
      },
    ],
  },
  mcp: {
    id: "mcp", tabLabel: "MCP servers", fileLabel: "mcp-setup.txt",
    rawText: "Register your MCP server in Workspace settings.\nConfigure its connection and credentials.\nAttach its tools to your agent.",
    lines: [
      { number: 1, tokens: [{text: "Register your MCP server in Workspace settings."}] },
      { number: 2, tokens: [{text: "Configure its connection and credentials."}] },
      { number: 3, tokens: [{text: "Attach its tools to your agent."}] },
    ],
  },
  http: {
    id: "http",
    tabLabel: "HTTP tools",
    fileLabel: "http-tools.txt",
    rawText: HTTP_TOOLS_SNIPPET_RAW,
    lines: [
      {
        number: 1,
        tokens: [{ text: "HTTP APIs and MCP servers", type: "plain" }],
      },
      {
        number: 2,
        tokens: [{ text: "Define tools in Workspace settings.", type: "plain" }],
      },
      {
        number: 3,
        tokens: [{ text: "Attach them to your agent.", type: "plain" }],
      },
      {
        number: 4,
        tokens: [{ text: "Credentials are injected when the tool runs.", type: "plain" }],
      },
    ],
  },
};
