import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ImageGenerator } from '../../dist/imageGenerator.js';

const LARGE_BASE64_IMAGE = '/'.repeat(1024);

test('ImageGenerator.generateTextToImage writes files using stubbed fetch', async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nanobanana-img-'));
  const originalCwd = process.cwd();
  const originalFetch = global.fetch;
  const originalApiKey = process.env.MODEL_API_KEY;

  process.chdir(tempDir);
  process.env.MODEL_API_KEY = 'unit-test-key';

  t.after(async () => {
    process.chdir(originalCwd);
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
    if (originalApiKey === undefined) {
      delete process.env.MODEL_API_KEY;
    } else {
      process.env.MODEL_API_KEY = originalApiKey;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const payload = JSON.stringify({
    output: [
      {
        type: 'image_generation_call',
        result: LARGE_BASE64_IMAGE,
      },
    ],
  });

  global.fetch = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => payload,
  });

  const generator = new ImageGenerator({
    apiKey: 'unit-test-key',
    keyType: 'MODEL_API_KEY',
  });

  const result = await generator.generateTextToImage({
    prompt: 'unit test prompt',
    mode: 'generate',
    outputCount: 1,
    preview: false,
    noPreview: true,
  });

  assert.equal(result.success, true);
  assert.ok(Array.isArray(result.generatedFiles));
  assert.equal(result.generatedFiles?.length, 1);

  const [filePath] = result.generatedFiles ?? [];
  const stats = await fs.stat(filePath);
  assert.ok(stats.isFile(), 'Generated file should exist');
  assert.ok(stats.size > 0, 'Generated file should have content');
});

test('ImageGenerator.generateTextToImage surfaces API errors', async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nanobanana-img-err-'));
  const originalCwd = process.cwd();
  const originalFetch = global.fetch;

  process.chdir(tempDir);

  t.after(async () => {
    process.chdir(originalCwd);
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  global.fetch = async () => ({
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    text: async () =>
      JSON.stringify({ error: { message: 'invalid api key provided' } }),
  });

  const generator = new ImageGenerator({
    apiKey: 'unit-test-key',
    keyType: 'MODEL_API_KEY',
  });

  const result = await generator.generateTextToImage({
    prompt: 'should fail prompt',
    mode: 'generate',
    outputCount: 1,
    preview: false,
    noPreview: true,
  });

  assert.equal(result.success, false);
  assert.equal(result.message, 'Image generation failed');
  assert.ok(
    result.error?.toLowerCase().includes('authentication failed'),
    'Error message should indicate authentication failure',
  );
});
