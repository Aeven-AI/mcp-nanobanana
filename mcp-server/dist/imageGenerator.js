/**
 * @license
 * Copyright 2025 Aeven
 * SPDX-License-Identifier: Apache-2.0
 */
import { FileHandler } from "./fileHandler.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "url";
const execAsync = promisify(exec);
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
class OpenRouterApiError extends Error {
    constructor(message, status, statusText) {
        super(message);
        this.status = status;
        this.statusText = statusText;
        this.name = "OpenRouterApiError";
    }
}
export class ImageGenerator {
    constructor(authConfig) {
        this.apiKey = authConfig.apiKey;
        const env = process.env;
        this.baseUrl =
            env.MODEL_BASE_URL?.replace(/\/$/, "") || "https://openrouter.ai/api/v1";
        this.modelName = env.MODEL_ID || "google/gemini-2.5-flash-image";
        this.referer = env.MODEL_REFERER || ImageGenerator.DEFAULT_REFERER;
        this.title = env.MODEL_TITLE || "Nano Banana MCP Server";
        this.generationPath = env.MODEL_GENERATE_PATH || "/responses";
    }
    buildHeaders(kind) {
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: "application/json",
        };
        if (kind === "json") {
            headers["Content-Type"] = "application/json";
        }
        if (this.referer) {
            headers["HTTP-Referer"] = this.referer;
        }
        headers["X-Title"] = this.title;
        return headers;
    }
    async postJson(pathName, body) {
        const response = await fetch(`${this.baseUrl}${pathName}`, {
            method: "POST",
            headers: this.buildHeaders("json"),
            body: JSON.stringify(body),
        });
        return this.handleResponse(response);
    }
    async handleResponse(response) {
        const bodyText = await response.text();
        if (!response.ok) {
            throw new OpenRouterApiError(this.formatErrorMessage(response, bodyText), response.status, response.statusText);
        }
        try {
            return JSON.parse(bodyText);
        }
        catch {
            const snippet = bodyText.slice(0, 500);
            throw new OpenRouterApiError(`OpenRouter returned non-JSON response (status ${response.status}). Body snippet: ${snippet}`, response.status, response.statusText);
        }
    }
    formatErrorMessage(response, bodyText) {
        let detail;
        try {
            const parsed = JSON.parse(bodyText);
            detail = parsed?.error?.message || parsed?.message;
        }
        catch {
            detail = bodyText.trim();
        }
        const prefix = `OpenRouter request failed with status ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
        if (!detail) {
            return prefix;
        }
        return `${prefix}: ${detail.slice(0, 500)}`;
    }
    parseImageFromResponse(response) {
        if (!response) {
            return null;
        }
        const tryDecode = (value) => {
            if (!value) {
                return null;
            }
            if (value.startsWith("data:image")) {
                const commaIndex = value.indexOf(",");
                if (commaIndex !== -1) {
                    const base64 = value.slice(commaIndex + 1);
                    return this.isValidBase64ImageData(base64) ? base64 : null;
                }
            }
            return this.isValidBase64ImageData(value) ? value : null;
        };
        if (response.output && response.output.length > 0) {
            for (const item of response.output) {
                if (item.type === "image_generation_call") {
                    const direct = tryDecode(item.result);
                    if (direct) {
                        return direct;
                    }
                    if (item.content) {
                        for (const part of item.content) {
                            const contentImage = tryDecode(part.image_base64) ||
                                tryDecode(part.result) ||
                                tryDecode(part.data) ||
                                tryDecode(part.text);
                            if (contentImage) {
                                return contentImage;
                            }
                        }
                    }
                }
                if (item.content) {
                    for (const part of item.content) {
                        const embedded = tryDecode(part.image_base64) ||
                            tryDecode(part.result) ||
                            tryDecode(part.data) ||
                            tryDecode(part.text);
                        if (embedded) {
                            return embedded;
                        }
                    }
                }
            }
        }
        if (response.data && response.data.length > 0) {
            for (const part of response.data) {
                const encoded = part.b64_json || part.base64 || (part.url ? part.url : undefined);
                if (!encoded) {
                    continue;
                }
                if (encoded.startsWith("http")) {
                    console.error("DEBUG - Received URL in OpenRouter response; direct download not supported yet.");
                    continue;
                }
                const legacy = tryDecode(encoded);
                if (legacy) {
                    return legacy;
                }
            }
        }
        return null;
    }
    async openImagePreview(filePath) {
        try {
            const platform = process.platform;
            let command;
            switch (platform) {
                case "darwin":
                    command = `open "${filePath}"`;
                    break;
                case "win32":
                    command = `start "" "${filePath}"`;
                    break;
                default:
                    command = `xdg-open "${filePath}"`;
                    break;
            }
            await execAsync(command);
            console.error(`DEBUG - Opened preview for: ${filePath}`);
        }
        catch (error) {
            console.error(`DEBUG - Failed to open preview for ${filePath}:`, error instanceof Error ? error.message : String(error));
        }
    }
    shouldAutoPreview(request) {
        if (request.noPreview) {
            return false;
        }
        if (request.preview) {
            return true;
        }
        return false;
    }
    async handlePreview(files, request) {
        const shouldPreview = this.shouldAutoPreview(request);
        if (!shouldPreview || !files.length) {
            if (files.length > 1 && request.noPreview) {
                console.error(`DEBUG - Auto-preview disabled for ${files.length} images (--no-preview specified)`);
            }
            return;
        }
        console.error(`DEBUG - ${request.preview ? "Explicit" : "Auto"}-opening ${files.length} image(s) for preview`);
        const previewPromises = files.map((file) => this.openImagePreview(file));
        await Promise.all(previewPromises);
    }
    static validateAuthentication() {
        ImageGenerator.ensureAuthenticationEnv();
        if (process.env.MODEL_API_KEY) {
            console.error("✓ Found MODEL_API_KEY environment variable");
            return { apiKey: process.env.MODEL_API_KEY, keyType: "MODEL_API_KEY" };
        }
        throw new Error("ERROR: No model API key found. Please set the MODEL_API_KEY environment variable.\n" +
            "For provider setup details, see your model host documentation (OpenRouter docs: https://openrouter.ai/docs#authenticate).");
    }
    isValidBase64ImageData(data) {
        if (!data || data.length < 100) {
            return false;
        }
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(data)) {
            return false;
        }
        if (data.length < 1000) {
            console.error("DEBUG - Skipping short data that may not be image:", data.length, "characters");
            return false;
        }
        return true;
    }
    buildBatchPrompts(request) {
        const prompts = [];
        const basePrompt = request.prompt;
        if (!request.styles && !request.variations && !request.outputCount) {
            return [basePrompt];
        }
        if (request.styles && request.styles.length > 0) {
            for (const style of request.styles) {
                prompts.push(`${basePrompt}, ${style} style`);
            }
        }
        if (request.variations && request.variations.length > 0) {
            const basePrompts = prompts.length > 0 ? prompts : [basePrompt];
            const variationPrompts = [];
            for (const baseP of basePrompts) {
                for (const variation of request.variations) {
                    switch (variation) {
                        case "lighting":
                            variationPrompts.push(`${baseP}, dramatic lighting`);
                            variationPrompts.push(`${baseP}, soft lighting`);
                            break;
                        case "angle":
                            variationPrompts.push(`${baseP}, from above`);
                            variationPrompts.push(`${baseP}, close-up view`);
                            break;
                        case "color-palette":
                            variationPrompts.push(`${baseP}, warm color palette`);
                            variationPrompts.push(`${baseP}, cool color palette`);
                            break;
                        case "composition":
                            variationPrompts.push(`${baseP}, centered composition`);
                            variationPrompts.push(`${baseP}, rule of thirds composition`);
                            break;
                        case "mood":
                            variationPrompts.push(`${baseP}, cheerful mood`);
                            variationPrompts.push(`${baseP}, dramatic mood`);
                            break;
                        case "season":
                            variationPrompts.push(`${baseP}, in spring`);
                            variationPrompts.push(`${baseP}, in winter`);
                            break;
                        case "time-of-day":
                            variationPrompts.push(`${baseP}, at sunrise`);
                            variationPrompts.push(`${baseP}, at sunset`);
                            break;
                        default:
                            variationPrompts.push(`${baseP}, ${variation}`);
                            break;
                    }
                }
            }
            if (variationPrompts.length > 0) {
                prompts.splice(0, prompts.length, ...variationPrompts);
            }
        }
        if (prompts.length === 0 &&
            request.outputCount &&
            request.outputCount > 1) {
            for (let i = 0; i < request.outputCount; i++) {
                prompts.push(basePrompt);
            }
        }
        if (request.outputCount && prompts.length > request.outputCount) {
            prompts.splice(request.outputCount);
        }
        return prompts.length > 0 ? prompts : [basePrompt];
    }
    static ensureAuthenticationEnv() {
        if (ImageGenerator.environmentHydrated) {
            return;
        }
        ImageGenerator.environmentHydrated = true;
        ImageGenerator.applyEnvFromArgs();
        if (!process.env.MODEL_API_KEY) {
            ImageGenerator.tryLoadEnvFiles();
        }
        if (!process.env.MODEL_API_KEY) {
            const fallbackKeys = ["OPENROUTER_API_KEY", "OPENAI_API_KEY"];
            for (const key of fallbackKeys) {
                const value = process.env[key];
                if (value) {
                    process.env.MODEL_API_KEY = value;
                    console.error(`✓ Using ${key} environment variable as MODEL_API_KEY fallback`);
                    break;
                }
            }
        }
    }
    static applyEnvFromArgs() {
        const args = process.argv.slice(2);
        for (let index = 0; index < args.length; index++) {
            const arg = args[index];
            if (arg === "--env") {
                const assignment = args[index + 1];
                if (assignment) {
                    ImageGenerator.assignEnvFromPair(assignment);
                    index++;
                }
            }
            else if (arg.startsWith("--env=")) {
                const assignment = arg.slice("--env=".length);
                ImageGenerator.assignEnvFromPair(assignment);
            }
        }
    }
    static assignEnvFromPair(pair) {
        const separatorIndex = pair.indexOf("=");
        if (separatorIndex <= 0) {
            return;
        }
        const key = pair.slice(0, separatorIndex).trim();
        const value = pair.slice(separatorIndex + 1).trim();
        if (!key || !value) {
            return;
        }
        if (process.env[key] === undefined) {
            process.env[key] = value;
            if (key !== "MODEL_API_KEY") {
                console.error(`DEBUG - Loaded ${key} from CLI arguments`);
            }
        }
    }
    static tryLoadEnvFiles() {
        const searchPaths = new Set([
            path.resolve(process.cwd(), ".env"),
            path.resolve(process.cwd(), "mcp-server/.env"),
            path.resolve(MODULE_DIR, "../.env"),
            path.resolve(MODULE_DIR, "../../.env"),
        ]);
        for (const candidate of searchPaths) {
            if (!fs.existsSync(candidate)) {
                continue;
            }
            const result = loadEnv({
                path: candidate,
                override: false,
                quiet: true,
            });
            if (result.error) {
                console.error(`DEBUG - Failed to load environment file ${candidate}:`, result.error.message);
                continue;
            }
            if (process.env.MODEL_API_KEY) {
                console.error(`✓ Loaded MODEL_API_KEY from ${path.relative(process.cwd(), candidate)}`);
                return;
            }
        }
    }
    resolveFileFormat(request) {
        return request.fileFormat || ImageGenerator.DEFAULT_FORMAT;
    }
    async generateTextToImage(request) {
        try {
            const outputPath = FileHandler.ensureOutputDirectory();
            const generatedFiles = [];
            const prompts = this.buildBatchPrompts(request);
            let firstError = null;
            const fileFormat = this.resolveFileFormat(request);
            console.error(`DEBUG - Generating ${prompts.length} image variation(s)`);
            for (let i = 0; i < prompts.length; i++) {
                const currentPrompt = prompts[i];
                console.error(`DEBUG - Generating variation ${i + 1}/${prompts.length}:`, currentPrompt);
                try {
                    const payload = {
                        model: this.modelName,
                        input: [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "input_text",
                                        text: currentPrompt,
                                    },
                                ],
                            },
                        ],
                    };
                    if (request.seed !== undefined) {
                        payload.seed = request.seed;
                    }
                    const response = await this.postJson(this.generationPath, payload);
                    const imageBase64 = this.parseImageFromResponse(response);
                    if (imageBase64) {
                        const filename = FileHandler.generateFilename(request.styles || request.variations
                            ? currentPrompt
                            : request.prompt, fileFormat, i);
                        const fullPath = await FileHandler.saveImageFromBase64(imageBase64, outputPath, filename);
                        generatedFiles.push(fullPath);
                        console.error("DEBUG - Image saved to:", fullPath);
                    }
                    else {
                        console.error("DEBUG - No valid image data found in OpenRouter response");
                    }
                }
                catch (error) {
                    const errorMessage = this.handleApiError(error);
                    if (!firstError) {
                        firstError = errorMessage;
                    }
                    console.error(`DEBUG - Error generating variation ${i + 1}:`, errorMessage);
                    if (errorMessage.toLowerCase().includes("authentication failed")) {
                        return {
                            success: false,
                            message: "Image generation failed",
                            error: errorMessage,
                        };
                    }
                }
            }
            if (generatedFiles.length === 0) {
                return {
                    success: false,
                    message: "Failed to generate any images",
                    error: firstError ||
                        "No image data returned from OpenRouter. Try adjusting your prompt.",
                };
            }
            await this.handlePreview(generatedFiles, request);
            return {
                success: true,
                message: `Successfully generated ${generatedFiles.length} image variation(s)`,
                generatedFiles,
            };
        }
        catch (error) {
            console.error("DEBUG - Error in generateTextToImage:", error);
            return {
                success: false,
                message: "Failed to generate image",
                error: this.handleApiError(error),
            };
        }
    }
    detectMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        switch (ext) {
            case ".jpg":
            case ".jpeg":
                return "image/jpeg";
            case ".webp":
                return "image/webp";
            case ".gif":
                return "image/gif";
            default:
                return "image/png";
        }
    }
    async generateStorySequence(request, args) {
        try {
            const outputPath = FileHandler.ensureOutputDirectory();
            const generatedFiles = [];
            const steps = request.outputCount || 4;
            const type = args?.type || "story";
            const style = args?.style || "consistent";
            const transition = args?.transition || "smooth";
            let firstError = null;
            console.error(`DEBUG - Generating ${steps}-step ${type} sequence`);
            for (let i = 0; i < steps; i++) {
                const stepNumber = i + 1;
                let stepPrompt = `${request.prompt}, step ${stepNumber} of ${steps}`;
                switch (type) {
                    case "story":
                        stepPrompt += `, narrative sequence, ${style} art style`;
                        break;
                    case "process":
                        stepPrompt += `, procedural step, instructional illustration`;
                        break;
                    case "tutorial":
                        stepPrompt += `, tutorial step, educational diagram`;
                        break;
                    case "timeline":
                        stepPrompt += `, chronological progression, timeline visualization`;
                        break;
                    default:
                        stepPrompt += `, ${type} sequence`;
                        break;
                }
                if (i > 0) {
                    stepPrompt += `, ${transition} transition from previous step`;
                }
                console.error(`DEBUG - Generating step ${stepNumber}: ${stepPrompt}`);
                try {
                    const payload = {
                        model: this.modelName,
                        input: [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "input_text",
                                        text: stepPrompt,
                                    },
                                ],
                            },
                        ],
                    };
                    if (request.seed !== undefined) {
                        payload.seed = request.seed;
                    }
                    const response = await this.postJson(this.generationPath, payload);
                    const imageBase64 = this.parseImageFromResponse(response);
                    if (imageBase64) {
                        const filename = FileHandler.generateFilename(`${type}step${stepNumber}${request.prompt}`, "png", 0);
                        const fullPath = await FileHandler.saveImageFromBase64(imageBase64, outputPath, filename);
                        generatedFiles.push(fullPath);
                        console.error(`DEBUG - Step ${stepNumber} saved to:`, fullPath);
                    }
                    else {
                        console.error(`DEBUG - No image data returned for step ${stepNumber}`);
                    }
                }
                catch (error) {
                    const errorMessage = this.handleApiError(error);
                    if (!firstError) {
                        firstError = errorMessage;
                    }
                    console.error(`DEBUG - Error generating step ${stepNumber}:`, errorMessage);
                    if (errorMessage.toLowerCase().includes("authentication failed")) {
                        return {
                            success: false,
                            message: "Story generation failed",
                            error: errorMessage,
                        };
                    }
                }
                if (generatedFiles.length < stepNumber) {
                    console.error(`DEBUG - WARNING: Step ${stepNumber} failed to generate - no valid image data received`);
                }
            }
            console.error(`DEBUG - Story generation completed. Generated ${generatedFiles.length} out of ${steps} requested images`);
            if (generatedFiles.length === 0) {
                return {
                    success: false,
                    message: "Failed to generate any story sequence images",
                    error: firstError ||
                        "No image data returned from OpenRouter. Try adjusting your prompt.",
                };
            }
            await this.handlePreview(generatedFiles, request);
            const wasFullySuccessful = generatedFiles.length === steps;
            const successMessage = wasFullySuccessful
                ? `Successfully generated complete ${steps}-step ${type} sequence`
                : `Generated ${generatedFiles.length} out of ${steps} requested ${type} steps (${steps - generatedFiles.length} steps failed)`;
            return {
                success: true,
                message: successMessage,
                generatedFiles,
            };
        }
        catch (error) {
            console.error("DEBUG - Error in generateStorySequence:", error);
            return {
                success: false,
                message: `Failed to generate ${request.mode} sequence`,
                error: this.handleApiError(error),
            };
        }
    }
    async editImage(request) {
        try {
            if (!request.inputImage) {
                return {
                    success: false,
                    message: "Input image file is required for editing",
                    error: "Missing inputImage parameter",
                };
            }
            const fileResult = FileHandler.findInputFile(request.inputImage);
            if (!fileResult.found) {
                return {
                    success: false,
                    message: `Input image not found: ${request.inputImage}`,
                    error: `Searched in: ${fileResult.searchedPaths.join(", ")}`,
                };
            }
            const outputPath = FileHandler.ensureOutputDirectory();
            const imageBase64 = await FileHandler.readImageAsBase64(fileResult.filePath);
            const fileName = path.basename(fileResult.filePath);
            const mimeType = this.detectMimeType(fileName);
            const dataUrl = `data:${mimeType};base64,${imageBase64}`;
            const payload = {
                model: this.modelName,
                input: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "input_text",
                                text: request.prompt,
                            },
                        ],
                    },
                ],
                images: [dataUrl],
            };
            if (request.seed !== undefined) {
                payload.seed = request.seed;
            }
            const response = await this.postJson(this.generationPath, payload);
            const imageBase64Result = this.parseImageFromResponse(response);
            if (!imageBase64Result) {
                return {
                    success: false,
                    message: `Failed to ${request.mode} image`,
                    error: "No image data returned in OpenRouter response",
                };
            }
            const filename = FileHandler.generateFilename(`${request.mode}_${request.prompt}`, "png", 0);
            const fullPath = await FileHandler.saveImageFromBase64(imageBase64Result, outputPath, filename);
            await this.handlePreview([fullPath], request);
            return {
                success: true,
                message: `Successfully ${request.mode}d image`,
                generatedFiles: [fullPath],
            };
        }
        catch (error) {
            console.error(`DEBUG - Error in ${request.mode}Image:`, error);
            return {
                success: false,
                message: `Failed to ${request.mode} image`,
                error: this.handleApiError(error),
            };
        }
    }
    handleApiError(error) {
        if (error instanceof OpenRouterApiError) {
            const status = error.status;
            if (status === 401) {
                return "Authentication failed: The provided model API key is invalid. Please check your MODEL_API_KEY value.";
            }
            if (status === 403) {
                return "Authentication failed: Access to the requested OpenRouter resource is forbidden. Ensure your API key has access to the google/gemini-2.5-flash-image model.";
            }
            if (status === 429) {
                return "OpenRouter rate limit reached. Please wait a moment before retrying or review your plan limits.";
            }
            if (status === 400) {
                return `The request was rejected by OpenRouter: ${error.message}`;
            }
            if (status && status >= 500) {
                return "OpenRouter encountered an internal error while processing the request. Please try again later.";
            }
            return error.message;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.toLowerCase().includes("fetch failed")) {
            return "Network error communicating with OpenRouter. Please check your internet connection and try again.";
        }
        return `An unexpected error occurred: ${errorMessage}`;
    }
}
ImageGenerator.environmentHydrated = false;
ImageGenerator.DEFAULT_FORMAT = "png";
ImageGenerator.DEFAULT_REFERER = "https://github.com/AevenAI/mcps/tree/main/nanobanana";
