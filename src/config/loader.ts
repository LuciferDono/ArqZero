import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AppConfigSchema, type AppConfig } from './schema.js';

export function getArqDir(): string {
  return path.join(os.homedir(), '.arqzero');
}

export function getConfigPath(): string {
  return path.join(getArqDir(), 'config.json');
}

export function configExists(): boolean {
  return fs.existsSync(getConfigPath());
}

export function loadConfig(): AppConfig {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found at ${configPath}. Run 'arqzero' to initialize.`);
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${configPath}`);
  }

  const result = AppConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Config validation failed:\n${issues}`);
  }

  // Merge env var overrides
  if (process.env.FIREWORKS_API_KEY && !result.data.fireworksApiKey) {
    result.data.fireworksApiKey = process.env.FIREWORKS_API_KEY;
  }

  return result.data;
}

export function writeConfig(config: AppConfig): void {
  const arqDir = getArqDir();
  fs.mkdirSync(arqDir, { recursive: true });
  fs.mkdirSync(path.join(arqDir, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(arqDir, 'skills'), { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}
