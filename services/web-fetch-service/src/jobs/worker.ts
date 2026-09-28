import type { Logger } from "@quickstart/logging";
import type { WebFetchConfig } from "../config/environment.js";
import type { AcquisitionOrchestrator } from "../services/acquisition-orchestrator.js";
import type { JobRepository } from "./types.js";

function sameOriginPath(base: URL, link: string): string | null {
  try {
    const resolved = new URL(link, base);
    if (resolved.origin !== base.origin) return null;
    return resolved.href;
  } catch {
    return null;
  }
}

export function startCrawlWorker(options: {
  config: WebFetchConfig;
  jobs: JobRepository;
  orchestrator: AcquisitionOrchestrator;
  logger: Logger;
}): { stop: () => void } {
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    try {
      const job = await options.jobs.claimNextJob();
      if (!job) return;

      const { maxDepth, maxPages, renderJs } = job.params;
      const seed = new URL(job.seedUrl);
      const visited = new Set<string>();
      const queue: Array<{ url: string; depth: number }> = [{ url: job.seedUrl, depth: 0 }];
      const chunks: string[] = [];
      let pagesFetched = 0;

      while (queue.length > 0 && pagesFetched < maxPages) {
        const next = queue.shift();
        if (!next) break;
        if (visited.has(next.url)) continue;
        if (next.depth > maxDepth) continue;
        visited.add(next.url);

        try {
          const scraped = await options.orchestrator.scrapeForJob({
            workspaceId: job.workspaceId,
            requestId: job.requestId,
            url: next.url,
            renderJs,
          });
          pagesFetched += 1;
          chunks.push(`# ${next.url}\n\n${scraped.text}\n`);
          const combined = chunks.join("\n");
          const trimmed =
            combined.length > options.config.artifactMaxBytes
              ? combined.slice(0, options.config.artifactMaxBytes)
              : combined;
          await options.jobs.updateProgress(job.id, pagesFetched, trimmed);

          if (next.depth < maxDepth && pagesFetched < maxPages) {
            const linkRegex = /href=["']([^"']+)["']/gi;
            const htmlHint = scraped.text.includes("http") ? scraped.text : "";
            let match: RegExpExecArray | null;
            while ((match = linkRegex.exec(htmlHint)) !== null) {
              const href = sameOriginPath(seed, match[1]);
              if (href && !visited.has(href)) {
                queue.push({ url: href, depth: next.depth + 1 });
              }
            }
          }
        } catch (error) {
          const code =
            error && typeof error === "object" && "code" in error
              ? String((error as { code: string }).code)
              : "SCRAPE_FAILED";
          await options.jobs.markFailed(job.id, code);
          return;
        }
      }

      const artifact = chunks.join("\n").slice(0, options.config.artifactMaxBytes);
      await options.jobs.markReady(job.id, pagesFetched, artifact);
    } catch (error) {
      options.logger.error("crawl.worker.error", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  };

  const interval = setInterval(() => void tick(), options.config.workerPollMs);
  void tick();

  return {
    stop: () => {
      stopped = true;
      clearInterval(interval);
    },
  };
}
