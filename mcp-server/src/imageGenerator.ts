/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileHandler } from './fileHandler.js';
import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  AuthConfig,
  StorySequenceArgs,
} from './types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
const execAsync = promisify(exec);

class OpenRouterApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly statusText?: string,
  ) {
    super(message);
    this.name = 'OpenRouterApiError';
  }
}

interface OpenRouterImageData {
  b64_json?: string;
  base64?: string;
  url?: string;
}

interface OpenRouterOutputContent {
  type?: string;
  text?: string;
  data?: string;
  annotations?: unknown[];
  image_base64?: string;
  result?: string;
}

interface OpenRouterOutputItem {
  type?: string;
  role?: string;
  status?: string;
  content?: OpenRouterOutputContent[];
  result?: string;
}

interface OpenRouterImageResponse {
  data?: OpenRouterImageData[];
  output?: OpenRouterOutputItem[];
  error?: {
    message?: string;
  };
  message?: string;
}

export class ImageGenerator {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly modelName: string;
  private readonly referer: string;
  private readonly title: string;
  private readonly generationPath: string;
  private static readonly DEFAULT_FORMAT: 'png' | 'jpeg' = 'png';
  private static readonly DEFAULT_REFERER =
    'https://github.com/AevenAI/mcps/tree/main/nanobanana';

  constructor(authConfig: AuthConfig) {
    this.apiKey = authConfig.apiKey;
    const env = process.env;
    this.baseUrl =
      env.MODEL_BASE_URL?.replace(/\/$/, '') || 'https://openrouter.ai/api/v1';
    this.modelName = env.MODEL_ID || 'google/gemini-2.5-flash-image';
    this.referer = env.MODEL_REFERER || ImageGenerator.DEFAULT_REFERER;
    this.title = env.MODEL_TITLE || 'Nano Banana MCP Server';
    this.generationPath = env.MODEL_GENERATE_PATH || '/responses';
  }

  private buildHeaders(kind: 'json' | 'form'): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
    };

    if (kind === 'json') {
      headers['Content-Type'] = 'application/json';
    }

    if (this.referer) {
      headers['HTTP-Referer'] = this.referer;
    }

    headers['X-Title'] = this.title;

    return headers;
  }

  private async postJson<T>(pathName: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${pathName}`, {
      method: 'POST',
      headers: this.buildHeaders('json'),
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const bodyText = await response.text();

    if (!response.ok) {
      throw new OpenRouterApiError(
        this.formatErrorMessage(response, bodyText),
        response.status,
        response.statusText,
      );
    }

    try {
      return JSON.parse(bodyText) as T;
    } catch {
      const snippet = bodyText.slice(0, 500);
      throw new OpenRouterApiError(
        `OpenRouter returned non-JSON response (status ${response.status}). Body snippet: ${snippet}`,
        response.status,
        response.statusText,
      );
    }
  }

  private formatErrorMessage(response: Response, bodyText: string): string {
    let detail: string | undefined;
    try {
      const parsed = JSON.parse(bodyText) as OpenRouterImageResponse;
      detail = parsed?.error?.message || parsed?.message;
    } catch {
      detail = bodyText.trim();
    }

    const prefix = `OpenRouter request failed with status ${response.status}${
      response.statusText ? ` ${response.statusText}` : ''
    }`;

    if (!detail) {
      return prefix;
    }

    return `${prefix}: ${detail.slice(0, 500)}`;
  }

  private parseImageFromResponse(
    response: OpenRouterImageResponse,
  ): string | null {
    if (!response) {
      return null;
    }

    const tryDecode = (value?: string | null): string | null => {
      if (!value) {
        return null;
      }

      if (value.startsWith('data:image')) {
        const commaIndex = value.indexOf(',');
        if (commaIndex !== -1) {
          const base64 = value.slice(commaIndex + 1);
          return this.isValidBase64ImageData(base64) ? base64 : null;
        }
      }

      return this.isValidBase64ImageData(value) ? value : null;
    };

    if (response.output && response.output.length > 0) {
      for (const item of response.output) {
        if (item.type === 'image_generation_call') {
          const direct = tryDecode(item.result);
          if (direct) {
            return direct;
          }

          if (item.content) {
            for (const part of item.content) {
              const contentImage =
                tryDecode(part.image_base64) ||
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
            const embedded =
              tryDecode(part.image_base64) ||
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
        const encoded =
          part.b64_json || part.base64 || (part.url ? part.url : undefined);

        if (!encoded) {
          continue;
        }

        if (encoded.startsWith('http')) {
          console.error(
            'DEBUG - Received URL in OpenRouter response; direct download not supported yet.',
          );
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

  private async openImagePreview(filePath: string): Promise<void> {
    try {
      const platform = process.platform;
      let command: string;

      switch (platform) {
        case 'darwin':
          command = `open "${filePath}"`;
          break;
        case 'win32':
          command = `start "" "${filePath}"`;
          break;
        default:
          command = `xdg-open "${filePath}"`;
          break;
      }

      await execAsync(command);
      console.error(`DEBUG - Opened preview for: ${filePath}`);
    } catch (error: unknown) {
      console.error(
        `DEBUG - Failed to open preview for ${filePath}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private shouldAutoPreview(request: ImageGenerationRequest): boolean {
    if (request.noPreview) {
      return false;
    }

    if (request.preview) {
      return true;
    }

    return false;
  }

  private async handlePreview(
    files: string[],
    request: ImageGenerationRequest,
  ): Promise<void> {
    const shouldPreview = this.shouldAutoPreview(request);

    if (!shouldPreview || !files.length) {
      if (files.length > 1 && request.noPreview) {
        console.error(
          `DEBUG - Auto-preview disabled for ${files.length} images (--no-preview specified)`,
        );
      }
      return;
    }

    console.error(
      `DEBUG - ${request.preview ? 'Explicit' : 'Auto'}-opening ${files.length} image(s) for preview`,
    );

    const previewPromises = files.map((file) => this.openImagePreview(file));
    await Promise.all(previewPromises);
  }

  static validateAuthentication(): AuthConfig {
    if (process.env.MODEL_API_KEY) {
      console.error('✓ Found MODEL_API_KEY environment variable');
      return { apiKey: process.env.MODEL_API_KEY, keyType: 'MODEL_API_KEY' };
    }

    throw new Error(
      'ERROR: No model API key found. Please set the MODEL_API_KEY environment variable.\n' +
        'For provider setup details, see your model host documentation (OpenRouter docs: https://openrouter.ai/docs#authenticate).',
    );
  }

  private isValidBase64ImageData(data: string): boolean {
    if (!data || data.length < 100) {
      return false;
    }

    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(data)) {
      return false;
    }

    if (data.length < 1000) {
      console.error(
        'DEBUG - Skipping short data that may not be image:',
        data.length,
        'characters',
      );
      return false;
    }

    return true;
  }

  private buildBatchPrompts(request: ImageGenerationRequest): string[] {
    const prompts: string[] = [];
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
      const variationPrompts: string[] = [];

      for (const baseP of basePrompts) {
        for (const variation of request.variations) {
          switch (variation) {
            case 'lighting':
              variationPrompts.push(`${baseP}, dramatic lighting`);
              variationPrompts.push(`${baseP}, soft lighting`);
              break;
            case 'angle':
              variationPrompts.push(`${baseP}, from above`);
              variationPrompts.push(`${baseP}, close-up view`);
              break;
            case 'color-palette':
              variationPrompts.push(`${baseP}, warm color palette`);
              variationPrompts.push(`${baseP}, cool color palette`);
              break;
            case 'composition':
              variationPrompts.push(`${baseP}, centered composition`);
              variationPrompts.push(`${baseP}, rule of thirds composition`);
              break;
            case 'mood':
              variationPrompts.push(`${baseP}, cheerful mood`);
              variationPrompts.push(`${baseP}, dramatic mood`);
              break;
            case 'season':
              variationPrompts.push(`${baseP}, in spring`);
              variationPrompts.push(`${baseP}, in winter`);
              break;
            case 'time-of-day':
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

    if (
      prompts.length === 0 &&
      request.outputCount &&
      request.outputCount > 1
    ) {
      for (let i = 0; i < request.outputCount; i++) {
        prompts.push(basePrompt);
      }
    }

    if (request.outputCount && prompts.length > request.outputCount) {
      prompts.splice(request.outputCount);
    }

    return prompts.length > 0 ? prompts : [basePrompt];
  }

  private resolveFileFormat(
    request: ImageGenerationRequest,
  ): 'png' | 'jpeg' {
    return request.fileFormat || ImageGenerator.DEFAULT_FORMAT;
  }

  async generateTextToImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    try {
      const outputPath = FileHandler.ensureOutputDirectory();
      const generatedFiles: string[] = [];
      const prompts = this.buildBatchPrompts(request);
      let firstError: string | null = null;
      const fileFormat = this.resolveFileFormat(request);

      console.error(`DEBUG - Generating ${prompts.length} image variation(s)`);

      for (let i = 0; i < prompts.length; i++) {
        const currentPrompt = prompts[i];
        console.error(
          `DEBUG - Generating variation ${i + 1}/${prompts.length}:`,
          currentPrompt,
        );

        try {
          const payload: Record<string, unknown> = {
            model: this.modelName,
            input: [
              {
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: currentPrompt,
                  },
                ],
              },
            ],
          };

          if (request.seed !== undefined) {
            payload.seed = request.seed;
          }

          const response = await this.postJson<OpenRouterImageResponse>(
            this.generationPath,
            payload,
          );

          const imageBase64 = this.parseImageFromResponse(response);

          if (imageBase64) {
            const filename = FileHandler.generateFilename(
              request.styles || request.variations ? currentPrompt : request.prompt,
              fileFormat,
              i,
            );
            const fullPath = await FileHandler.saveImageFromBase64(
              imageBase64,
              outputPath,
              filename,
            );
            generatedFiles.push(fullPath);
            console.error('DEBUG - Image saved to:', fullPath);
          } else {
            console.error(
              'DEBUG - No valid image data found in OpenRouter response',
            );
          }
        } catch (error: unknown) {
          const errorMessage = this.handleApiError(error);
          if (!firstError) {
            firstError = errorMessage;
          }
          console.error(
            `DEBUG - Error generating variation ${i + 1}:`,
            errorMessage,
          );

          if (errorMessage.toLowerCase().includes('authentication failed')) {
            return {
              success: false,
              message: 'Image generation failed',
              error: errorMessage,
            };
          }
        }
      }

      if (generatedFiles.length === 0) {
        return {
          success: false,
          message: 'Failed to generate any images',
          error:
            firstError ||
            'No image data returned from OpenRouter. Try adjusting your prompt.',
        };
      }

      await this.handlePreview(generatedFiles, request);

      return {
        success: true,
        message: `Successfully generated ${generatedFiles.length} image variation(s)`,
        generatedFiles,
      };
    } catch (error: unknown) {
      console.error('DEBUG - Error in generateTextToImage:', error);
      return {
        success: false,
        message: 'Failed to generate image',
        error: this.handleApiError(error),
      };
    }
  }

  private detectMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.webp':
        return 'image/webp';
      case '.gif':
        return 'image/gif';
      default:
        return 'image/png';
    }
  }

  async generateStorySequence(
    request: ImageGenerationRequest,
    args?: StorySequenceArgs,
  ): Promise<ImageGenerationResponse> {
    try {
      const outputPath = FileHandler.ensureOutputDirectory();
      const generatedFiles: string[] = [];
      const steps = request.outputCount || 4;
      const type = args?.type || 'story';
      const style = args?.style || 'consistent';
      const transition = args?.transition || 'smooth';
      let firstError: string | null = null;

      console.error(`DEBUG - Generating ${steps}-step ${type} sequence`);

      for (let i = 0; i < steps; i++) {
        const stepNumber = i + 1;
        let stepPrompt = `${request.prompt}, step ${stepNumber} of ${steps}`;

        switch (type) {
          case 'story':
            stepPrompt += `, narrative sequence, ${style} art style`;
            break;
          case 'process':
            stepPrompt += `, procedural step, instructional illustration`;
            break;
          case 'tutorial':
            stepPrompt += `, tutorial step, educational diagram`;
            break;
          case 'timeline':
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
          const payload: Record<string, unknown> = {
            model: this.modelName,
            input: [
              {
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: stepPrompt,
                  },
                ],
              },
            ],
          };

          if (request.seed !== undefined) {
            payload.seed = request.seed;
          }

          const response = await this.postJson<OpenRouterImageResponse>(
            this.generationPath,
            payload,
          );

          const imageBase64 = this.parseImageFromResponse(response);

          if (imageBase64) {
            const filename = FileHandler.generateFilename(
              `${type}step${stepNumber}${request.prompt}`,
              'png',
              0,
            );
            const fullPath = await FileHandler.saveImageFromBase64(
              imageBase64,
              outputPath,
              filename,
            );
            generatedFiles.push(fullPath);
            console.error(`DEBUG - Step ${stepNumber} saved to:`, fullPath);
          } else {
            console.error(
              `DEBUG - No image data returned for step ${stepNumber}`,
            );
          }
        } catch (error: unknown) {
          const errorMessage = this.handleApiError(error);
          if (!firstError) {
            firstError = errorMessage;
          }
          console.error(
            `DEBUG - Error generating step ${stepNumber}:`,
            errorMessage,
          );

          if (errorMessage.toLowerCase().includes('authentication failed')) {
            return {
              success: false,
              message: 'Story generation failed',
              error: errorMessage,
            };
          }
        }

        if (generatedFiles.length < stepNumber) {
          console.error(
            `DEBUG - WARNING: Step ${stepNumber} failed to generate - no valid image data received`,
          );
        }
      }

      console.error(
        `DEBUG - Story generation completed. Generated ${generatedFiles.length} out of ${steps} requested images`,
      );

      if (generatedFiles.length === 0) {
        return {
          success: false,
          message: 'Failed to generate any story sequence images',
          error:
            firstError ||
            'No image data returned from OpenRouter. Try adjusting your prompt.',
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
    } catch (error: unknown) {
      console.error('DEBUG - Error in generateStorySequence:', error);
      return {
        success: false,
        message: `Failed to generate ${request.mode} sequence`,
        error: this.handleApiError(error),
      };
    }
  }

  async editImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    try {
      if (!request.inputImage) {
        return {
          success: false,
          message: 'Input image file is required for editing',
          error: 'Missing inputImage parameter',
        };
      }

      const fileResult = FileHandler.findInputFile(request.inputImage);
      if (!fileResult.found) {
        return {
          success: false,
          message: `Input image not found: ${request.inputImage}`,
          error: `Searched in: ${fileResult.searchedPaths.join(', ')}`,
        };
      }

      const outputPath = FileHandler.ensureOutputDirectory();
      const imageBase64 = await FileHandler.readImageAsBase64(
        fileResult.filePath!,
      );
      const fileName = path.basename(fileResult.filePath!);
      const mimeType = this.detectMimeType(fileName);

      const dataUrl = `data:${mimeType};base64,${imageBase64}`;

      const payload: Record<string, unknown> = {
        model: this.modelName,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
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

      const response = await this.postJson<OpenRouterImageResponse>(
        this.generationPath,
        payload,
      );

      const imageBase64Result = this.parseImageFromResponse(response);

      if (!imageBase64Result) {
        return {
          success: false,
          message: `Failed to ${request.mode} image`,
          error: 'No image data returned in OpenRouter response',
        };
      }

      const filename = FileHandler.generateFilename(
        `${request.mode}_${request.prompt}`,
        'png',
        0,
      );
      const fullPath = await FileHandler.saveImageFromBase64(
        imageBase64Result,
        outputPath,
        filename,
      );

      await this.handlePreview([fullPath], request);

      return {
        success: true,
        message: `Successfully ${request.mode}d image`,
        generatedFiles: [fullPath],
      };
    } catch (error: unknown) {
      console.error(`DEBUG - Error in ${request.mode}Image:`, error);
      return {
        success: false,
        message: `Failed to ${request.mode} image`,
        error: this.handleApiError(error),
      };
    }
  }

  private handleApiError(error: unknown): string {
    if (error instanceof OpenRouterApiError) {
      const status = error.status;
      if (status === 401) {
        return 'Authentication failed: The provided model API key is invalid. Please check your MODEL_API_KEY value.';
      }

      if (status === 403) {
        return 'Authentication failed: Access to the requested OpenRouter resource is forbidden. Ensure your API key has access to the google/gemini-2.5-flash-image model.';
      }

      if (status === 429) {
        return 'OpenRouter rate limit reached. Please wait a moment before retrying or review your plan limits.';
      }

      if (status === 400) {
        return `The request was rejected by OpenRouter: ${error.message}`;
      }

      if (status && status >= 500) {
        return 'OpenRouter encountered an internal error while processing the request. Please try again later.';
      }

      return error.message;
    }

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    if (errorMessage.toLowerCase().includes('fetch failed')) {
      return 'Network error communicating with OpenRouter. Please check your internet connection and try again.';
    }

    return `An unexpected error occurred: ${errorMessage}`;
  }
}
