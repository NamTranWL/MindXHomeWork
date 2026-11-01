import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { run } from '../../src/commands/run';

export interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

const PROJECT_ROOT = resolve(__dirname, '../..');
const CLI_ENTRY = join(PROJECT_ROOT, 'src', 'cli.ts');

/** Chạy CLI trong cùng tiến trình qua run(argv, io). */
export async function runCli(args: string[], env: Record<string, string | undefined>): Promise<CliResult> {
  let stdout = '';
  let stderr = '';
  const code = await run(args, {
    env,
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  return { code, stdout, stderr };
}

/** Chạy CLI như người dùng thật: tiến trình Node riêng, nạp TS qua tsx (không gọi file .cmd). */
export function runCliProcess(args: string[], env: Record<string, string>): CliResult {
  const result = spawnSync(process.execPath, ['--import', 'tsx', CLI_ENTRY, ...args], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return { code: result.status ?? -1, stdout: result.stdout, stderr: result.stderr };
}

export const SUBPROCESS_TIMEOUT_MS = 20_000;

export async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'tickets-cli-'));
}

export async function removeDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true, maxRetries: 3 });
}

export function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function readText(file: string): string {
  return readFileSync(file, 'utf8');
}

export { existsSync };
