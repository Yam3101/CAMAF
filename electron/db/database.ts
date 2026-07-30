import { app } from 'electron';
import Database from 'better-sqlite3';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { initializeSchema } from './schema-beta';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = join(app.getPath('userData'), 'camaf.db');
  mkdirSync(dirname(dbPath), { recursive: true });
  bootstrapDatabase(dbPath);

  const firstRun = !existsSync(dbPath);
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  initializeSchema(db, firstRun);
  importBundledSeed(db);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function bootstrapDatabase(dbPath: string): void {
  const seedPath = getBundledDatabasePath();
  if (!existsSync(seedPath)) return;

  if (!existsSync(dbPath) || shouldReplaceEmptyDatabase(dbPath, seedPath)) {
    copyFileSync(seedPath, dbPath);
  }
}

function getBundledDatabasePath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'db', 'camaf.db');
  }

  return join(app.getAppPath(), 'electron', 'db', 'seed', 'camaf.db');
}

function shouldReplaceEmptyDatabase(dbPath: string, seedPath: string): boolean {
  try {
    const existing = new Database(dbPath, { readonly: true, fileMustExist: true });
    const seed = new Database(seedPath, { readonly: true, fileMustExist: true });

    try {
      return getTableCount(existing, 'assets') === 0 && getTableCount(seed, 'assets') > 0;
    } finally {
      existing.close();
      seed.close();
    }
  } catch {
    return false;
  }
}

function getTableCount(database: Database.Database, tableName: string): number {
  const table = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { name: string } | undefined;

  if (!table) return 0;

  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count: number };
  return row.count;
}

function importBundledSeed(database: Database.Database): void {
  const seedPath = getBundledDatabasePath();
  if (!existsSync(seedPath)) return;

  const localAssetCount = getTableCount(database, 'assets');
  const seed = new Database(seedPath, { readonly: true, fileMustExist: true });
  const seedAssetCount = getTableCount(seed, 'assets');
  seed.close();

  if (seedAssetCount === 0 || localAssetCount >= seedAssetCount) return;

  database.prepare('ATTACH DATABASE ? AS bundled_seed').run(seedPath);
  try {
    const transaction = database.transaction(() => {
      database
        .prepare(
          `INSERT OR IGNORE INTO areas (id, nombre, unidad, descripcion, activo, createdAt, updatedAt)
           SELECT id, nombre, unidad, descripcion, activo, createdAt, updatedAt
           FROM bundled_seed.areas`
        )
        .run();

      database
        .prepare(
          `INSERT OR IGNORE INTO assets (
             id, internalId, inventoryNumber, nombre, tipo, marca, modelo, numeroSerie,
             status, unidad, areaId, asignadoA, fechaAdquisicion, notas, createdAt, updatedAt
           )
           SELECT id, internalId, inventoryNumber, nombre, tipo, marca, modelo, numeroSerie,
             status, unidad, areaId, asignadoA, fechaAdquisicion, notas, createdAt, updatedAt
           FROM bundled_seed.assets`
        )
        .run();

      database
        .prepare(
          `INSERT OR IGNORE INTO movimientos (id, assetId, asignadoA, tipo, descripcion, fecha, createdAt)
           SELECT id, assetId, asignadoA, tipo, descripcion, fecha, createdAt
           FROM bundled_seed.movimientos`
        )
        .run();

      database
        .prepare(
          `INSERT OR IGNORE INTO resguardos (id, assetId, asignadoA, fechaEmision, pdfPath, createdAt)
           SELECT id, assetId, asignadoA, fechaEmision, pdfPath, createdAt
           FROM bundled_seed.resguardos`
        )
        .run();

      database
        .prepare(
          `INSERT OR IGNORE INTO migraciones (nombre, ejecutada_en)
           SELECT nombre, ejecutada_en
           FROM bundled_seed.migraciones`
        )
        .run();

      database
        .prepare("INSERT OR IGNORE INTO migraciones (nombre) VALUES ('bundled_seed_import')")
        .run();
    });
    transaction();
  } finally {
    database.prepare('DETACH DATABASE bundled_seed').run();
  }
}
