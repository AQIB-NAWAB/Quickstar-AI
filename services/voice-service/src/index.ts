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
import { createSpeechBundle, type SpeechProfile } from "./speech/factory.js";
import { createCatalogTextToSpeech } from "./speech/catalog-tts.js";
import { DeepgramSpeechToText } from "./speech/deepgram-stt.js";
import { createVoiceCatalogController } from "./controllers/voice-catalog.controller.js";
import { createHttpRuntimeClient } from "./clients/runtime.client.js";
import { createUsageIngestClient } from "./clients/usage.client.js";
import { createRedisCallCaps } from "./caps/call-caps.js";
import { CallSessionOrchestrator } from "./session/orchestrator.js";
import { CampaignsService } from "./services/campaigns.service.js";
import { createTelephonyRouter } from "./telephony/factory.js";
import { createRedisStatusIdempotencyStore } from "./telephony/status-idempotency.js";
import { createCallsController } from "./controllers/calls.controller.js";
import { createWidgetVoiceController } from "./controllers/widget-voice.controller.js";
import { WidgetVoiceService } from "./services/widget-voice.service.js";
import { createWidgetVoiceLiveController } from "./controllers/widget-voice-live.controller.js";
import { WidgetVoiceLiveSessionManager } from "./widget-voice/session-manager.js";
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

  function telephonySpeechProfile(): SpeechProfile {
    if (config.speechProfile !== "deepgram-fish") {
      return config.speechProfile;
    }
    if (
      !config.deepgramApiKey ||
      (!config.fishAudioApiKey && !config.speechOpenaiApiKey)
    ) {
      logger.warn("speech.profile_fallback", {
        requested: config.speechProfile,
        using: "fake",
        reason: "deepgram-fish needs DEEPGRAM_API_KEY plus FISH_AUDIO_API_KEY or OPENAI_API_KEY",
      });
      return "fake";
    }
    return "deepgram-fish";
  }

  const pool = new Pool({ connectionString: config.databaseUrl });
  const callsRepo = new PgCallsRepository(pool);
  const campaignsRepo = new PgCampaignsRepository(pool);
  const recordings = createLocalRecordingStore(config.recordingDir);
  const telephonyProfile = telephonySpeechProfile();
  const catalog = createCatalogTextToSpeech({
    upliftApiKey: config.upliftApiKey,
    cartesiaApiKey: config.cartesiaApiKey,
    cartesiaModel: config.cartesiaModel,
    fishApiKey: config.fishAudioApiKey,
    fishModel: config.fishAudioModel,
    fishReferenceId: config.fishAudioReferenceId,
    timeoutMs: config.speechHttpTimeoutMs,
  });
  const speechBundle = createSpeechBundle({
    profile: telephonyProfile,
    openaiApiKey: config.speechOpenaiApiKey,
    openaiBaseUrl: config.speechOpenaiBaseUrl,
    deepgramApiKey: config.deepgramApiKey,
    deepgramModel: config.deepgramModel,
    fishApiKey: config.fishAudioApiKey,
    fishModel: config.fishAudioModel,
    fishReferenceId: config.fishAudioReferenceId,
    requireRealSpeech: config.requireRealSpeech,
    circuitFailureThreshold: config.speechCircuitFailureThreshold,
    circuitCooldownMs: config.speechCircuitCooldownMs,
    httpTimeoutMs: config.speechHttpTimeoutMs,
    logger,
  });
  const speech = catalog ? { ...speechBundle, tts: catalog } : speechBundle;
  logger.info("speech.profile", {
    profile: telephonyProfile,
    configured: config.speechProfile,
    catalog: catalog
      ? { uplift: catalog.availability.uplift, cartesia: catalog.availability.cartesia, fish: catalog.availability.fish }
      : null,
  });
  const runtime = createHttpRuntimeClient(
    config.runtimeUrl,
    config.httpRequestTimeoutMs,
    config.internalToken,
  );
  const usageIngest = createUsageIngestClient({
    usageUrl: config.usageUrl,
    internalToken: config.usageInternalToken,
    logger,
  });

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
    usageIngest,
  );
  orchestrator.setDraining(config.draining);

  const { router: telephony, sip } = createTelephonyRouter({
    profile: config.telephonyProfile,
    twilioAccountSid: config.twilioAccountSid,
    twilioAuthToken: config.twilioAuthToken,
    twilioFromNumber: config.twilioFromNumber,
    publicBaseUrl: config.voicePublicBaseUrl,
    sipBridgeSharedSecret: config.sipBridgeSharedSecret,
    requireRealTelephony: config.requireRealTelephony,
    logger,
  });
  const statusIdempotency = createRedisStatusIdempotencyStore(redisClient);

  const campaigns = new CampaignsService(campaignsRepo, orchestrator, telephony);

  let widgetVoice: WidgetVoiceService | null = null;
  let widgetVoiceLive: WidgetVoiceLiveSessionManager | null = null;
  const gemini = Boolean(config.geminiApiKey);
  const realtime = Boolean(config.speechOpenaiApiKey);
  const cascade = Boolean(config.deepgramApiKey && (catalog || config.fishAudioApiKey || config.speechOpenaiApiKey));
  if (gemini || realtime || cascade) {
    const widgetSpeech =
      cascade && (config.fishAudioApiKey || config.speechOpenaiApiKey)
        ? createSpeechBundle({
            profile: config.fishAudioApiKey ? "deepgram-fish" : "openai",
            deepgramApiKey: config.deepgramApiKey,
            deepgramModel: config.deepgramModel,
            fishApiKey: config.fishAudioApiKey,
            fishModel: config.fishAudioModel,
            fishReferenceId: config.fishAudioReferenceId,
            openaiApiKey: config.speechOpenaiApiKey,
            openaiBaseUrl: config.speechOpenaiBaseUrl,
            requireRealSpeech: false,
            circuitFailureThreshold: config.speechCircuitFailureThreshold,
            circuitCooldownMs: config.speechCircuitCooldownMs,
            httpTimeoutMs: config.speechHttpTimeoutMs,
            logger,
          })
        : null;
    if (catalog && config.deepgramApiKey && !widgetSpeech) {
      widgetVoice = new WidgetVoiceService(
        new DeepgramSpeechToText({
          apiKey: config.deepgramApiKey,
          model: config.deepgramModel,
          timeoutMs: config.speechHttpTimeoutMs,
        }),
        catalog,
        runtime,
      );
    } else if (widgetSpeech) {
      widgetVoice = new WidgetVoiceService(widgetSpeech.stt, catalog ?? widgetSpeech.tts, runtime);
    }
    widgetVoiceLive = new WidgetVoiceLiveSessionManager({
      deepgramApiKey: config.deepgramApiKey,
      deepgramModel: config.deepgramModel ?? "nova-2",
      runtimeUrl: config.runtimeUrl,
      internalToken: config.internalToken,
      conversationUrl: config.conversationUrl,
      agentUrl: config.agentUrl,
      knowledgeUrl: config.knowledgeUrl,
      geminiApiKey: gemini ? config.geminiApiKey : undefined,
      geminiLiveModel: config.geminiLiveModel,
      openaiApiKey: !gemini && realtime ? config.speechOpenaiApiKey : undefined,
      openaiRealtimeModel: process.env.OPENAI_REALTIME_MODEL?.trim() || undefined,
      tts: catalog ?? widgetSpeech?.tts ?? null,
      preferCascade: Boolean(catalog && config.deepgramApiKey),
      logger,
    });
    logger.info("widget.voice.enabled", {
      live: catalog && config.deepgramApiKey
        ? "cascade-catalog"
        : gemini
          ? "gemini-live"
          : realtime
            ? "openai-realtime"
            : "deepgram-fish",
    });
  } else {
    logger.warn("widget.voice.disabled", {
      deepgram: Boolean(config.deepgramApiKey),
      fish: Boolean(config.fishAudioApiKey),
      openai_tts_fallback: Boolean(config.speechOpenaiApiKey),
    });
  }

  const workspaceAccess = createCachedWorkspaceAccessClient({
    redis: redisClient,
    inner: createHttpWorkspaceAccessClient(config.workspaceUrl, config.httpRequestTimeoutMs),
    ttlSec: config.membershipCacheTtlSec,
    negativeTtlSec: config.membershipCacheNegativeTtlSec,
    onCacheDegraded: (detail) => logger.warn("membership.cache_degraded", { detail }),
  });

  const app = createHttpServer({
    logger,
    requestTimeoutMs: Math.max(config.httpRequestTimeoutMs, 120_000),
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
    telephonyCtrl: createTelephonyController(telephony, {
      sip,
      orchestrator,
      calls: callsRepo,
      statusIdempotency,
      usageIngest,
    }),
    widgetVoiceCtrl: createWidgetVoiceController(widgetVoice),
    widgetVoiceLiveCtrl: createWidgetVoiceLiveController(widgetVoiceLive),
    voiceCatalogCtrl: createVoiceCatalogController(catalog),
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
