#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Aeven
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from "./logger.js";
import { NanoBananaServer } from "./server.js";

const server = new NanoBananaServer();

const startServer = async () => {
  try {
    await server.start();
    const initError = server.getInitializationError();
    if (initError) {
      console.error(`Nano Banana server started with an initialization error:`);
      console.error(initError.message);
      console.error(
        "Generation tools will fail until the environment is configured correctly."
      );
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`Failed to start Nano Banana server: ${errorMessage}`);
    process.exit(1);
  }
};

startServer();
