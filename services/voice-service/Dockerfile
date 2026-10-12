FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/auth/package.json packages/auth/
COPY packages/contracts/package.json packages/contracts/
COPY packages/errors/package.json packages/errors/
COPY packages/http-server/package.json packages/http-server/
COPY packages/logging/package.json packages/logging/
COPY packages/tracing/package.json packages/tracing/
COPY packages/utilities/package.json packages/utilities/
COPY packages/workspace-access/package.json packages/workspace-access/
COPY services/voice-service/package.json services/voice-service/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages packages
COPY services/voice-service services/voice-service
RUN pnpm --filter @quickstart/service-voice... run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3008
COPY --from=build /app ./
WORKDIR /app/services/voice-service
EXPOSE 3008
CMD ["node", "dist/index.js"]
