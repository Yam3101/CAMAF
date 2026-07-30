import { spawnSync } from 'node:child_process';
import { join, delimiter } from 'node:path';

const binDir = join(process.cwd(), 'node_modules', '.bin');
const builderCli = join(process.cwd(), 'node_modules', 'electron-builder', 'cli.js');
const systemRoot = process.env.SystemRoot ?? 'C:\\Windows';
const system32 = join(systemRoot, 'System32');
const result = spawnSync(process.execPath, [builderCli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    ComSpec: process.env.ComSpec ?? join(system32, 'cmd.exe'),
    SystemRoot: systemRoot,
    PATH: `${binDir}${delimiter}${system32}${delimiter}${process.env.PATH ?? ''}`,
    npm_config_loglevel: 'error',
    NPM_CONFIG_LOGLEVEL: 'error'
  }
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
