import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import {
  createCachedWorkspaceAccessClient,
  createHttpWorkspaceAccessClient,
} from "@quickstart/workspace-access";
import { createRedisClient } from "@quickstart/utilities";
import { loadKnowledgeConfig } from "./config/environment.js";
import { createAuthMiddleware } from "./middleware/auth.middleware.js";
import { createRequireInternalTokenMiddleware } from "./middleware/require-internal-token.js";
import { requireTenantContext } from "./middleware/tenant.middleware.js";
import { createEmbeddingProvider } from "./lib/embed.js";
import {
  createS3ContentStore,
  ensureS3Bucket,
  type ContentStore,
} from "./lib/content-store.js";
import { OpenSearchClient } from "./lib/opensearch.js";
import { IngestQueue } from "./lib/sqs.js";
import { SourcesRepository } from "./repository/sources.repository.js";
import { SourcesService } from "./services/sources.service.js";
import { RetrieveService } from "./services/retrieve.service.js";
import { startIngestWorker } from "./services/ingest.worker.js";
import { createHttpServer, SERVICE_NAME } from "./http/create-server.js";

export async function startKnowledgeServer(): Promise<{ server: Server; shutdown: () => Promise<void> }> {
  const config = loadKnowledgeConfig();
  const logger = createLogger({ service: SERVICE_NAME });
  await initTracing({ serviceName: SERVICE_NAME });

  const pool = new Pool({ connectionString: config.databaseUrl });
  const repo = new SourcesRepository(pool);
  const queue = new IngestQueue(config);
  await queue.ensureQueue();

  const embedder = createEmbeddingProvider({
    provider: config.embeddingProvider,
    openaiApiKey: config.openaiApiKey,
  });
  const opensearch = new OpenSearchClient(config, embedder.dimensions);
  await opensearch.ensureIndex();

  const redisClient = createRedisClient(config.redisUrl);
  await redisClient.connect();

  const workspaceAccess = createCachedWorkspaceAccessClient({
    redis: redisClient,
    inner: createHttpWorkspaceAccessClient(config.workspaceUrl, config.httpRequestTimeoutMs),
    ttlSec: config.membershipCacheTtlSec,
    negativeTtlSec: config.membershipCacheNegativeTtlSec,
    onCacheDegraded: (detail) => logger.warn("membership.cache_degraded", { detail }),
  });

  let contentStore: ContentStore | null = null;
  if (config.s3Bucket && config.s3AccessKeyId && config.s3SecretAccessKey) {
    const s3Config = {
      endpoint: config.s3Endpoint,
      region: config.s3Region,
      bucket: config.s3Bucket,
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
      forcePathStyle: config.s3ForcePathStyle,
    };
    await ensureS3Bucket(s3Config);
    contentStore = createS3ContentStore(s3Config);
    logger.info("knowledge.storage.s3", { bucket: config.s3Bucket });
  } else {
    logger.warn("knowledge.storage.inline", {
      detail: "S3 not configured; source bytes stored in Postgres content_text",
    });
  }

  const sources = new SourcesService(repo, queue, contentStore);
  const retrieve = new RetrieveService(opensearch, embedder);
  const worker = startIngestWorker({
    config,
    queue,
    repo,
    opensearch,
    embedder,
    contentStore,
    logger,
  });

  const app = createHttpServer({
    logger,
    requestTimeoutMs: config.httpRequestTimeoutMs,
    readinessProbes: [
      async () => {
        await pool.query("SELECT 1");
      },
      async () => {
        await redisClient.ping();
      },
    ],
    authGuard: createAuthMiddleware(config.jwtAccessSecret),
    tenantGuard: requireTenantContext(),
    internalAuth: createRequireInternalTokenMiddleware(config.internalToken),
    workspaceAccess,
    sources,
    retrieve,
  });

  const server: Server = await new Promise((resolve) => {
    const httpServer = app.listen(config.port, "0.0.0.0", () => resolve(httpServer));
  });
  logger.info("listening", { port: config.port, service: SERVICE_NAME });

  const shutdown = async () => {
    worker.stop();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await pool.end();
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
    await shutdownTracing();
  };

  process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

  return { server, shutdown };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void startKnowledgeServer();
}
