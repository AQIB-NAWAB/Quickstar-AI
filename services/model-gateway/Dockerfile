FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/errors/package.json packages/errors/
COPY packages/http-server/package.json packages/http-server/
COPY packages/logging/package.json packages/logging/
COPY packages/tracing/package.json packages/tracing/
COPY packages/utilities/package.json packages/utilities/
COPY services/model-gateway/package.json services/model-gateway/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages packages
COPY services/model-gateway services/model-gateway
RUN pnpm -r --filter @quickstart/service-model-gateway... run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3005
COPY --from=build /app ./
WORKDIR /app/services/model-gateway
EXPOSE 3005
CMD ["node", "dist/index.js"]
