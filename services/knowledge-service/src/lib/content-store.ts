import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export type ContentStore = {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
};

export type S3ContentStoreConfig = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export function createS3ContentStore(config: S3ContentStoreConfig): ContentStore {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const bucket = config.bucket;

  return {
    async putObject(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
    async getObject(key) {
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const bytes = await res.Body?.transformToByteArray();
      if (!bytes) {
        throw new Error(`S3 object empty: ${key}`);
      }
      return Buffer.from(bytes);
    },
    async deleteObject(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

export async function ensureS3Bucket(config: S3ContentStoreConfig): Promise<void> {
  if (!config.endpoint) {
    return;
  }
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: config.bucket }));
  }
}

export function storageKeyForSource(workspaceId: string, sourceId: string, version: number): string {
  return `knowledge/${workspaceId}/${sourceId}/v${version}`;
}

export function rawStorageKeyForSource(
  workspaceId: string,
  sourceId: string,
  version: number,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `knowledge/${workspaceId}/${sourceId}/raw/v${version}/${safeName}`;
}
