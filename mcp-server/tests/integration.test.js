/**
 * Integration tests covering core Nano Banana capabilities via OpenRouter.
 * Requires MODEL_API_KEY in mcp-server/.env (or environment).
 *
 * Tests:
 * 1. Generate image  – "/generate \"a watercolor painting of a fox in a snowy forest\""
 * 2. Edit image      – modify the image produced in test 1
 * 3. Restore image   – restore the same source image with a different prompt
 * 4. Generate story  – two-step process illustration
 * 5. Generate pattern – geometric seamless texture
 * 6. Generate diagram – login flow flowchart
 * 7. Generate icon   – "/icon \"coffee cup logo\" --type=\"app-icon\" --sizes=\"256\" --style=\"modern\""
 *
 * Generated assets are kept in nanobanana-output/ for manual inspection.
 */

import { strict as assert } from 'node:assert';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { ImageGenerator } from '../dist/imageGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env located in the mcp-server directory (if present)
loadEnv({ path: path.resolve(__dirname, '..', '.env') });

const hasModelKey = process.env.MODEL_API_KEY;

if (!hasModelKey) {
  console.error(
    'Missing MODEL_API_KEY. Create mcp-server/.env with MODEL_API_KEY=<your key> before running npm test.',
  );
  process.exit(1);
}

async function ensureFile(pathToFile, label) {
  const stats = await fs.stat(pathToFile);
  assert(stats.isFile(), `${label} did not produce a file`);
  assert(stats.size > 0, `${label} produced an empty file`);
}

async function testGenerateImage(generator) {
  console.log('\n▶ Test 1: Generate image – "a watercolor painting of a fox in a snowy forest"');

  const request = {
    prompt: 'a watercolor painting of a fox in a snowy forest',
    mode: 'generate',
    outputCount: 1,
    fileFormat: 'png',
    preview: false,
    noPreview: true,
  };

  const result = await generator.generateTextToImage(request);
  assert(result.success, result.error || result.message);
  assert(result.generatedFiles && result.generatedFiles.length === 1, 'Expected exactly one generated image');

  const [filePath] = result.generatedFiles;
  await ensureFile(filePath, 'Generate image test');
  console.log(`✅ Generated image: ${filePath}`);
  return filePath;
}

async function testEditImage(generator, sourceFile) {
  console.log('\n▶ Test 2: Edit image – enhance the previously generated fox painting');

  const request = {
    prompt: 'add gentle falling snowflakes and slightly increase contrast',
    inputImage: sourceFile,
    mode: 'edit',
    preview: false,
    noPreview: true,
  };

  const result = await generator.editImage(request);
  assert(result.success, result.error || result.message);
  assert(result.generatedFiles && result.generatedFiles.length === 1, 'Expected exactly one edited image');

  const [filePath] = result.generatedFiles;
  await ensureFile(filePath, 'Edit image test');
  console.log(`✅ Edited image: ${filePath}`);
  return filePath;
}

async function testRestoreImage(generator, sourceFile) {
  console.log('\n▶ Test 3: Restore image – gently denoise and sharpen the fox painting');

  const request = {
    prompt: 'remove noise, subtly sharpen details, preserve watercolor aesthetic',
    inputImage: sourceFile,
    mode: 'restore',
    preview: false,
    noPreview: true,
  };

  const result = await generator.editImage(request);
  assert(result.success, result.error || result.message);
  assert(result.generatedFiles && result.generatedFiles.length === 1, 'Expected exactly one restored image');

  const [filePath] = result.generatedFiles;
  await ensureFile(filePath, 'Restore image test');
  console.log(`✅ Restored image: ${filePath}`);
  return filePath;
}

async function testGenerateStory(generator) {
  console.log('\n▶ Test 4: Generate story – "seed grows into tree" (2 steps)');

  const request = {
    prompt: 'a seed sprouting into a tree',
    outputCount: 2,
    mode: 'generate',
    preview: false,
    noPreview: true,
  };

  const args = {
    type: 'process',
    style: 'consistent',
    transition: 'smooth',
  };

  const result = await generator.generateStorySequence(request, args);
  assert(result.success, result.error || result.message);
  assert(result.generatedFiles && result.generatedFiles.length === 2, 'Expected two story frames');

  for (const filePath of result.generatedFiles) {
    await ensureFile(filePath, 'Story sequence test');
    console.log(`✅ Story frame: ${filePath}`);
  }
  return result.generatedFiles;
}

async function testGeneratePattern(generator) {
  console.log('\n▶ Test 5: Generate pattern – geometric triangles seamless design');

  const prompt =
    'geometric triangles, geometric style seamless pattern, medium density, colorful colors, tileable, repeating pattern, 256x256 tile size, high quality';

  const request = {
    prompt,
    mode: 'generate',
    outputCount: 1,
    fileFormat: 'png',
    preview: false,
    noPreview: true,
  };

  const result = await generator.generateTextToImage(request);
  assert(result.success, result.error || result.message);
  assert(result.generatedFiles && result.generatedFiles.length === 1, 'Expected one pattern image');

  const [filePath] = result.generatedFiles;
  await ensureFile(filePath, 'Pattern generation test');
  console.log(`✅ Pattern image: ${filePath}`);
  return filePath;
}

async function testGenerateDiagram(generator) {
  console.log('\n▶ Test 6: Generate diagram – user login process flowchart');

  const prompt =
    'user login process, flowchart diagram, professional style, hierarchical layout, detailed level of detail, accent color scheme, detailed annotations, clean technical illustration, clear visual hierarchy';

  const request = {
    prompt,
    mode: 'generate',
    outputCount: 1,
    fileFormat: 'png',
    preview: false,
    noPreview: true,
  };

  const result = await generator.generateTextToImage(request);
  assert(result.success, result.error || result.message);
  assert(result.generatedFiles && result.generatedFiles.length === 1, 'Expected one diagram image');

  const [filePath] = result.generatedFiles;
  await ensureFile(filePath, 'Diagram generation test');
  console.log(`✅ Diagram image: ${filePath}`);
  return filePath;
}

async function testGenerateIcon(generator) {
  console.log('\n▶ Test 7: Generate icon – "coffee cup logo"');

  const iconPrompt =
    'coffee cup logo, modern style app-icon, rounded corners, clean design, high quality, professional';

  const request = {
    prompt: iconPrompt,
    mode: 'generate',
    outputCount: 1,
    fileFormat: 'png',
    preview: false,
    noPreview: true,
  };

  const result = await generator.generateTextToImage(request);
  assert(result.success, result.error || result.message);
  assert(result.generatedFiles && result.generatedFiles.length === 1, 'Expected exactly one generated icon');

  const [filePath] = result.generatedFiles;
  await ensureFile(filePath, 'Generate icon test');
  console.log(`✅ Generated icon: ${filePath}`);
  return filePath;
}

async function run() {
  const generator = new ImageGenerator(ImageGenerator.validateAuthentication());

  const foxImage = await testGenerateImage(generator);
  await testEditImage(generator, foxImage);
  await testRestoreImage(generator, foxImage);
  await testGenerateStory(generator);
  await testGeneratePattern(generator);
  await testGenerateDiagram(generator);
  await testGenerateIcon(generator);

  console.log('\n🎉 All integration tests completed successfully. Generated assets remain in nanobanana-output/.');
}

run().catch((error) => {
  console.error('❌ Integration tests failed:', error);
  process.exit(1);
});
