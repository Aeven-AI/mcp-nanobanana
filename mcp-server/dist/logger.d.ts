/**
 * @license
 * Copyright 2025 Aeven
 * SPDX-License-Identifier: Apache-2.0
 */
export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";
export declare const logger: {
    getLevel(): LogLevel;
    setLevel(level: LogLevel): void;
    setDefaultLevel(level: LogLevel): void;
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    info(...args: unknown[]): void;
    debug(...args: unknown[]): void;
};
