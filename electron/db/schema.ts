import type Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import inventorySeed from './seed/inventory.json';

const areaNames = ['Casa Club', 'Marina', 'Pueblo', 'Experiencias', 'Oficinas Administrativas'];

export function initializeSchema(db: Database.Database, _firstRun: boolean): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migraciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      ejecutada_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS areas (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE,
      descripcion TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('admin','supervisor','usuario')),
      status TEXT NOT NULL DEFAULT 'activo' CHECK(status IN ('activo','inactivo')),
      areaId TEXT REFERENCES areas(id),
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      internalId TEXT UNIQUE,
      inventoryNumber TEXT UNIQUE,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('computadora','all-in-one','laptop','monitor','impresora','tablet','ups','accesorio','otro')),
      marca TEXT,
      modelo TEXT,
      numeroSerie TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'activo' CHECK(status IN ('activo','asignado','mantenimiento','baja')),
      areaId TEXT REFERENCES areas(id),
      responsableId TEXT REFERENCES users(id),
      fechaAdquisicion TEXT,
      notas TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS movimientos (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL REFERENCES assets(id),
      usuarioId TEXT NOT NULL REFERENCES users(id),
      tipo TEXT NOT NULL CHECK(tipo IN ('asignacion','reasignacion','baja','mantenimiento','devolucion')),
      descripcion TEXT,
      fecha TEXT NOT NULL DEFAULT (datetime('now')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resguardos (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL REFERENCES assets(id),
      usuarioId TEXT NOT NULL REFERENCES users(id),
      fechaEmision TEXT NOT NULL DEFAULT (datetime('now')),
      pdfPath TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TRIGGER IF NOT EXISTS update_users_updatedAt
      AFTER UPDATE ON users BEGIN
        UPDATE users SET updatedAt = datetime('now') WHERE id = NEW.id;
      END;

    CREATE TRIGGER IF NOT EXISTS update_assets_updatedAt
      AFTER UPDATE ON assets BEGIN
        UPDATE assets SET updatedAt = datetime('now') WHERE id = NEW.id;
      END;
  `);

  seedAreas(db);
  seedAdmin(db);
  seedInventory(db);
  runMigrations(db);
}

function seedAreas(db: Database.Database): void {
  const insert = db.prepare('INSERT OR IGNORE INTO areas (id, nombre, descripcion) VALUES (?, ?, ?)');
  const transaction = db.transaction(() => {
    for (const name of areaNames) {
      insert.run(randomUUID(), name, `Area ${name} del complejo Mayakoba`);
    }
  });
  transaction();
}

function seedAdmin(db: Database.Database): void {
  const exists = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get('admin@camaf.local') as { id: string } | undefined;

  if (exists) return;

  const casaClub = db.prepare('SELECT id FROM areas WHERE nombre = ?').get('Casa Club') as
    | { id: string }
    | undefined;

  db.prepare(
    `INSERT INTO users (id, email, password, nombre, rol, status, areaId)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    'admin@camaf.local',
    bcrypt.hashSync('Admin123!', 12),
    'Administrador CAMAF',
    'admin',
    'activo',
    casaClub?.id ?? null
  );
}

type InventoryUser = {
  nombre: string;
  email: string;
  areaNombre: string | null;
  puesto: string | null;
  employeeId: string | null;
};

type InventoryAsset = {
  internalId: string | null;
  inventoryNumber: string | null;
  nombre: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  status: string;
  areaNombre: string | null;
  responsableNombre: string | null;
  fechaAdquisicion: string | null;
  notas: string | null;
};

function seedInventory(db: Database.Database): void {
  const existingAssets = db.prepare('SELECT COUNT(*) AS count FROM assets').get() as { count: number };
  if (existingAssets.count > 0) return;

  const seed = inventorySeed as {
    users: InventoryUser[];
    assets: InventoryAsset[];
  };

  const transaction = db.transaction(() => {
    const areaIds = new Map<string, string>();
    const userIds = new Map<string, string>();
    const importedUserPasswordHash = bcrypt.hashSync(randomUUID(), 10);

    for (const areaName of collectAreaNames(seed)) {
      areaIds.set(normalizeName(areaName), ensureArea(db, areaName));
    }

    for (const user of seed.users) {
      const areaId = user.areaNombre ? areaIds.get(normalizeName(user.areaNombre)) ?? ensureArea(db, user.areaNombre) : null;
      const userId = ensureImportedUser(db, user, areaId, importedUserPasswordHash);
      userIds.set(normalizeName(user.nombre), userId);
    }

    for (const asset of seed.assets) {
      const areaId = asset.areaNombre ? areaIds.get(normalizeName(asset.areaNombre)) ?? ensureArea(db, asset.areaNombre) : null;
      const responsableId = asset.responsableNombre ? userIds.get(normalizeName(asset.responsableNombre)) ?? null : null;

      db.prepare(
        `INSERT OR IGNORE INTO assets (
          id, internalId, inventoryNumber, nombre, tipo, marca, modelo, numeroSerie,
          status, areaId, responsableId, fechaAdquisicion, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        randomUUID(),
        asset.internalId,
        asset.inventoryNumber,
        asset.nombre,
        asset.tipo,
        asset.marca,
        asset.modelo,
        asset.numeroSerie,
        asset.status,
        areaId,
        responsableId,
        asset.fechaAdquisicion,
        asset.notas
      );
    }
  });

  transaction();
}

function collectAreaNames(seed: { users: InventoryUser[]; assets: InventoryAsset[] }): string[] {
  const names = new Set<string>(areaNames);
  for (const user of seed.users) {
    if (user.areaNombre) names.add(user.areaNombre);
  }
  for (const asset of seed.assets) {
    if (asset.areaNombre) names.add(asset.areaNombre);
  }
  return [...names];
}

function ensureArea(db: Database.Database, areaName: string): string {
  const existing = db.prepare('SELECT id FROM areas WHERE lower(nombre) = lower(?)').get(areaName) as
    | { id: string }
    | undefined;
  if (existing) return existing.id;

  const id = randomUUID();
  db.prepare('INSERT INTO areas (id, nombre, descripcion) VALUES (?, ?, ?)').run(
    id,
    areaName,
    `Area importada desde inventario Camaleon`
  );
  return id;
}

function runMigrations(db: Database.Database): void {
  const applied = db
    .prepare('SELECT id FROM migraciones WHERE nombre = ?')
    .get('limpieza_no_name') as { id: number } | undefined;
  if (applied) return;

  const transaction = db.transaction(() => {
    const sinAreaId = ensureArea(db, 'SIN ÁREA');
    const dirtyAreas = db
      .prepare(
        `SELECT id FROM areas
         WHERE TRIM(nombre) = ''
            OR UPPER(TRIM(nombre)) IN ('NO NAME', 'NONAME', 'NO_NAME', 'N/A')`
      )
      .all() as Array<{ id: string }>;
    const dirtyIds = dirtyAreas.map((area) => area.id).filter((id) => id !== sinAreaId);

    db.prepare('UPDATE assets SET areaId = ? WHERE areaId IS NULL').run(sinAreaId);
    db.prepare('UPDATE users SET areaId = ? WHERE areaId IS NULL').run(sinAreaId);

    for (const id of dirtyIds) {
      db.prepare('UPDATE assets SET areaId = ? WHERE areaId = ?').run(sinAreaId, id);
      db.prepare('UPDATE users SET areaId = ? WHERE areaId = ?').run(sinAreaId, id);
      db.prepare('DELETE FROM areas WHERE id = ?').run(id);
    }

    db.prepare('INSERT INTO migraciones (nombre) VALUES (?)').run('limpieza_no_name');
  });

  transaction();
}

function ensureImportedUser(
  db: Database.Database,
  user: InventoryUser,
  areaId: string | null,
  passwordHash: string
): string {
  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(user.email) as
    | { id: string }
    | undefined;
  if (existing) return existing.id;

  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, email, password, nombre, rol, status, areaId)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, user.email, passwordHash, user.nombre, 'usuario', 'inactivo', areaId);
  return id;
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
