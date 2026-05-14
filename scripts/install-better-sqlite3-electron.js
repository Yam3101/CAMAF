import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import electronPackage from '../node_modules/electron/package.json' with { type: 'json' };

const moduleDir = join(process.cwd(), 'node_modules', 'better-sqlite3');
const prebuildInstall = join(process.cwd(), 'node_modules', 'prebuild-install', 'bin.js');

if (!existsSync(moduleDir) || !existsSync(prebuildInstall)) {
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  [prebuildInstall, '-r', 'electron', '-t', electronPackage.version],
  {
    cwd: moduleDir,
    stdio: 'inherit'
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
