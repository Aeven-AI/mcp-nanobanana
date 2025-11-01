/**
 * @license
 * Copyright 2025 Aeven
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { format as formatLog } from "node:util";

export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

const LEVEL_ORDER: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

const LOG_FILE_ENV = process.env.NANOBANANA_LOG_FILE;
let logFilePath: string | undefined;
let logFileInitialized = false;
let logFileWriteFailed = false;

const normalizeLevel = (level: string | undefined): LogLevel | null => {
  if (!level) {
    return null;
  }

  const normalized = level.toLowerCase() as LogLevel;
  return normalized in LEVEL_ORDER ? normalized : null;
};

const envLevel =
  normalizeLevel(process.env.NANOBANANA_LOG_LEVEL) ??
  normalizeLevel(process.env.LOG_LEVEL);

if (LOG_FILE_ENV) {
  logFilePath = path.resolve(LOG_FILE_ENV);
}

let currentLevel: LogLevel = envLevel ?? "error";
const levelExplicitlySet = envLevel !== null;

const shouldLog = (level: LogLevel): boolean => {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[currentLevel];
};

const initializeLogFile = (): void => {
  if (!logFilePath || logFileInitialized || logFileWriteFailed) {
    return;
  }

  try {
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    const banner = `\n=== Nano Banana log started ${new Date().toISOString()} ===${os.EOL}`;
    fs.appendFileSync(logFilePath, banner, "utf8");
    logFileInitialized = true;
  } catch (error: unknown) {
    logFileWriteFailed = true;
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(
      "Failed to initialize Nano Banana log file:",
      message
    );
  }
};

const appendToLogFile = (line: string): void => {
  if (!logFilePath || logFileWriteFailed) {
    return;
  }

  if (!logFileInitialized) {
    initializeLogFile();
  }

  if (!logFileInitialized) {
    return;
  }

  try {
    fs.appendFileSync(logFilePath, line + os.EOL, "utf8");
  } catch (error: unknown) {
    logFileWriteFailed = true;
    const message =
      error instanceof Error ? error.message : String(error);
    console.error("Failed to write Nano Banana log file:", message);
  }
};

const output = (level: LogLevel, args: unknown[]): void => {
  if (!shouldLog(level)) {
    return;
  }

  const message = formatLog(...(args as unknown[]));
  const timestamp = new Date().toISOString();
  appendToLogFile(`[${timestamp}] [${level.toUpperCase()}] ${message}`);

  console.error(...args);
};

export const logger = {
  getLevel(): LogLevel {
    return currentLevel;
  },
  setLevel(level: LogLevel): void {
    currentLevel = level;
  },
  setDefaultLevel(level: LogLevel): void {
    if (!levelExplicitlySet) {
      currentLevel = level;
    }
  },
  error(...args: unknown[]): void {
    output("error", args);
  },
  warn(...args: unknown[]): void {
    output("warn", args);
  },
  info(...args: unknown[]): void {
    output("info", args);
  },
  debug(...args: unknown[]): void {
    output("debug", args);
  },
};
