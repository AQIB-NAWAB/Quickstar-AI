# QuickStart AI Python SDK

Official Python client library for the QuickStart AI voice and text agent platform. Provides both synchronous (`QuickStart`) and asynchronous (`AsyncQuickStart`) clients powered by `httpx`.

## Features

- **Dual API Support**: Full feature parity between synchronous and asynchronous (`asyncio`) interfaces.
- **SSE Streaming**: Yield message tokens in real-time with `stream_message(...)`.
- **Security**: Timing-safe `verify_webhook_signature` preventing replay attacks via timestamp verification.
- **Coverage**: Agents, Conversations, Outbound Telephony, Voice Campaigns, Knowledge Ingestion, Webhooks, Billing, and Analytics.

## Installation

```bash
pip install quickstart-ai
```

Or install with Poetry / uv:

```bash
poetry add quickstart-ai
# or
uv pip install quickstart-ai
```

## Quick Start

### Synchronous Usage

```python
import os
from quickstart_ai import QuickStart

client = QuickStart(
    api_key=os.getenv("QUICKSTART_API_KEY"),
    workspace_id="ws_12345",
    base_url="https://api.quickstart.ai",  # Defaults to http://127.0.0.1:3000
)

# Create an agent conversation and stream responses
conversation = client.conversations.create(agent_id="agent_sales_rep")

for event in client.conversations.stream_message(
    conversation_id=conversation["id"],
    content="What pricing tiers do you offer for high-volume enterprise call centers?",
):
    if event.get("type") == "token":
        print(event.get("content", ""), end="", flush=True)
    elif event.get("type") == "message_completed":
        print("\n\nTurn completed!")
```

### Asynchronous Usage (`asyncio`)

```python
import asyncio
import os
from quickstart_ai import AsyncQuickStart

async def main():
    async with AsyncQuickStart(
        api_key=os.getenv("QUICKSTART_API_KEY"),
        workspace_id="ws_12345",
    ) as client:
        # Trigger an outbound telephony voice call
        call = await client.telephony.dial(
            agent_id="agent_voice_pro",
            from_number="+14155552671",
            to_number="+14155559876",
            metadata={"source": "python-async-worker"},
        )
        print("Outbound call started:", call["providerCallSid"])

        # Stream assistant message
        conv = await client.conversations.create(agent_id="agent_voice_pro")
        async for chunk in client.conversations.stream_message(conv["id"], "Hello"):
            if chunk.get("type") == "token":
                print(chunk.get("content", ""), end="", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
```

### Campaign Management

```python
from quickstart_ai import QuickStart

client = QuickStart()

# Create and populate campaign
campaign = client.campaigns.create(
    name="VIP Outreach",
    agent_id="agent_voice_pro",
    caller_id_number="+14155552671",
    concurrency_limit=10,
)

client.campaigns.add_targets(
    campaign["id"],
    targets=[
        {"recipientPhone": "+14155551111", "metadata": {"name": "Alice"}},
        {"recipientPhone": "+14155552222", "metadata": {"name": "Bob"}},
    ],
)

client.campaigns.launch(campaign["id"])
```

### Webhook Signature Verification

```python
from fastapi import FastAPI, Header, HTTPException, Request
from quickstart_ai import verify_webhook_signature
import os

app = FastAPI()
SIGNING_SECRET = os.getenv("QUICKSTART_WEBHOOK_SECRET")

@app.post("/webhooks/quickstart")
async def handle_quickstart_webhook(
    request: Request,
    x_quickstart_signature: str = Header(None),
):
    raw_body = await request.body()

    is_valid = verify_webhook_signature(
        signature_header=x_quickstart_signature,
        raw_payload=raw_body,
        signing_secret=SIGNING_SECRET,
        tolerance_seconds=300,  # 5 minutes
    )

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    print("Received event:", payload["event"])
    return {"status": "received"}
```

## License

MIT
