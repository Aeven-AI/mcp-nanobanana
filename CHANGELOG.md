# Changelog

All notable changes to this project are documented in this file.

## 1.0.12 — 2025-11-03

- Switch the logger to console-only output while honoring log levels, eliminating file-system writes that broke Codex CLI sandboxes.
- Expand installation docs with Opencode and Claude Code setup steps, plus `npx` cache troubleshooting for stale install directories.

## 1.0.11 — 2025-11-01

- Align package metadata with the 1.0.10 distribution (version bump only).

## 1.0.10 — 2025-11-01

- Silence dotenv lookups when scanning for `.env` files so `npx`/Codex installs no longer emit noisy warnings.

## 1.0.9 — 2025-11-01

- Remove the `postinstall` hook to avoid double installs during `npx` usage while keeping explicit build steps in documentation.
- Document the required `npm run install-deps` step for local development flows.

## 1.0.8 — 2025-11-01

- Add centralized MCP error handling with `[MCP Error]` logging and graceful SIGINT shutdown of transports.

## 1.0.7 — 2025-11-01

- Add a `postinstall` script so Codex CLI `npx` installs automatically build the TypeScript bundle.

## 1.0.6 — 2025-11-01

- Refactor the MCP server into a dedicated `NanoBananaServer` class (`server.ts`) for clearer separation of concerns.
- Add comprehensive unit and integration tests plus an OpenRouter manual test harness; include the `verify-npm` packaging smoke test.
- Refresh README guidance with expanded CLI setup instructions and command documentation.

## 1.0.5 — 2025-10-31

- Changelog housekeeping release (no functional changes).

## 1.0.4 — 2025-10-31

- Remove verbose tool registration logging so MCP clients see clean startup output.

## 1.0.3 — 2025-10-31

- Document single-command Codex CLI setup using `npx @aeven/nanobanana-mcp` with inline `MODEL_API_KEY`.

## 1.0.2 — 2025-10-31

- Add a CLI binary entry point so `npx @aeven/nanobanana-mcp` launches the MCP server.
- Restrict the npm publish bundle via the `files` list to drop generated sample assets.

## 1.0.1 — 2025-10-31

- Fix the `edit_file` tool to accept absolute file paths.

## 1.0.0 — 2025-10-31

- Initial release.
