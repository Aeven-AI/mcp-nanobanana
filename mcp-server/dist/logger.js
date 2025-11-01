/**
 * @license
 * Copyright 2025 Aeven
 * SPDX-License-Identifier: Apache-2.0
 */
const LEVEL_ORDER = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
};
const normalizeLevel = (level) => {
    if (!level) {
        return null;
    }
    const normalized = level.toLowerCase();
    return normalized in LEVEL_ORDER ? normalized : null;
};
const envLevel = normalizeLevel(process.env.NANOBANANA_LOG_LEVEL) ??
    normalizeLevel(process.env.LOG_LEVEL);
let currentLevel = envLevel ?? "silent";
const levelExplicitlySet = envLevel !== null;
const shouldLog = (level) => {
    return LEVEL_ORDER[level] <= LEVEL_ORDER[currentLevel];
};
const output = (level, args) => {
    if (!shouldLog(level)) {
        return;
    }
    console.error(...args);
};
export const logger = {
    getLevel() {
        return currentLevel;
    },
    setLevel(level) {
        currentLevel = level;
    },
    setDefaultLevel(level) {
        if (!levelExplicitlySet) {
            currentLevel = level;
        }
    },
    error(...args) {
        output("error", args);
    },
    warn(...args) {
        output("warn", args);
    },
    info(...args) {
        output("info", args);
    },
    debug(...args) {
        output("debug", args);
    },
};
