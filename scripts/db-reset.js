import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const candidates = [
  join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'camaf', 'camaf.db'),
  join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'CAMAF', 'camaf.db'),
  join(homedir(), 'Library', 'Application Support', 'camaf', 'camaf.db'),
  join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'camaf', 'camaf.db')
];

let removed = false;
for (const dbPath of candidates) {
  if (existsSync(dbPath)) {
    rmSync(dbPath, { force: true });
    console.log(`Deleted ${dbPath}`);
    removed = true;
  }
}

if (!removed) {
  console.log('No camaf.db file was found in the usual userData paths.');
}

console.log('Run npm run dev to recreate the database with schema and seeds.');
