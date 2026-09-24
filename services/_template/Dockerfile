FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/auth/package.json packages/auth/
COPY packages/contracts/package.json packages/contracts/
COPY packages/errors/package.json packages/errors/
COPY packages/logging/package.json packages/logging/
COPY packages/tracing/package.json packages/tracing/
COPY packages/utilities/package.json packages/utilities/
COPY services/_template/package.json services/_template/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages packages
COPY services/_template services/_template
RUN pnpm -r run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app ./
WORKDIR /app/services/_template
EXPOSE 3000
CMD ["node", "dist/index.js"]

