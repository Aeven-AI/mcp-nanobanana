#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Aeven
 * SPDX-License-Identifier: Apache-2.0
 */
import { NanoBananaServer } from "./server.js";
const server = new NanoBananaServer();
server.start().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
