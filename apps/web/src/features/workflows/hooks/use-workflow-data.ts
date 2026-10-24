"use client";

import { useEffect,useRef,useState } from "react";
import type { RepositoryResult,WorkflowRepository } from "../lib/types";

export function useWorkflowData<T>(
  fetchFn: (repo: WorkflowRepository, signal: AbortSignal) => Promise<RepositoryResult<T>>,
  repo: WorkflowRepository,
  deps: unknown[] = [],
) {
  const [result, setResult] = useState<RepositoryResult<T>>({
    status: "unavailable",
    message: "Loading...",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);

  const fetchIdRef = useRef(0);

  useEffect(() => {
    const fetchId = ++fetchIdRef.current;
    const controller = new AbortController();

    setIsLoading(true);

    async function execute() {
      try {
        const res = await fetchFn(repo, controller.signal);
        if (fetchId !== fetchIdRef.current) return;
        setResult(res);
        setIsLoading(false);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (fetchId !== fetchIdRef.current) return;
        setResult({
          status: "error",
          message: err instanceof Error ? err.message : "Request failed",
        });
        setIsLoading(false);
      }
    }

    void execute();

    return () => {
      controller.abort();
    };
  }, [repo, trigger, ...deps]);

  function reload() {
    setTrigger((v) => v + 1);
  }

  return { result, isLoading, reload };
}
