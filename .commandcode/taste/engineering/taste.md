# Engineering

- Strongly prefers adapter-first / provider-agnostic design so implementations can be swapped easily: multiple telephony providers, multiple speech/voice providers, multiple LLM providers, with failover when one is restricted or rate-limited. Confidence: 0.9
- Prefers flexible, schema-as-data models over rigid, fixed-column tables — leads/campaigns "should not be restricted to specific columns"; things must be adaptable. Confidence: 0.8
- Wants real streaming at every hop (model-gateway → api-gateway → client) and low end-to-end latency; treats 3–4s response delay as a defect to fix. Confidence: 0.85
- Prefers lazy/on-demand work during runtime calls (avoid running RAG or heavy work on every turn) to keep latency down. Confidence: 0.65
- Values realistic, production-grade behavior over placeholder/fake responses — rejects mock/fake replies and wants real model output verified. Confidence: 0.8
- Cares about avoiding unnecessary/repeated network requests and rate-limit blowups (frequent 429s push him to demand request de-duplication). Confidence: 0.7
- Prefers background/async execution for long-running or harness-style work rather than blocking foreground processes. Confidence: 0.6
- Expects shipped functionality to actually deliver what the marketing/landing-page copy promises; when there is a gap, close it in the product rather than softening the copy. Confidence: 0.6
- For third-party integrations, expects the agent to research the provider's real/official API documentation first and build against actual endpoints and shapes, explicitly asking to "do research" instead of implementing from assumptions. Confidence: 0.7
- When redesigning or extending an existing module, prefers to preserve existing functionality and data, and avoid unnecessary refactoring or introducing duplicate services. Confidence: 0.7
