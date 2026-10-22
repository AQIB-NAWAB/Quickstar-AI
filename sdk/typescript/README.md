# QuickStart AI TypeScript SDK

Official TypeScript and Node.js client library for the QuickStart AI voice and text agent platform.

## Features

- **Full Platform Coverage**: Agents, Conversations, Realtime SSE Streaming, Telephony & Outbound Dialing, Campaigns, Knowledge Base & OCR Extraction, Webhooks, and Billing.
- **Secure Webhook Verification**: Constant-time HMAC-SHA256 signature verification (`X-QuickStart-Signature`) with replay attack prevention.
- **Async Iteration**: Native `for await (const chunk of client.conversations.streamMessage(...))` support.
- **Zero Heavy Runtime Dependencies**: Built with standard web standards (`fetch`, `ReadableStream`).

## Installation

```bash
npm install @quickstart/sdk
# or
pnpm add @quickstart/sdk
# or
yarn add @quickstart/sdk
```

## Quick Start

### Initializing the Client

```typescript
import { QuickStartClient } from "@quickstart/sdk";

const client = new QuickStartClient({
  apiKey: process.env.QUICKSTART_API_KEY,
  workspaceId: "ws_12345",
  baseUrl: "https://api.quickstart.ai", // Defaults to http://127.0.0.1:3000
});
```

### Conversational SSE Streaming

```typescript
// Create conversation and stream assistant responses
const conversation = await client.conversations.create({
  agentId: "agent_abc123",
});

const stream = await client.conversations.streamMessage(
  conversation.id,
  "Hi! Can you schedule a consultation for tomorrow at 2 PM?"
);

for await (const chunk of stream) {
  if (chunk.type === "token") {
    process.stdout.write(chunk.content);
  } else if (chunk.type === "message_completed") {
    console.log("\nTurn finished:", chunk.messageId);
  }
}
```

### Telephony & Outbound Dialing

```typescript
// Trigger a high-priority outbound call connected to an AI voice agent
const call = await client.telephony.dial({
  agentId: "agent_voice_pro",
  fromNumber: "+14155552671",
  toNumber: "+14155559876",
  metadata: { customerName: "Jane Doe", priority: "high" },
});

console.log("Call initiated with provider SID:", call.providerCallSid);
```

### Launching an Outbound Campaign

```typescript
const campaign = await client.campaigns.create({
  name: "Q4 Customer Re-engagement",
  agentId: "agent_voice_pro",
  callerIdNumber: "+14155552671",
  concurrencyLimit: 5,
});

await client.campaigns.addTargets(campaign.id, [
  { recipientPhone: "+14155551111", metadata: { name: "Alice" } },
  { recipientPhone: "+14155552222", metadata: { name: "Bob" } },
]);

await client.campaigns.launch(campaign.id);
```

### Webhook Signature Verification

When receiving webhooks from QuickStart AI, verify the signature using the raw request body:

```typescript
import { verifyWebhookSignature } from "@quickstart/sdk";
import express from "express";

const app = express();

app.post(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.headers["x-quickstart-signature"] as string;
    const signingSecret = process.env.QUICKSTART_WEBHOOK_SECRET!;

    const isValid = verifyWebhookSignature({
      signatureHeader: signature,
      rawPayload: req.body,
      signingSecret,
      toleranceSeconds: 300, // Replay attack tolerance window (default: 5 minutes)
    });

    if (!isValid) {
      return res.status(401).send("Invalid webhook signature");
    }

    const payload = JSON.parse(req.body.toString());
    console.log("Received verified event:", payload.event);
    res.status(200).send("OK");
  }
);
```

## License

MIT
