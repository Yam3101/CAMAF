import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

const units = ['Camaleón', 'Experiencias'] as const;
type Unit = (typeof units)[number];

export function initializeSchema(db: Database.Database, _firstRun: boolean): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migraciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      ejecutada_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  createCurrentTables(db);
  runBetaMigration(db);
  createCurrentTables(db);
  runCleanupMigration(db);
  cleanDuplicates(db);
}

function createCurrentTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS areas (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      unidad TEXT NOT NULL DEFAULT 'Camaleón' CHECK(unidad IN ('Camaleón','Experiencias')),
      descripcion TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(nombre, unidad)
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      internalId TEXT,
      inventoryNumber TEXT,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('computadora','all-in-one','laptop','monitor','impresora','tablet','ups','accesorio','otro')),
      marca TEXT,
      modelo TEXT,
      numeroSerie TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'activo' CHECK(status IN ('activo','asignado','mantenimiento','baja')),
      unidad TEXT NOT NULL DEFAULT 'Camaleón' CHECK(unidad IN ('Camaleón','Experiencias')),
      areaId TEXT REFERENCES areas(id),
      asignadoA TEXT,
      fechaAdquisicion TEXT,
      notas TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS movimientos (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL REFERENCES assets(id),
      asignadoA TEXT,
      tipo TEXT NOT NULL CHECK(tipo IN ('asignacion','reasignacion','baja','mantenimiento','devolucion')),
      descripcion TEXT,
      fecha TEXT NOT NULL DEFAULT (datetime('now')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resguardos (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL REFERENCES assets(id),
      asignadoA TEXT,
      fechaEmision TEXT NOT NULL DEFAULT (datetime('now')),
      pdfPath TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TRIGGER IF NOT EXISTS update_areas_updatedAt
      AFTER UPDATE ON areas BEGIN
        UPDATE areas SET updatedAt = datetime('now') WHERE id = NEW.id;
      END;

    CREATE TRIGGER IF NOT EXISTS update_assets_updatedAt
      AFTER UPDATE ON assets BEGIN
        UPDATE assets SET updatedAt = datetime('now') WHERE id = NEW.id;
      END;
  `);
}

function runBetaMigration(db: Database.Database): void {
  if (migrationApplied(db, 'beta_unidad_asignado_texto')) return;

  const needsMigration =
    tableExists(db, 'users') ||
    columnExists(db, 'assets', 'responsableId') ||
    !columnExists(db, 'assets', 'asignadoA') ||
    !columnExists(db, 'assets', 'unidad') ||
    !columnExists(db, 'areas', 'unidad');

  if (!needsMigration) {
    markMigration(db, 'beta_unidad_asignado_texto');
    return;
  }

  db.pragma('foreign_keys = OFF');
  const tx = db.transaction(() => {
    db.exec(`
      DROP TRIGGER IF EXISTS update_users_updatedAt;
      DROP TRIGGER IF EXISTS update_areas_updatedAt;
      DROP TRIGGER IF EXISTS update_assets_updatedAt;
      DROP TABLE IF EXISTS areas_beta;
      DROP TABLE IF EXISTS assets_beta;
      DROP TABLE IF EXISTS movimientos_beta;
      DROP TABLE IF EXISTS resguardos_beta;

      CREATE TABLE areas_beta (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        unidad TEXT NOT NULL DEFAULT 'Camaleón' CHECK(unidad IN ('Camaleón','Experiencias')),
        descripcion TEXT,
        activo INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(nombre, unidad)
      );

      INSERT OR IGNORE INTO areas_beta (id, nombre, unidad, descripcion, activo, createdAt, updatedAt)
      SELECT id, nombre, 'Camaleón', descripcion, activo, createdAt, updatedAt
      FROM areas;

      CREATE TABLE assets_beta (
        id TEXT PRIMARY KEY,
        internalId TEXT,
        inventoryNumber TEXT,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('computadora','all-in-one','laptop','monitor','impresora','tablet','ups','accesorio','otro')),
        marca TEXT,
        modelo TEXT,
        numeroSerie TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'activo' CHECK(status IN ('activo','asignado','mantenimiento','baja')),
        unidad TEXT NOT NULL DEFAULT 'Camaleón' CHECK(unidad IN ('Camaleón','Experiencias')),
        areaId TEXT REFERENCES areas(id),
        asignadoA TEXT,
        fechaAdquisicion TEXT,
        notas TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    copyAssets(db);

    db.exec(`
      CREATE TABLE movimientos_beta (
        id TEXT PRIMARY KEY,
        assetId TEXT NOT NULL REFERENCES assets(id),
        asignadoA TEXT,
        tipo TEXT NOT NULL CHECK(tipo IN ('asignacion','reasignacion','baja','mantenimiento','devolucion')),
        descripcion TEXT,
        fecha TEXT NOT NULL DEFAULT (datetime('now')),
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    copyMovimientos(db);

    db.exec(`
      CREATE TABLE resguardos_beta (
        id TEXT PRIMARY KEY,
        assetId TEXT NOT NULL REFERENCES assets(id),
        asignadoA TEXT,
        fechaEmision TEXT NOT NULL DEFAULT (datetime('now')),
        pdfPath TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    copyResguardos(db);

    db.exec(`
      DROP TABLE IF EXISTS resguardos;
      DROP TABLE IF EXISTS movimientos;
      DROP TABLE IF EXISTS assets;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS areas;

      ALTER TABLE areas_beta RENAME TO areas;
      ALTER TABLE assets_beta RENAME TO assets;
      ALTER TABLE movimientos_beta RENAME TO movimientos;
      ALTER TABLE resguardos_beta RENAME TO resguardos;
    `);

    markMigration(db, 'beta_unidad_asignado_texto');
  });
  tx();
  db.pragma('foreign_keys = ON');
}

function copyAssets(db: Database.Database): void {
  const hasUsers = tableExists(db, 'users');
  const hasAsignadoA = columnExists(db, 'assets', 'asignadoA');
  const hasUnidad = columnExists(db, 'assets', 'unidad');
  const hasResponsableId = columnExists(db, 'assets', 'responsableId');
  const assignedExpression = buildAssignedExpression('assets', hasAsignadoA, hasUsers && hasResponsableId);
  const unidadExpression = hasUnidad ? "COALESCE(assets.unidad, 'Camaleón')" : "'Camaleón'";
  const joinUsers = hasUsers && hasResponsableId ? 'LEFT JOIN users ON users.id = assets.responsableId' : '';

  db.prepare(
    `INSERT OR IGNORE INTO assets_beta (
      id, internalId, inventoryNumber, nombre, tipo, marca, modelo, numeroSerie,
      status, unidad, areaId, asignadoA, fechaAdquisicion, notas, createdAt, updatedAt
    )
    SELECT assets.id, assets.internalId, assets.inventoryNumber, assets.nombre, assets.tipo,
           assets.marca, assets.modelo, assets.numeroSerie, assets.status,
           ${unidadExpression}, assets.areaId, ${assignedExpression},
           assets.fechaAdquisicion, assets.notas, assets.createdAt, assets.updatedAt
    FROM assets
    ${joinUsers}`
  ).run();
}

function copyMovimientos(db: Database.Database): void {
  if (!tableExists(db, 'movimientos')) return;
  const hasUsers = tableExists(db, 'users');
  const hasUsuarioId = columnExists(db, 'movimientos', 'usuarioId');
  const hasAsignadoA = columnExists(db, 'movimientos', 'asignadoA');
  const assignedExpression = buildAssignedExpression('movimientos', hasAsignadoA, hasUsers && hasUsuarioId);
  const joinUsers = hasUsers && hasUsuarioId ? 'LEFT JOIN users ON users.id = movimientos.usuarioId' : '';

  db.prepare(
    `INSERT OR IGNORE INTO movimientos_beta (id, assetId, asignadoA, tipo, descripcion, fecha, createdAt)
     SELECT movimientos.id, movimientos.assetId, ${assignedExpression},
            movimientos.tipo, movimientos.descripcion, movimientos.fecha, movimientos.createdAt
     FROM movimientos
     ${joinUsers}`
  ).run();
}

function copyResguardos(db: Database.Database): void {
  if (!tableExists(db, 'resguardos')) return;
  const hasUsers = tableExists(db, 'users');
  const hasUsuarioId = columnExists(db, 'resguardos', 'usuarioId');
  const hasAsignadoA = columnExists(db, 'resguardos', 'asignadoA');
  const assignedExpression = buildAssignedExpression('resguardos', hasAsignadoA, hasUsers && hasUsuarioId);
  const joinUsers = hasUsers && hasUsuarioId ? 'LEFT JOIN users ON users.id = resguardos.usuarioId' : '';

  db.prepare(
    `INSERT OR IGNORE INTO resguardos_beta (id, assetId, asignadoA, fechaEmision, pdfPath, createdAt)
     SELECT resguardos.id, resguardos.assetId, ${assignedExpression},
            resguardos.fechaEmision, resguardos.pdfPath, resguardos.createdAt
     FROM resguardos
     ${joinUsers}`
  ).run();
}

export function ensureArea(db: Database.Database, areaName: string, unidad: string): string {
  const cleanName = normalizeAreaName(areaName);
  const cleanUnit = normalizeUnit(unidad);
  const existing = db
    .prepare('SELECT id FROM areas WHERE lower(nombre) = lower(?) AND unidad = ?')
    .get(cleanName, cleanUnit) as { id: string } | undefined;
  if (existing) return existing.id;

  const id = randomUUID();
  db.prepare('INSERT INTO areas (id, nombre, unidad, descripcion) VALUES (?, ?, ?, ?)').run(
    id,
    cleanName,
    cleanUnit,
    `Área importada desde inventario ${cleanUnit}`
  );
  return id;
}

function runCleanupMigration(db: Database.Database): void {
  if (migrationApplied(db, 'limpieza_no_name_beta')) return;

  const transaction = db.transaction(() => {
    for (const unit of units) {
      const sinAreaId = ensureArea(db, 'SIN ÁREA', unit);
      const dirtyAreas = db
        .prepare(
          `SELECT id FROM areas
           WHERE unidad = ?
             AND (TRIM(nombre) = ''
              OR UPPER(TRIM(nombre)) IN ('NO NAME', 'NONAME', 'NO_NAME', 'N/A'))`
        )
        .all(unit) as Array<{ id: string }>;
      const dirtyIds = dirtyAreas.map((area) => area.id).filter((id) => id !== sinAreaId);

      db.prepare('UPDATE assets SET areaId = ? WHERE unidad = ? AND areaId IS NULL').run(sinAreaId, unit);

      for (const id of dirtyIds) {
        db.prepare('UPDATE assets SET areaId = ? WHERE areaId = ?').run(sinAreaId, id);
        db.prepare('DELETE FROM areas WHERE id = ?').run(id);
      }
    }

    markMigration(db, 'limpieza_no_name_beta');
  });

  transaction();
}

function cleanDuplicates(db: Database.Database): void {
  if (migrationApplied(db, 'limpieza_duplicados_bug_arranque')) return;

  const transaction = db.transaction(() => {
    db.exec(`
      DELETE FROM assets
      WHERE rowid NOT IN (
        SELECT MIN(rowid)
        FROM assets
        WHERE numeroSerie IS NOT NULL
          AND TRIM(numeroSerie) != ''
        GROUP BY numeroSerie
      )
      AND numeroSerie IS NOT NULL
      AND TRIM(numeroSerie) != '';

      DELETE FROM assets
      WHERE rowid NOT IN (
        SELECT MIN(rowid)
        FROM assets
        WHERE numeroSerie IS NULL OR TRIM(numeroSerie) = ''
        GROUP BY nombre, areaId, unidad
      )
      AND (numeroSerie IS NULL OR TRIM(numeroSerie) = '');
    `);

    markMigration(db, 'limpieza_duplicados_bug_arranque');
  });

  transaction();
}

function migrationApplied(db: Database.Database, name: string): boolean {
  const row = db.prepare('SELECT id FROM migraciones WHERE nombre = ?').get(name) as { id: number } | undefined;
  return Boolean(row);
}

function markMigration(db: Database.Database, name: string): void {
  db.prepare('INSERT OR IGNORE INTO migraciones (nombre) VALUES (?)').run(name);
}

function tableExists(db: Database.Database, table: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as { name: string } | undefined;
  return Boolean(row);
}

function columnExists(db: Database.Database, table: string, column: string): boolean {
  if (!tableExists(db, table)) return false;
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function buildAssignedExpression(table: string, hasAsignadoA: boolean, hasUserJoin: boolean): string {
  if (hasAsignadoA && hasUserJoin) return `COALESCE(${table}.asignadoA, users.nombre)`;
  if (hasAsignadoA) return `${table}.asignadoA`;
  if (hasUserJoin) return 'users.nombre';
  return 'NULL';
}

function normalizeAreaName(value: string): string {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text || ['NO NAME', 'NONAME', 'NO_NAME', 'N/A'].includes(text.toUpperCase())) {
    return 'SIN ÁREA';
  }
  return text;
}

function normalizeUnit(value: string): Unit {
  return value === 'Experiencias' ? 'Experiencias' : 'Camaleón';
}
