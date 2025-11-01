/**
 * @license
 * Copyright 2025 Aeven
 * SPDX-License-Identifier: Apache-2.0
 */
import { ImageGenerationRequest, ImageGenerationResponse, AuthConfig, StorySequenceArgs } from "./types.js";
export declare class ImageGenerator {
    private static environmentHydrated;
    private readonly apiKey;
    private readonly baseUrl;
    private readonly modelName;
    private readonly referer;
    private readonly title;
    private readonly generationPath;
    private static readonly DEFAULT_FORMAT;
    private static readonly DEFAULT_REFERER;
    constructor(authConfig: AuthConfig);
    private buildHeaders;
    private postJson;
    private handleResponse;
    private formatErrorMessage;
    private parseImageFromResponse;
    private openImagePreview;
    private shouldAutoPreview;
    private handlePreview;
    static validateAuthentication(): AuthConfig;
    private isValidBase64ImageData;
    private buildBatchPrompts;
    private static ensureAuthenticationEnv;
    private static applyEnvFromArgs;
    private static assignEnvFromPair;
    private static tryLoadEnvFiles;
    private resolveFileFormat;
    generateTextToImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
    private detectMimeType;
    generateStorySequence(request: ImageGenerationRequest, args?: StorySequenceArgs): Promise<ImageGenerationResponse>;
    editImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
    private handleApiError;
}
