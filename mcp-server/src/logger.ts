/**
 * @license
 * Copyright 2025 Aeven
 * SPDX-License-Identifier: Apache-2.0
 */

import { format as formatLog } from "node:util";

export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

const LEVEL_ORDER: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

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

let currentLevel: LogLevel = envLevel ?? "error";
const levelExplicitlySet = envLevel !== null;

const shouldLog = (level: LogLevel): boolean => {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[currentLevel];
};

const writeToConsole = (level: LogLevel, line: string): void => {
  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "info":
      console.log(line);
      break;
    case "debug":
      console.debug(line);
      break;
    default:
      console.log(line);
  }
};

const output = (level: LogLevel, args: unknown[]): void => {
  if (!shouldLog(level)) {
    return;
  }

  const message = formatLog(...(args as unknown[]));
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  writeToConsole(level, line);
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
