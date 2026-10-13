"use client";

import { useEffect,useRef,useState } from "react";
import type {
AnalyticsData,
AnalyticsDataSource,
DateRange,
} from "../lib/types";

export interface UseAnalyticsDataState {
  status: "loading" | "ready" | "unavailable" | "error";
  data: AnalyticsData | null;
  message?: string;
  description?: string;
  reload: () => void;
}

export function useAnalyticsData(
  dataSource: AnalyticsDataSource,
  range: DateRange,
): UseAnalyticsDataState {
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [message, setMessage] = useState<string | undefined>();
  const [description, setDescription] = useState<string | undefined>();
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Keep track of latest requested range to ignore stale responses
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++latestRequestIdRef.current;
    const controller = new AbortController();

    setStatus("loading");
    setMessage(undefined);
    setDescription(undefined);

    async function run() {
      try {
        const result = await dataSource.fetchAnalytics(range, controller.signal);

        // If another request was initiated in the meantime, discard this result
        if (requestId !== latestRequestIdRef.current) return;

        if (result.status === "ready") {
          setData(result.data);
          setStatus("ready");
        } else if (result.status === "unavailable") {
          setData(null);
          setStatus("unavailable");
          setMessage(result.message);
          setDescription(result.description);
        } else if (result.status === "forbidden") {
          setData(null);
          setStatus("unavailable");
          setMessage(result.message);
          setDescription("Your role cannot read workspace usage.");
        } else {
          setData(null);
          setStatus("error");
          setMessage(result.message);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (requestId !== latestRequestIdRef.current) return;

        setData(null);
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to load analytics data.");
      }
    }

    void run();

    return () => {
      controller.abort();
    };
  }, [dataSource, range.from, range.to, range.preset, reloadTrigger]);

  function reload() {
    setReloadTrigger((v) => v + 1);
  }

  return {
    status,
    data,
    message,
    description,
    reload,
  };
}
