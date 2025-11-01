#!/usr/bin/env node

/**
 * Smoke test that the published npm package boots correctly.
 *
 * 1. npm pack (builds the tarball in the project root)
 * 2. Install the tarball in a temporary directory
 * 3. Launch `npx nanobanana-mcp` and confirm it starts
 *
 * The script stops the server immediately after it reports the stdio startup banner.
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function run(command, options = {}) {
  execSync(command, {
    stdio: 'inherit',
    ...options,
  });
}

function runSilent(command, options = {}) {
  return execSync(command, {
    stdio: 'pipe',
    ...options,
  })
    .toString()
    .trim();
}

async function verify() {
  const tarballName = runSilent('npm pack --silent', { cwd: projectRoot });
  const tarballPath = path.join(projectRoot, tarballName);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nanobanana-npm-'));

  const cleanup = () => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(tarballPath, { force: true });
  };

  try {
    run('npm init -y --silent', { cwd: tempDir });
    run(`npm install --silent ${tarballPath}`, { cwd: tempDir });

    await new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        MODEL_API_KEY: process.env.MODEL_API_KEY || 'npm-smoke-key',
      };

      const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const child = spawn(npxCommand, ['--yes', 'nanobanana-mcp'], {
        cwd: tempDir,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';

      const finalize = (error) => {
        child.kill();
        child.removeAllListeners();
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        if (stderr.includes('Nano Banana MCP server running on stdio')) {
          console.log('✓ npm binary produced expected startup output');
          finalize();
        }
      });

      child.on('error', (error) => {
        finalize(error);
      });

      child.on('exit', (code, signal) => {
        if (
          stderr.includes('Nano Banana MCP server running on stdio') ||
          signal === 'SIGTERM'
        ) {
          finalize();
        } else {
          finalize(
            new Error(
              `nanobanana-mcp binary exited unexpectedly (code=${code}, signal=${signal})`,
            ),
          );
        }
      });
    });
  } finally {
    cleanup();
  }
}

verify().catch((error) => {
  console.error('npm verification failed:', error);
  process.exit(1);
});
