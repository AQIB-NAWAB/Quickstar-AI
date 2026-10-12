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
import { loadVoiceConfig } from "./config/environment.js";
import { createAuthMiddleware } from "./middleware/auth.middleware.js";
import { createRequireInternalTokenMiddleware } from "./middleware/require-internal-token.js";
import { requireTenantContext } from "./middleware/tenant.middleware.js";
import { PgCallsRepository } from "./repository/calls.repository.js";
import { PgCampaignsRepository } from "./repository/campaigns.repository.js";
import { createLocalRecordingStore } from "./repository/recording.store.js";
import { createFakeSpeechBundle } from "./speech/fake-tts.js";
import { createHttpRuntimeClient } from "./clients/runtime.client.js";
import { createRedisCallCaps } from "./caps/call-caps.js";
import { CallSessionOrchestrator } from "./session/orchestrator.js";
import { CampaignsService } from "./services/campaigns.service.js";
import { TelephonyRouter } from "./telephony/router.js";
import { FakeCpaasProvider } from "./telephony/fake-cpaas.js";
import { SipBridgeProvider } from "./telephony/sip-provider.js";
import { createCallsController } from "./controllers/calls.controller.js";
import { createCampaignsController } from "./controllers/campaigns.controller.js";
import { createTelephonyController } from "./controllers/telephony.controller.js";
import { createHttpServer, SERVICE_NAME } from "./http/create-server.js";

export async function startVoiceServer(): Promise<{
  server: Server;
  shutdown: () => Promise<void>;
  orchestrator: CallSessionOrchestrator;
}> {
  const config = loadVoiceConfig();
  const logger = createLogger({ service: SERVICE_NAME });
  await initTracing({ serviceName: SERVICE_NAME });

  const pool = new Pool({ connectionString: config.databaseUrl });
  const callsRepo = new PgCallsRepository(pool);
  const campaignsRepo = new PgCampaignsRepository(pool);
  const recordings = createLocalRecordingStore(config.recordingDir);
  const speech = createFakeSpeechBundle();
  const runtime = createHttpRuntimeClient(config.runtimeUrl, config.httpRequestTimeoutMs);

  const redisClient = createRedisClient(config.redisUrl);
  await redisClient.connect();

  const caps = createRedisCallCaps(redisClient, {
    globalInbound: config.globalInboundCap,
    globalOutbound: config.globalOutboundCap,
    workspaceInbound: config.defaultWorkspaceInboundCap,
    workspaceOutbound: config.defaultWorkspaceOutboundCap,
  });

  const orchestrator = new CallSessionOrchestrator(
    callsRepo,
    caps,
    recordings,
    speech,
    runtime,
    logger,
    config.spokenFallbackPhrase,
    config.defaultVoiceDeadlineMs,
  );
  orchestrator.setDraining(config.draining);

  const telephony = new TelephonyRouter();
  const twilio = new FakeCpaasProvider("twilio");
  const telnyx = new FakeCpaasProvider("telnyx");
  const sip = new SipBridgeProvider(config.sipBridgeSharedSecret);
  telephony.register(twilio);
  telephony.register(telnyx);
  telephony.register(sip);
  telephony.register(new FakeCpaasProvider("fake"));

  const campaigns = new CampaignsService(campaignsRepo, orchestrator, telephony);

  const workspaceAccess = createCachedWorkspaceAccessClient({
    redis: redisClient,
    inner: createHttpWorkspaceAccessClient(config.workspaceUrl, config.httpRequestTimeoutMs),
    ttlSec: config.membershipCacheTtlSec,
    negativeTtlSec: config.membershipCacheNegativeTtlSec,
    onCacheDegraded: (detail) => logger.warn("membership.cache_degraded", { detail }),
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
    callsCtrl: createCallsController(callsRepo, orchestrator, recordings),
    campaignsCtrl: createCampaignsController(campaigns),
    telephonyCtrl: createTelephonyController(telephony, sip),
  });

  const server: Server = await new Promise((resolve) => {
    const httpServer = app.listen(config.port, "0.0.0.0", () => resolve(httpServer));
  });
  logger.info("listening", { port: config.port, service: SERVICE_NAME });

  const shutdown = async () => {
    orchestrator.setDraining(true);
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

  return { server, shutdown, orchestrator };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void startVoiceServer();
}
