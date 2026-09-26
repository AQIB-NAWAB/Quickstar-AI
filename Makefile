.PHONY: up down logs ps smoke playground identity-migrate workspace-migrate agent-migrate conversation-migrate knowledge-smoke data-plane-up data-plane-down data-plane-logs data-plane-smoke

COMPOSE = docker compose

up: data-plane-up
down: data-plane-down
logs: data-plane-logs
smoke: data-plane-smoke

knowledge-smoke:
	@chmod +x scripts/smoke-knowledge-data-plane.sh
	@./scripts/smoke-knowledge-data-plane.sh

playground:
	@chmod +x scripts/local-playground.sh
	@./scripts/local-playground.sh

identity-migrate:
	pnpm --filter @quickstart/service-identity build
	pnpm --filter @quickstart/service-identity migrate

workspace-migrate:
	pnpm --filter @quickstart/service-workspace build
	pnpm --filter @quickstart/service-workspace migrate

agent-migrate:
	pnpm --filter @quickstart/service-agent build
	pnpm --filter @quickstart/service-agent migrate

conversation-migrate:
	pnpm --filter @quickstart/service-conversation build
	pnpm --filter @quickstart/service-conversation migrate

data-plane-up:
	$(COMPOSE) up -d --wait

data-plane-down:
	$(COMPOSE) down

data-plane-logs:
	$(COMPOSE) logs -f

data-plane-smoke:
	@chmod +x scripts/smoke-data-plane.sh
	@./scripts/smoke-data-plane.sh

ps:
	$(COMPOSE) ps
