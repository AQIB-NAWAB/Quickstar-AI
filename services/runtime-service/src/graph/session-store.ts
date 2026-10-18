import { randomUUID } from "node:crypto";
import type { RedisClientType } from "redis";
import type {
  GraphExecutionTrace,
  GraphSessionState,
  GraphTraceEvent,
} from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";

/** Redis is authoritative when configured. Never execute from stale local state after a cache outage. */
export class GraphSessionStore {
  private memorySessions = new Map<string, GraphSessionState>();
  private memoryExecutionTraces = new Map<string, GraphExecutionTrace>();
  private listeners = new Map<string, Set<(event: GraphTraceEvent) => void>>();
  private memoryTurns = new Map<string, string>();
  private locks = new Set<string>();
  constructor(private readonly redis?: RedisClientType) {}
  private key(workspaceId: string, sessionId: string) {
    return `flow:session:${workspaceId}:${sessionId}`;
  }
  private runKey(workspaceId: string, runId: string) {
    return `flow:run:${workspaceId}:${runId}`;
  }

  async withSessionLock<T>(
    workspaceId: string,
    sessionId: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const key = `${this.key(workspaceId, sessionId)}:lock`;
    const token = randomUUID();
    if (
      this.locks.has(key) ||
      (this.redis && !(await this.redis.set(key, token, { NX: true, EX: 90 })))
    ) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "This conversation is already processing a turn. Please wait.",
      });
    }
    this.locks.add(key);
    try {
      return await action();
    } finally {
      this.locks.delete(key);
      if (this.redis)
        await this.redis.eval(
          "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
          { keys: [key], arguments: [token] },
        );
    }
  }

  async getTurn<T>(workspaceId: string, sessionId: string, turnId: string): Promise<T | null> {
    const key = `${this.key(workspaceId, sessionId)}:turn:${encodeURIComponent(turnId)}`;
    const raw = this.redis ? await this.redis.get(key) : this.memoryTurns.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  async saveTurn(
    workspaceId: string,
    sessionId: string,
    turnId: string,
    value: unknown,
  ): Promise<void> {
    const key = `${this.key(workspaceId, sessionId)}:turn:${encodeURIComponent(turnId)}`;
    const raw = JSON.stringify(value);
    if (this.redis) {
      await this.redis.set(key, raw, { EX: 86400 });
      return;
    }
    this.memoryTurns.set(key, raw);
    if (this.memoryTurns.size > 1000)
      this.memoryTurns.delete(this.memoryTurns.keys().next().value!);
  }
  async getSession(workspaceId: string, sessionId: string): Promise<GraphSessionState | null> {
    const key = this.key(workspaceId, sessionId);
    if (this.redis) {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as GraphSessionState) : null;
    }
    const session = this.memorySessions.get(key);
    if (session && Date.now() - Date.parse(session.updated_at) > 86400000) {
      this.memorySessions.delete(key);
      return null;
    }
    return session ? structuredClone(session) : null;
  }
  async saveSession(session: GraphSessionState): Promise<void> {
    const key = this.key(session.workspace_id, session.session_id);
    if (this.redis) {
      await this.redis.set(key, JSON.stringify(session), { EX: 86400 });
      return;
    }
    this.memorySessions.set(key, structuredClone(session));
    if (this.memorySessions.size > 1000)
      this.memorySessions.delete(this.memorySessions.keys().next().value!);
  }
  async deleteSession(workspaceId: string, sessionId: string): Promise<void> {
    this.memorySessions.delete(this.key(workspaceId, sessionId));
    if (this.redis) await this.redis.del(this.key(workspaceId, sessionId));
  }
  async clearSession(workspaceId: string, sessionId: string) {
    await this.deleteSession(workspaceId, sessionId);
  }
  async appendTraceEvent(
    workspaceId: string,
    sessionId: string,
    event: GraphTraceEvent,
  ): Promise<void> {
    for (const listener of this.listeners.get(this.key(workspaceId, sessionId)) ?? []) {
      try {
        listener(event);
      } catch {
        /* A disconnected subscriber must not abort execution. */
      }
    }
  }
  async saveTrace(trace: GraphExecutionTrace, workspaceId: string): Promise<void> {
    const key = this.runKey(workspaceId, trace.run_id);
    if (this.redis) {
      await this.redis
        .multi()
        .set(key, JSON.stringify(trace), { EX: 86400 })
        .rPush(`${this.key(workspaceId, trace.session_id)}:runs`, trace.run_id)
        .lTrim(`${this.key(workspaceId, trace.session_id)}:runs`, -100, -1)
        .expire(`${this.key(workspaceId, trace.session_id)}:runs`, 86400)
        .exec();
      return;
    }
    this.memoryExecutionTraces.set(key, structuredClone(trace));
    if (this.memoryExecutionTraces.size > 1000)
      this.memoryExecutionTraces.delete(this.memoryExecutionTraces.keys().next().value!);
  }
  async getTrace(workspaceId: string, runId: string): Promise<GraphExecutionTrace | null> {
    const key = this.runKey(workspaceId, runId);
    if (this.redis) {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as GraphExecutionTrace) : null;
    }
    return structuredClone(this.memoryExecutionTraces.get(key) ?? null);
  }
  async listTraces(
    workspaceId: string,
    sessionId: string,
    limit = 20,
  ): Promise<GraphExecutionTrace[]> {
    limit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.trunc(limit))) : 20;
    if (this.redis) {
      const ids = await this.redis.lRange(`${this.key(workspaceId, sessionId)}:runs`, -limit, -1);
      const traces = await Promise.all(ids.map((id) => this.getTrace(workspaceId, id)));
      return traces.filter((t): t is GraphExecutionTrace => t !== null);
    }
    const prefix = this.runKey(workspaceId, "");
    return structuredClone(
      [...this.memoryExecutionTraces]
        .filter(([key, t]) => key.startsWith(prefix) && t.session_id === sessionId)
        .map(([, t]) => t)
        .slice(-limit),
    );
  }
  subscribeTrace(
    workspaceId: string,
    sessionId: string,
    onEvent: (event: GraphTraceEvent) => void,
  ): () => void {
    const key = this.key(workspaceId, sessionId);
    const set = this.listeners.get(key) ?? new Set();
    this.listeners.set(key, set);
    set.add(onEvent);
    return () => {
      set.delete(onEvent);
      if (!set.size) this.listeners.delete(key);
    };
  }
}
