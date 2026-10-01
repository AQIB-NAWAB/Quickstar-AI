"use client";

import { useState } from "react";
import { Copy, Check, Terminal, Cpu, CheckCircle2, ShieldCheck, Database, Layers } from "lucide-react";
import { ModeType } from "./interactive-url-bar";

interface CodePlaygroundProps {
  currentMode?: ModeType;
  currentPrompt?: string;
}

export function CodePlayground({
  currentMode = "chat",
  currentPrompt = "Resolve customer refund requests and update Stripe CRM",
}: CodePlaygroundProps) {
  const [activeLang, setActiveLang] = useState<"python" | "node" | "curl">("python");
  const [copied, setCopied] = useState(false);

  // Generate code based on language & mode
  const getCodeSnippet = () => {
    const prompt = currentPrompt || "Resolve customer refund requests and update Stripe CRM";

    if (activeLang === "python") {
      switch (currentMode) {
        case "chat":
          return `from quickstart import QuickStartClient\n\nclient = QuickStartClient(api_key="YOUR_API_KEY")\n\n# Execute conversation turn with immutable published agent snapshot\nresponse = client.agents.turn(\n    agent_id="ag_customer_support_v2",\n    conversation_id="conv_849204",\n    message="${prompt}",\n    context={"channel": "web_chat", "user_id": "usr_912"}\n)\nprint(response.content)\n# Output: "I have processed the refund of $49.00 for order #8492."`;
        case "voice":
          return `from quickstart import QuickStartClient\n\nclient = QuickStartClient(api_key="YOUR_API_KEY")\n\n# Dispatch low-latency (<400ms) inbound/outbound telephony call\ncall = client.voice.dispatch_call(\n    agent_id="ag_voice_receptionist_v1",\n    to_phone="+1 (415) 555-0199",\n    from_phone="+1 (800) 555-0100",\n    streaming_audio=True,\n    options={"barge_in": True, "stt_model": "deepgram-nova-2"}\n)\nprint(f"Call live on port 3008: {call.call_id}")`;
        case "knowledge":
          return `from quickstart import QuickStartClient\n\nclient = QuickStartClient(api_key="YOUR_API_KEY")\n\n# Ingest enterprise documentation into workspace OpenSearch vector index\nsource = client.knowledge.ingest(\n    workspace_id="ws_enterprise_01",\n    source_type="pdf",\n    url="https://internal.company.com/refund-policy.pdf",\n    chunk_size=512,\n    overlap=50\n)\nprint(f"Status: {source.status} - 128 chunks indexed")`;
        case "tools":
          return `from quickstart import QuickStartClient\n\nclient = QuickStartClient(api_key="YOUR_API_KEY")\n\n# Register tool with AES-256-GCM encrypted secrets vault credential\nclient.tools.register(\n    agent_id="ag_support_v2",\n    tool_name="stripe_refunds",\n    secret_ref="vault://stripe_live_key",\n    schema={\n        "type": "object",\n        "properties": {"order_id": {"type": "string"}, "amount": {"type": "number"}}\n    }\n)`;
      }
    }

    if (activeLang === "node") {
      switch (currentMode) {
        case "chat":
          return `import { QuickStartClient } from '@quickstart/sdk';\n\nconst client = new QuickStartClient({ apiKey: 'YOUR_API_KEY' });\n\n// Execute conversation turn via API Gateway (:3000)\nconst turn = await client.agents.turn({\n  agentId: 'ag_customer_support_v2',\n  conversationId: 'conv_849204',\n  message: '${prompt}',\n  channel: 'web_chat',\n});\nconsole.log(turn.content);`;
        case "voice":
          return `import { QuickStartClient } from '@quickstart/sdk';\n\nconst client = new QuickStartClient({ apiKey: 'YOUR_API_KEY' });\n\n// Start sub-400ms SIP/PSTN voice session\nconst call = await client.voice.startSession({\n  agentId: 'ag_voice_receptionist_v1',\n  phoneNumber: '+14155550199',\n  telephonyProvider: 'twilio',\n});\nconsole.log('Voice stream initiated:', call.sessionId);`;
        case "knowledge":
          return `import { QuickStartClient } from '@quickstart/sdk';\n\nconst client = new QuickStartClient({ apiKey: 'YOUR_API_KEY' });\n\n// Trigger async RAG ingestion into OpenSearch\nconst job = await client.knowledge.ingest({\n  workspaceId: 'ws_enterprise_01',\n  url: 'https://internal.company.com/refund-policy.pdf',\n});\nconsole.log('Ingestion job:', job.id);`;
        case "tools":
          return `import { QuickStartClient } from '@quickstart/sdk';\n\nconst client = new QuickStartClient({ apiKey: 'YOUR_API_KEY' });\n\n// Execute secured tool using vault-injected secret\nconst result = await client.tools.execute({\n  toolName: 'stripe_refunds',\n  params: { orderId: '8492', amount: 49.00 },\n});\nconsole.log('Tool response:', result);`;
      }
    }

    // cURL
    switch (currentMode) {
      case "chat":
        return `curl -X POST http://localhost:3000/v1/workspaces/ws-01/conversations/conv-12/turns \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "agent_id": "ag_customer_support_v2",\n    "message": "${prompt}"\n  }'`;
      case "voice":
        return `curl -X POST http://localhost:3000/v1/workspaces/ws-01/voice/calls \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "agent_id": "ag_voice_receptionist_v1",\n    "to_phone": "+14155550199"\n  }'`;
      case "knowledge":
        return `curl -X POST http://localhost:3000/v1/workspaces/ws-01/knowledge/ingest \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "source": "https://internal.company.com/refund-policy.pdf"\n  }'`;
      case "tools":
        return `curl -X POST http://localhost:3000/v1/workspaces/ws-01/tools/execute \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "tool": "stripe_refunds",\n    "params": { "order_id": "8492", "amount": 49.00 }\n  }'`;
    }
  };

  const code = getCodeSnippet();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 px-4 sm:px-0">
      <div className="bg-surface rounded-16 border border-border-faint shadow-firecrawl-card overflow-hidden">
        {/* Top Header / Language Switcher */}
        <div className="px-4 py-3 bg-neutral-50/80 border-b border-border-faint flex items-center justify-between">
          <div className="flex items-center gap-1">
            {(["python", "node", "curl"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLang(lang)}
                className={`px-3 py-1 rounded-6 text-xs font-semibold capitalize transition-all ${
                  activeLang === lang
                    ? "bg-white text-accent-black shadow-sm border border-border-faint"
                    : "text-neutral-500 hover:text-accent-black"
                }`}
              >
                {lang === "node" ? "Node.js (TypeScript)" : lang === "curl" ? "cURL API" : "Python SDK"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              10k req/s Runtime Ready
            </span>

            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-accent-black p-1 rounded"
              title="Copy snippet"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy SDK Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2-Column Split: SDK Request vs Live Agent Reasoning Trace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border-faint">
          {/* Left: Code Snippet */}
          <div className="p-4 sm:p-5 bg-white font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto text-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-3 font-sans font-medium uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-neutral-700">
                <Terminal className="w-3.5 h-3.5 text-heat-100" />
                QuickStart SDK Call
              </span>
              <span>{activeLang}</span>
            </div>
            <pre className="whitespace-pre overflow-x-auto text-neutral-800">
              <code>{code}</code>
            </pre>
          </div>

          {/* Right: Live Agent Reasoning & Trace Preview */}
          <div className="p-4 sm:p-5 bg-neutral-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-3 font-sans font-medium uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-neutral-800 font-semibold">
                  <Cpu className="w-3.5 h-3.5 text-heat-100" />
                  Realtime Execution Trace
                </span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Sub-200ms Latency
                </span>
              </div>

              {/* Step-by-Step Execution Pipeline */}
              <div className="font-mono text-xs space-y-2 max-h-[250px] overflow-y-auto">
                <div className="bg-white p-2.5 rounded-8 border border-border-faint flex items-start gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-500">[Snapshot]</span>{" "}
                    <span className="text-neutral-800 font-semibold">Agent v2.1 (Immutable)</span>
                    <p className="text-[11px] text-neutral-500">Loaded from PostgreSQL via agent pointer</p>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-8 border border-border-faint flex items-start gap-2">
                  <Database className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-500">[RAG Retrieval]</span>{" "}
                    <span className="text-neutral-800 font-semibold">OpenSearch kNN (3 chunks)</span>
                    <p className="text-[11px] text-neutral-500">source: refund-policy.pdf (score: 0.941)</p>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-8 border border-border-faint flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-500">[Tool Call]</span>{" "}
                    <span className="text-neutral-800 font-semibold">stripe_refunds(charge_id=&apos;ch_8941&apos;)</span>
                    <p className="text-[11px] text-emerald-600">200 OK — Decrypted via AES-256-GCM vault</p>
                  </div>
                </div>

                <div className="bg-emerald-50/60 p-2.5 rounded-8 border border-emerald-200 text-neutral-800">
                  <span className="text-emerald-700 font-bold">[Assistant Response]</span>
                  <p className="mt-0.5 font-sans text-xs text-neutral-700">
                    &quot;I have verified your purchase and successfully processed the refund of $49.00 for order #8492. A confirmation email has been dispatched.&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Response telemetry footer */}
            <div className="mt-4 pt-3 border-t border-border-faint flex flex-wrap items-center justify-between text-xs text-neutral-500 font-mono gap-2">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Turn Completed
              </span>
              <span>P99: 142ms</span>
              <span>Tenant: Fail-closed ✓</span>
              <span>Model: Claude 3.5 Sonnet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

