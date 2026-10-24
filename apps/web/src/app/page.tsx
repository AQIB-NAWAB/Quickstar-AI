import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_ACCESS } from "@/lib/server/auth/cookies";
import { LandingView } from "@/features/marketing/components/landing-view";
import { LandingChatWidget } from "@/features/marketing/components/landing-chat-widget";

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default function HomePage({ searchParams }: Props) {
  // If user is already authenticated and didn't explicitly request ?landing=1, take them to the workspace panel
  const showLanding = searchParams?.landing === "1" || searchParams?.marketing === "1";
  const token = cookies().get(COOKIE_ACCESS)?.value;

  if (token && !showLanding) {
    redirect("/workspaces");
  }

  const widgetKey = process.env.NEXT_PUBLIC_LANDING_WIDGET_PUBLISHABLE_KEY;
  const widgetAgentId = process.env.NEXT_PUBLIC_LANDING_WIDGET_AGENT_ID;
  const widgetGatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL;
  const widgetConfig =
    widgetKey && widgetAgentId && widgetGatewayUrl
      ? { publishableKey: widgetKey, agentId: widgetAgentId, gatewayUrl: widgetGatewayUrl }
      : null;

  return (
    <>
      <LandingView />
      {widgetConfig && <LandingChatWidget {...widgetConfig} />}
    </>
  );
}
