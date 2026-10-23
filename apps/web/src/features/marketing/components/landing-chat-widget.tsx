"use client";

import { useEffect } from "react";

type LandingChatWidgetProps = {
  gatewayUrl: string;
  publishableKey: string;
  agentId: string;
};

/** Load the same public widget bundle that customers embed on their sites. */
export function LandingChatWidget({ gatewayUrl, publishableKey, agentId }: LandingChatWidgetProps) {
  useEffect(() => {
    let disposed = false;
    const instanceId = crypto.randomUUID();
    const destroy = () => {
      document.querySelector(`[data-quickstart-widget][data-widget-instance="${instanceId}"]`)
        ?.dispatchEvent(new Event("quickstart:destroy"));
    };
    const script = document.createElement("script");
    script.src = "/quickstart-widget.js";
    script.async = true;
    script.dataset.gatewayUrl = gatewayUrl;
    script.dataset.publishableKey = publishableKey;
    script.dataset.agentId = agentId;
    script.dataset.title = "Chat with QuickStart AI";
    script.dataset.color = "#f15a24";
    script.dataset.widgetInstance = instanceId;
    script.onload = () => {
      if (disposed) destroy();
    };
    document.body.appendChild(script);

    return () => {
      disposed = true;
      script.remove();
      destroy();
    };
  }, [gatewayUrl, publishableKey, agentId]);

  return null;
}
