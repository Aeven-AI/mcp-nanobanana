/**
 * @license
 * Copyright 2025 Aeven
 * SPDX-License-Identifier: Apache-2.0
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { ImageGenerator } from "./imageGenerator.js";
export declare class NanoBananaServer {
    private readonly server;
    private imageGenerator;
    private initializationError;
    private activeTransport?;
    constructor(customGenerator?: ImageGenerator);
    getServer(): Server;
    getInitializationError(): Error | null;
    start(transport?: Transport): Promise<void>;
    stop(): Promise<void>;
    private setupToolHandlers;
    private buildIconPrompt;
    private buildPatternPrompt;
    private buildDiagramPrompt;
    private setupErrorHandling;
}
