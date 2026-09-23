# Identity threat model (Slot 04)

Short list for ADR 0004; expand in Slot 29+ security hardening.

| Threat               | Impact            | Mitigation in Slot 04                                               |
| -------------------- | ----------------- | ------------------------------------------------------------------- |
| Credential stuffing  | Account takeover  | Generic login errors; rate limit at gateway later; short access JWT |
| Access token theft   | Session hijack    | Short TTL; HTTPS in prod; no tokens in logs                         |
| Refresh token theft  | Long-lived access | Hash at rest; rotation; reuse → revoke session in Redis             |
| IDOR on org / keys   | Cross-tenant data | Every route checks org membership; tests for user A vs org B        |
| API key leak         | Automation abuse  | Hash at rest; show once; revoke endpoint                            |
| JWT signing key leak | Forge any user    | Secrets Manager + rotation runbook (ADR 0004)                       |
