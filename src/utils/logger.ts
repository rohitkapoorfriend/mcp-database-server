/**
 * Structured logger that outputs to stderr only.
 * stdout is reserved for MCP JSON-RPC protocol messages.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

/** Sets the minimum log level */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/** Returns the current log level */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (data && Object.keys(data).length > 0) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}

/** Log a debug message to stderr */
export function debug(message: string, data?: Record<string, unknown>): void {
  if (shouldLog("debug")) {
    console.error(formatMessage("debug", message, data));
  }
}

/** Log an info message to stderr */
export function info(message: string, data?: Record<string, unknown>): void {
  if (shouldLog("info")) {
    console.error(formatMessage("info", message, data));
  }
}

/** Log a warning message to stderr */
export function warn(message: string, data?: Record<string, unknown>): void {
  if (shouldLog("warn")) {
    console.error(formatMessage("warn", message, data));
  }
}

/** Log an error message to stderr */
export function error(message: string, data?: Record<string, unknown>): void {
  if (shouldLog("error")) {
    console.error(formatMessage("error", message, data));
  }
}

export const logger = { debug, info, warn, error, setLogLevel, getLogLevel };
