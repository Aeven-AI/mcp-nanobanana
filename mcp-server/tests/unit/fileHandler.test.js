import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FileHandler } from '../../dist/fileHandler.js';

const ORIGINAL_CWD = process.cwd();

test('FileHandler ensures output directory and resolves files', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nanobanana-fh-'));
  const cleanup = () => {
    process.chdir(ORIGINAL_CWD);
    fs.rmSync(tempDir, { recursive: true, force: true });
  };

  process.chdir(tempDir);
  t.after(cleanup);

  const outputPath = FileHandler.ensureOutputDirectory();

  assert.equal(
    fs.realpathSync(outputPath),
    fs.realpathSync(path.join(tempDir, 'nanobanana-output')),
    'Output path should be under cwd',
  );
  assert.ok(fs.existsSync(outputPath), 'Output directory should exist');

  const sampleFile = path.join(outputPath, 'sample.png');
  fs.writeFileSync(sampleFile, 'sample image bytes');

  const found = FileHandler.findInputFile(sampleFile);
  assert.equal(found.found, true, 'Expected to find sample file');
  assert.equal(found.filePath, sampleFile);

  const missing = FileHandler.findInputFile('missing.png');
  assert.equal(missing.found, false, 'Missing file should not be found');
  assert.ok(
    Array.isArray(missing.searchedPaths),
    'Missing file should list searched paths',
  );
});

test('FileHandler.generateFilename sanitizes prompt and avoids collisions', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nanobanana-fn-'));
  const cleanup = () => {
    process.chdir(ORIGINAL_CWD);
    fs.rmSync(tempDir, { recursive: true, force: true });
  };

  process.chdir(tempDir);
  t.after(cleanup);

  const outputPath = FileHandler.ensureOutputDirectory();
  fs.writeFileSync(path.join(outputPath, 'cinematic_scene.png'), 'existing');

  const filename = FileHandler.generateFilename(
    'Cinematic Scene!',
    'png',
    0,
  );
  assert.match(filename, /^cinematic_scene(_\d+)?\.png$/);

  const unique =
    filename === 'cinematic_scene.png'
      ? FileHandler.generateFilename('Cinematic Scene!', 'png', 0)
      : filename;

  assert.notEqual(
    unique,
    'cinematic_scene.png',
    'Second filename should include collision suffix',
  );
});
