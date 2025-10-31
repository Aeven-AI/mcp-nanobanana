#!/usr/bin/env node
import { chmod } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const targetPath = resolve(__dirname, '../dist/index.js');

try {
  await chmod(targetPath, 0o755);
  console.info(`Set executable permission on ${targetPath}`);
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.warn(`Skipped setting permissions: ${targetPath} not found.`);
  } else {
    console.warn(`Unable to set executable permission on ${targetPath}: ${error.message}`);
  }
}
