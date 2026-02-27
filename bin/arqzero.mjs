#!/usr/bin/env node

// Launcher for arqzero CLI
// Re-executes with tsx loader if not already loaded
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const arqTs = join(__dirname, 'arq.ts');

// Use node --import tsx/esm to run the TypeScript entry point
// This resolves tsx from the package's own node_modules
const result = spawnSync(
  process.execPath,
  ['--import', 'tsx/esm', arqTs, ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  },
);

if (result.error) {
  console.error('Failed to start arqzero:', result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
