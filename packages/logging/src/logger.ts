import { redactRecord } from "./redact.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export type Logger = {
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
};

export type CreateLoggerOptions = {
  service: string;
  defaultFields?: LogFields;
};

function write(level: LogLevel, service: string, message: string, fields: LogFields): void {
  const payload = redactRecord({
    level,
    service,
    msg: message,
    time: new Date().toISOString(),
    ...fields,
  });
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

export function createLogger(options: CreateLoggerOptions): Logger {
  const base = options.defaultFields ?? {};
  const bind =
    (level: LogLevel) =>
    (message: string, fields: LogFields = {}): void => {
      write(level, options.service, message, { ...base, ...fields });
    };

  return {
    debug: bind("debug"),
    info: bind("info"),
    warn: bind("warn"),
    error: bind("error"),
  };
}
