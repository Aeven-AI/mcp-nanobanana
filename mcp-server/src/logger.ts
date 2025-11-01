/**
 * @license
 * Copyright 2025 Aeven
 * SPDX-License-Identifier: Apache-2.0
 */

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

let currentLevel: LogLevel = envLevel ?? "silent";
const levelExplicitlySet = envLevel !== null;

const shouldLog = (level: LogLevel): boolean => {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[currentLevel];
};

const output = (level: LogLevel, args: unknown[]): void => {
  if (!shouldLog(level)) {
    return;
  }

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
