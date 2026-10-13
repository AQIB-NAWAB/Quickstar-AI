import type { Logger } from "@quickstart/logging";
import { FakeCpaasProvider } from "./fake-cpaas.js";
import { SipBridgeProvider } from "./sip-provider.js";
import { TwilioCpaasProvider } from "./twilio-cpaas.js";
import { TelephonyRouter } from "./router.js";
import type { TelephonyProvider } from "./types.js";

export type TelephonyProfile = "fake" | "twilio";

export type CreateTelephonyRouterInput = {
  profile: TelephonyProfile;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  publicBaseUrl: string;
  sipBridgeSharedSecret: string;
  requireRealTelephony: boolean;
  logger?: Logger;
  fetchImpl?: typeof fetch;
};

export function assertTelephonyBootAllowed(input: {
  profile: TelephonyProfile;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  requireRealTelephony: boolean;
}): void {
  if (!input.requireRealTelephony) return;
  if (input.profile === "fake") {
    throw new Error(
      "TELEPHONY_REQUIRE_REAL=1 forbids TELEPHONY_PROFILE=fake; set TELEPHONY_PROFILE=twilio and Twilio credentials",
    );
  }
  if (!input.twilioAccountSid || !input.twilioAuthToken) {
    throw new Error(
      "TELEPHONY_REQUIRE_REAL=1 requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN",
    );
  }
}

function createTwilioProvider(input: CreateTelephonyRouterInput): TelephonyProvider {
  const sid = input.twilioAccountSid;
  const token = input.twilioAuthToken;
  if (!sid || !token) {
    throw new Error("TELEPHONY_PROFILE=twilio requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN");
  }
  return new TwilioCpaasProvider({
    accountSid: sid,
    authToken: token,
    fromNumber: input.twilioFromNumber ?? "",
    publicBaseUrl: input.publicBaseUrl.replace(/\/$/, ""),
    fetchImpl: input.fetchImpl,
  });
}

/**
 * Build a TelephonyRouter with swappable adapters.
 * - profile=fake: FakeCpaas registered as twilio + telnyx + fake (local / CI)
 * - profile=twilio: real Twilio as id `twilio`; Telnyx remains Fake stub (fallback profile)
 * SIP bridge always registered.
 */
export function createTelephonyRouter(input: CreateTelephonyRouterInput): {
  router: TelephonyRouter;
  sip: SipBridgeProvider;
  twilio: TelephonyProvider;
} {
  assertTelephonyBootAllowed(input);

  const router = new TelephonyRouter();
  const sip = new SipBridgeProvider(input.sipBridgeSharedSecret);

  let twilio: TelephonyProvider;
  if (input.profile === "twilio") {
    twilio = createTwilioProvider(input);
  } else {
    twilio = new FakeCpaasProvider("twilio");
  }

  const telnyx = new FakeCpaasProvider("telnyx");
  router.register(twilio);
  router.register(telnyx);
  router.register(sip);
  router.register(new FakeCpaasProvider("fake"));

  input.logger?.info("telephony.profile", {
    profile: input.profile,
    twilio_adapter: twilio instanceof TwilioCpaasProvider ? "twilio-cpaas" : "fake-cpaas",
    telnyx_adapter: "fake-cpaas",
  });

  return { router, sip, twilio };
}

export function resolveTelephonyProfile(
  rawProfile: string | undefined,
  hasTwilioCreds: boolean,
): TelephonyProfile {
  const value = (rawProfile ?? "").trim().toLowerCase();
  if (value === "twilio") return "twilio";
  if (value === "fake") return "fake";
  // Auto: use real Twilio when creds present and profile unset.
  if (!value && hasTwilioCreds) return "twilio";
  return "fake";
}
