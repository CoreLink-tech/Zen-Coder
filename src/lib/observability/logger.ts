/**
 * Structured JSON logger for agent/tool/workflow events.
 * Safe for log drains (no secrets in default fields).
 */

type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  userId?: string;
  workspace?: string;
  taskId?: string;
  workflowId?: string;
  executionId?: string;
  toolId?: string;
  provider?: string;
  model?: string;
  durationMs?: number;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    service: "zen-coder",
    ...sanitize(context),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

const REDACT_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "secret",
  "authorization",
  "apiKey",
  "privateKey",
]);

function sanitize(ctx?: LogContext): LogContext | undefined {
  if (!ctx) return undefined;
  const out: LogContext = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (REDACT_KEYS.has(k)) {
      out[k] = "[redacted]";
    } else if (typeof v === "string" && v.length > 500) {
      out[k] = `${v.slice(0, 500)}…`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    emit("debug", message, context),
  info: (message: string, context?: LogContext) =>
    emit("info", message, context),
  warn: (message: string, context?: LogContext) =>
    emit("warn", message, context),
  error: (message: string, context?: LogContext) =>
    emit("error", message, context),
};
