import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export type RecordingStore = {
  put(workspaceId: string, callId: string, bytes: Buffer): Promise<string>;
  /** Returns a path or signed-style local URL for staff playback. */
  getPlaybackUrl(objectKey: string, ttlSec?: number): Promise<string | null>;
  getBytes(objectKey: string): Promise<Buffer | null>;
};

export function createLocalRecordingStore(baseDir: string): RecordingStore {
  return {
    async put(workspaceId, callId, bytes) {
      const dir = join(baseDir, workspaceId);
      await mkdir(dir, { recursive: true });
      const key = `${workspaceId}/${callId}-${randomUUID()}.raw`;
      await writeFile(join(baseDir, key), bytes);
      return key;
    },
    async getPlaybackUrl(objectKey, _ttlSec = 300) {
      void _ttlSec;
      try {
        await readFile(join(baseDir, objectKey));
        return `/internal/voice/recordings/${encodeURIComponent(objectKey)}`;
      } catch {
        return null;
      }
    },
    async getBytes(objectKey) {
      try {
        return await readFile(join(baseDir, objectKey));
      } catch {
        return null;
      }
    },
  };
}

export function createMemoryRecordingStore(): RecordingStore & { objects: Map<string, Buffer> } {
  const objects = new Map<string, Buffer>();
  return {
    objects,
    async put(workspaceId, callId, bytes) {
      const key = `${workspaceId}/${callId}.raw`;
      objects.set(key, bytes);
      return key;
    },
    async getPlaybackUrl(objectKey) {
      return objects.has(objectKey) ? `memory://${objectKey}` : null;
    },
    async getBytes(objectKey) {
      return objects.get(objectKey) ?? null;
    },
  };
}
