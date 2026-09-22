.PHONY: up down logs ps smoke playground identity-migrate data-plane-up data-plane-down data-plane-logs data-plane-smoke

COMPOSE = docker compose

up: data-plane-up
down: data-plane-down
logs: data-plane-logs
smoke: data-plane-smoke

playground:
	@chmod +x scripts/local-playground.sh
	@./scripts/local-playground.sh

identity-migrate:
	pnpm --filter @quickstart/service-identity build
	pnpm --filter @quickstart/service-identity migrate

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
