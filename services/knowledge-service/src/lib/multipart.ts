import busboy from "busboy";
import type { Request } from "@quickstart/http-server";
import { AppError, ErrorCode } from "@quickstart/errors";
import { MAX_FILE_SIZE_BYTES } from "./extract.js";

export interface ParsedFileUpload {
  name?: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  sizeBytes: number;
}

export function parseMultipartUpload(req: Request): Promise<ParsedFileUpload> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return reject(
        new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Request must be multipart/form-data",
        }),
      );
    }

    let bb: busboy.Busboy;
    try {
      bb = busboy({
        headers: req.headers,
        limits: {
          fileSize: MAX_FILE_SIZE_BYTES,
          files: 1,
          fields: 10,
        },
      });
    } catch (err) {
      return reject(
        new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Invalid multipart payload",
        }),
      );
    }

    let fieldName: string | undefined;
    let fileInfo: {
      fileName: string;
      mimeType: string;
      chunks: Buffer[];
      size: number;
      truncated: boolean;
    } | null = null;

    bb.on("field", (name, value) => {
      if (name === "name") {
        fieldName = value.trim();
      }
    });

    bb.on("file", (_fieldname, fileStream, info) => {
      const { filename, mimeType } = info;
      const chunks: Buffer[] = [];
      let size = 0;
      let truncated = false;

      fileInfo = {
        fileName: filename || "document.bin",
        mimeType: mimeType || "application/octet-stream",
        chunks,
        size: 0,
        truncated: false,
      };

      fileStream.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_FILE_SIZE_BYTES) {
          truncated = true;
          fileStream.resume();
        } else {
          chunks.push(chunk);
        }
      });

      fileStream.on("limit", () => {
        truncated = true;
      });

      fileStream.on("end", () => {
        if (fileInfo) {
          fileInfo.size = size;
          fileInfo.truncated = truncated;
        }
      });
    });

    bb.on("error", (err: unknown) => {
      reject(
        new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: err instanceof Error ? err.message : "Failed to parse upload",
        }),
      );
    });

    bb.on("close", () => {
      if (!fileInfo) {
        return reject(
          new AppError({
            code: ErrorCode.VALIDATION_FAILED,
            message: "No file was uploaded in request",
          }),
        );
      }

      if (fileInfo.truncated || fileInfo.size > MAX_FILE_SIZE_BYTES) {
        return reject(
          new AppError({
            code: ErrorCode.VALIDATION_FAILED,
            message: `File exceeds the 25 MB limit (${(fileInfo.size / (1024 * 1024)).toFixed(1)} MB)`,
          }),
        );
      }

      if (fileInfo.size === 0) {
        return reject(
          new AppError({
            code: ErrorCode.VALIDATION_FAILED,
            message: "Uploaded file is empty",
          }),
        );
      }

      const completeBuffer = Buffer.concat(fileInfo.chunks);
      resolve({
        name: fieldName,
        fileName: fileInfo.fileName,
        mimeType: fileInfo.mimeType,
        buffer: completeBuffer,
        sizeBytes: completeBuffer.length,
      });
    });

    req.pipe(bb);
  });
}
