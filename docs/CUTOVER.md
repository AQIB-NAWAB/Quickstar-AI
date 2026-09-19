# Production cutover checklist

## Dual-run

1. Deploy `apps/api` + `apps/worker` with new `DATABASE_URL`, `MONGODB_URI`, `REDIS_URL`.
2. Issue new `client_id`s to early adopters.
3. Point dashboard (`apps/web`) `NEXT_PUBLIC_API_URL` at the new API.
4. Publish `@quickstart-ai/widget-react` / CDN `widget.js`.
5. Monitor `/health`, Redis rate-limit keys, ingest queue depth, eval scores.
6. When traffic is stable, decommission any old Express/Vercel backends.

## Security harden

- [ ] Set strong `JWT_SECRET` and rotate
- [ ] `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none` behind HTTPS
- [ ] Restrict `CORS_ORIGINS`
- [ ] Set project `allowedOrigins` for every production project
- [ ] Configure real `OPENAI_API_KEY` (or compatible provider)
- [ ] Enable DB backups (Postgres + Mongo)
- [ ] Alert on 429 spikes and ingest FAILED documents

## Load test smoke

```bash
# register + chat
curl -s localhost:3100/health
```
