import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export type RecordingStore = {
  begin(workspaceId: string, callId: string, contentType: string): Promise<string>;
  append(objectKey: string, sequence: number, bytes: Buffer): Promise<void>;
  finish(objectKey: string): Promise<void>;
  put(workspaceId: string, callId: string, bytes: Buffer, contentType?: string): Promise<string>;
  /** Returns a path or signed-style local URL for staff playback. */
  getPlaybackUrl(objectKey: string, ttlSec?: number): Promise<string | null>;
  getBytes(objectKey: string): Promise<Buffer | null>;
};

function extensionFor(contentType: string): string {
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("ogg")) return "ogg";
  return "bin";
}

export function createLocalRecordingStore(baseDir: string): RecordingStore {
  return {
    async begin(workspaceId, callId, contentType) {
      const dir = join(baseDir, workspaceId);
      await mkdir(dir, { recursive: true });
      return `${workspaceId}/${callId}-${randomUUID()}.${extensionFor(contentType)}`;
    },
    async append(objectKey, sequence, bytes) {
      const path = `${join(baseDir, objectKey)}.parts`;
      await mkdir(path, { recursive: true });
      await writeFile(join(path, `${String(sequence).padStart(8, "0")}.part`), bytes);
    },
    async finish(objectKey) {
      const partsDir = `${join(baseDir, objectKey)}.parts`;
      const names = (await readdir(partsDir)).filter((name) => name.endsWith(".part")).sort();
      const chunks = await Promise.all(names.map((name) => readFile(join(partsDir, name))));
      await writeFile(join(baseDir, objectKey), Buffer.concat(chunks));
      await rm(partsDir, { recursive: true, force: true });
    },
    async put(workspaceId, callId, bytes, contentType = "application/octet-stream") {
      const key = await this.begin(workspaceId, callId, contentType);
      await this.append(key, 0, bytes);
      await this.finish(key);
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

export function createS3RecordingStore(input: {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}): RecordingStore {
  const client = new S3Client({
    endpoint: input.endpoint,
    region: input.region,
    forcePathStyle: true,
    credentials: { accessKeyId: input.accessKeyId, secretAccessKey: input.secretAccessKey },
  });
  const contentTypes = new Map<string, string>();
  const prefix = (key: string) => `${key}.parts/`;
  const getObjectBytes = async (key: string): Promise<Buffer> => {
    const response = await client.send(new GetObjectCommand({ Bucket: input.bucket, Key: key }));
    return Buffer.from(await response.Body!.transformToByteArray());
  };

  return {
    async begin(workspaceId, callId, contentType) {
      const key = `${workspaceId}/${callId}-${randomUUID()}.${extensionFor(contentType)}`;
      contentTypes.set(key, contentType);
      return key;
    },
    async append(objectKey, sequence, bytes) {
      await client.send(new PutObjectCommand({
        Bucket: input.bucket,
        Key: `${prefix(objectKey)}${String(sequence).padStart(8, "0")}`,
        Body: bytes,
        ContentType: "application/octet-stream",
      }));
    },
    async finish(objectKey) {
      const list = await client.send(new ListObjectsV2Command({ Bucket: input.bucket, Prefix: prefix(objectKey) }));
      const keys = (list.Contents ?? []).map((item) => item.Key).filter((key): key is string => Boolean(key)).sort();
      if (keys.length === 0) throw new Error("Cannot finalize an empty call recording");
      const chunks = await Promise.all(keys.map(getObjectBytes));
      await client.send(new PutObjectCommand({
        Bucket: input.bucket,
        Key: objectKey,
        Body: Buffer.concat(chunks),
        ContentType: contentTypes.get(objectKey) ?? "audio/webm",
      }));
      await Promise.all(keys.map((Key) => client.send(new DeleteObjectCommand({ Bucket: input.bucket, Key }))));
      contentTypes.delete(objectKey);
    },
    async put(workspaceId, callId, bytes, contentType = "application/octet-stream") {
      const key = await this.begin(workspaceId, callId, contentType);
      await this.append(key, 0, bytes);
      await this.finish(key);
      return key;
    },
    async getPlaybackUrl(objectKey) {
      try {
        await client.send(new GetObjectCommand({ Bucket: input.bucket, Key: objectKey, Range: "bytes=0-0" }));
        return `/internal/voice/recordings/${encodeURIComponent(objectKey)}`;
      } catch {
        return null;
      }
    },
    async getBytes(objectKey) {
      try {
        return await getObjectBytes(objectKey);
      } catch {
        return null;
      }
    },
  };
}

export function createMemoryRecordingStore(): RecordingStore & { objects: Map<string, Buffer> } {
  const objects = new Map<string, Buffer>();
  const pending = new Map<string, Buffer[]>();
  return {
    objects,
    async begin(workspaceId, callId, contentType) {
      void contentType;
      const key = `${workspaceId}/${callId}-${randomUUID()}.webm`;
      pending.set(key, []);
      return key;
    },
    async append(objectKey, sequence, bytes) {
      const chunks = pending.get(objectKey) ?? [];
      chunks[sequence] = bytes;
      pending.set(objectKey, chunks);
    },
    async finish(objectKey) {
      objects.set(objectKey, Buffer.concat(pending.get(objectKey) ?? []));
      pending.delete(objectKey);
    },
    async put(workspaceId, callId, bytes, contentType) {
      const key = await this.begin(workspaceId, callId, contentType ?? "audio/webm");
      await this.append(key, 0, bytes);
      await this.finish(key);
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
