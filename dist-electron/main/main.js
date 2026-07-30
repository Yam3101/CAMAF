import { app, ipcMain, shell, BrowserWindow } from "electron";
import { join, dirname } from "node:path";
import Database from "better-sqlite3";
import { mkdirSync, existsSync, copyFileSync, writeFileSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PDFDocument, PageSizes, StandardFonts, rgb } from "pdf-lib";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const units = ["Camaleón", "Experiencias"];
function initializeSchema(db2, _firstRun) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS migraciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      ejecutada_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  createCurrentTables(db2);
  runBetaMigration(db2);
  createCurrentTables(db2);
  runCleanupMigration(db2);
  cleanDuplicates(db2);
}
function createCurrentTables(db2) {
  db2.exec(`
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
function runBetaMigration(db2) {
  if (migrationApplied(db2, "beta_unidad_asignado_texto")) return;
  const needsMigration = tableExists(db2, "users") || columnExists(db2, "assets", "responsableId") || !columnExists(db2, "assets", "asignadoA") || !columnExists(db2, "assets", "unidad") || !columnExists(db2, "areas", "unidad");
  if (!needsMigration) {
    markMigration(db2, "beta_unidad_asignado_texto");
    return;
  }
  db2.pragma("foreign_keys = OFF");
  const tx = db2.transaction(() => {
    db2.exec(`
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
    copyAssets(db2);
    db2.exec(`
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
    copyMovimientos(db2);
    db2.exec(`
      CREATE TABLE resguardos_beta (
        id TEXT PRIMARY KEY,
        assetId TEXT NOT NULL REFERENCES assets(id),
        asignadoA TEXT,
        fechaEmision TEXT NOT NULL DEFAULT (datetime('now')),
        pdfPath TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    copyResguardos(db2);
    db2.exec(`
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
    markMigration(db2, "beta_unidad_asignado_texto");
  });
  tx();
  db2.pragma("foreign_keys = ON");
}
function copyAssets(db2) {
  const hasUsers = tableExists(db2, "users");
  const hasAsignadoA = columnExists(db2, "assets", "asignadoA");
  const hasUnidad = columnExists(db2, "assets", "unidad");
  const hasResponsableId = columnExists(db2, "assets", "responsableId");
  const assignedExpression = buildAssignedExpression("assets", hasAsignadoA, hasUsers && hasResponsableId);
  const unidadExpression = hasUnidad ? "COALESCE(assets.unidad, 'Camaleón')" : "'Camaleón'";
  const joinUsers = hasUsers && hasResponsableId ? "LEFT JOIN users ON users.id = assets.responsableId" : "";
  db2.prepare(
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
function copyMovimientos(db2) {
  if (!tableExists(db2, "movimientos")) return;
  const hasUsers = tableExists(db2, "users");
  const hasUsuarioId = columnExists(db2, "movimientos", "usuarioId");
  const hasAsignadoA = columnExists(db2, "movimientos", "asignadoA");
  const assignedExpression = buildAssignedExpression("movimientos", hasAsignadoA, hasUsers && hasUsuarioId);
  const joinUsers = hasUsers && hasUsuarioId ? "LEFT JOIN users ON users.id = movimientos.usuarioId" : "";
  db2.prepare(
    `INSERT OR IGNORE INTO movimientos_beta (id, assetId, asignadoA, tipo, descripcion, fecha, createdAt)
     SELECT movimientos.id, movimientos.assetId, ${assignedExpression},
            movimientos.tipo, movimientos.descripcion, movimientos.fecha, movimientos.createdAt
     FROM movimientos
     ${joinUsers}`
  ).run();
}
function copyResguardos(db2) {
  if (!tableExists(db2, "resguardos")) return;
  const hasUsers = tableExists(db2, "users");
  const hasUsuarioId = columnExists(db2, "resguardos", "usuarioId");
  const hasAsignadoA = columnExists(db2, "resguardos", "asignadoA");
  const assignedExpression = buildAssignedExpression("resguardos", hasAsignadoA, hasUsers && hasUsuarioId);
  const joinUsers = hasUsers && hasUsuarioId ? "LEFT JOIN users ON users.id = resguardos.usuarioId" : "";
  db2.prepare(
    `INSERT OR IGNORE INTO resguardos_beta (id, assetId, asignadoA, fechaEmision, pdfPath, createdAt)
     SELECT resguardos.id, resguardos.assetId, ${assignedExpression},
            resguardos.fechaEmision, resguardos.pdfPath, resguardos.createdAt
     FROM resguardos
     ${joinUsers}`
  ).run();
}
function ensureArea(db2, areaName, unidad) {
  const cleanName = normalizeAreaName(areaName);
  const cleanUnit = normalizeUnit(unidad);
  const existing = db2.prepare("SELECT id FROM areas WHERE lower(nombre) = lower(?) AND unidad = ?").get(cleanName, cleanUnit);
  if (existing) return existing.id;
  const id = randomUUID();
  db2.prepare("INSERT INTO areas (id, nombre, unidad, descripcion) VALUES (?, ?, ?, ?)").run(
    id,
    cleanName,
    cleanUnit,
    `Área importada desde inventario ${cleanUnit}`
  );
  return id;
}
function runCleanupMigration(db2) {
  if (migrationApplied(db2, "limpieza_no_name_beta")) return;
  const transaction = db2.transaction(() => {
    for (const unit of units) {
      const sinAreaId = ensureArea(db2, "SIN ÁREA", unit);
      const dirtyAreas = db2.prepare(
        `SELECT id FROM areas
           WHERE unidad = ?
             AND (TRIM(nombre) = ''
              OR UPPER(TRIM(nombre)) IN ('NO NAME', 'NONAME', 'NO_NAME', 'N/A'))`
      ).all(unit);
      const dirtyIds = dirtyAreas.map((area) => area.id).filter((id) => id !== sinAreaId);
      db2.prepare("UPDATE assets SET areaId = ? WHERE unidad = ? AND areaId IS NULL").run(sinAreaId, unit);
      for (const id of dirtyIds) {
        db2.prepare("UPDATE assets SET areaId = ? WHERE areaId = ?").run(sinAreaId, id);
        db2.prepare("DELETE FROM areas WHERE id = ?").run(id);
      }
    }
    markMigration(db2, "limpieza_no_name_beta");
  });
  transaction();
}
function cleanDuplicates(db2) {
  if (migrationApplied(db2, "limpieza_duplicados_bug_arranque")) return;
  const transaction = db2.transaction(() => {
    db2.exec(`
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
    markMigration(db2, "limpieza_duplicados_bug_arranque");
  });
  transaction();
}
function migrationApplied(db2, name) {
  const row = db2.prepare("SELECT id FROM migraciones WHERE nombre = ?").get(name);
  return Boolean(row);
}
function markMigration(db2, name) {
  db2.prepare("INSERT OR IGNORE INTO migraciones (nombre) VALUES (?)").run(name);
}
function tableExists(db2, table) {
  const row = db2.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  return Boolean(row);
}
function columnExists(db2, table, column) {
  if (!tableExists(db2, table)) return false;
  const rows = db2.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((row) => row.name === column);
}
function buildAssignedExpression(table, hasAsignadoA, hasUserJoin) {
  if (hasAsignadoA && hasUserJoin) return `COALESCE(${table}.asignadoA, users.nombre)`;
  if (hasAsignadoA) return `${table}.asignadoA`;
  if (hasUserJoin) return "users.nombre";
  return "NULL";
}
function normalizeAreaName(value) {
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || ["NO NAME", "NONAME", "NO_NAME", "N/A"].includes(text.toUpperCase())) {
    return "SIN ÁREA";
  }
  return text;
}
function normalizeUnit(value) {
  return value === "Experiencias" ? "Experiencias" : "Camaleón";
}
let db = null;
function getDatabase() {
  if (db) return db;
  const dbPath = join(app.getPath("userData"), "camaf.db");
  mkdirSync(dirname(dbPath), { recursive: true });
  bootstrapDatabase(dbPath);
  !existsSync(dbPath);
  db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  initializeSchema(db);
  importBundledSeed(db);
  return db;
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
function bootstrapDatabase(dbPath) {
  const seedPath = getBundledDatabasePath();
  if (!existsSync(seedPath)) return;
  if (!existsSync(dbPath) || shouldReplaceEmptyDatabase(dbPath, seedPath)) {
    copyFileSync(seedPath, dbPath);
  }
}
function getBundledDatabasePath() {
  if (app.isPackaged) {
    return join(process.resourcesPath, "db", "camaf.db");
  }
  return join(app.getAppPath(), "electron", "db", "seed", "camaf.db");
}
function shouldReplaceEmptyDatabase(dbPath, seedPath) {
  try {
    const existing = new Database(dbPath, { readonly: true, fileMustExist: true });
    const seed = new Database(seedPath, { readonly: true, fileMustExist: true });
    try {
      return getTableCount(existing, "assets") === 0 && getTableCount(seed, "assets") > 0;
    } finally {
      existing.close();
      seed.close();
    }
  } catch {
    return false;
  }
}
function getTableCount(database, tableName) {
  const table = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
  if (!table) return 0;
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get();
  return row.count;
}
function importBundledSeed(database) {
  const seedPath = getBundledDatabasePath();
  if (!existsSync(seedPath)) return;
  const localAssetCount = getTableCount(database, "assets");
  const seed = new Database(seedPath, { readonly: true, fileMustExist: true });
  const seedAssetCount = getTableCount(seed, "assets");
  seed.close();
  if (seedAssetCount === 0 || localAssetCount >= seedAssetCount) return;
  database.prepare("ATTACH DATABASE ? AS bundled_seed").run(seedPath);
  try {
    const transaction = database.transaction(() => {
      database.prepare(
        `INSERT OR IGNORE INTO areas (id, nombre, unidad, descripcion, activo, createdAt, updatedAt)
           SELECT id, nombre, unidad, descripcion, activo, createdAt, updatedAt
           FROM bundled_seed.areas`
      ).run();
      database.prepare(
        `INSERT OR IGNORE INTO assets (
             id, internalId, inventoryNumber, nombre, tipo, marca, modelo, numeroSerie,
             status, unidad, areaId, asignadoA, fechaAdquisicion, notas, createdAt, updatedAt
           )
           SELECT id, internalId, inventoryNumber, nombre, tipo, marca, modelo, numeroSerie,
             status, unidad, areaId, asignadoA, fechaAdquisicion, notas, createdAt, updatedAt
           FROM bundled_seed.assets`
      ).run();
      database.prepare(
        `INSERT OR IGNORE INTO movimientos (id, assetId, asignadoA, tipo, descripcion, fecha, createdAt)
           SELECT id, assetId, asignadoA, tipo, descripcion, fecha, createdAt
           FROM bundled_seed.movimientos`
      ).run();
      database.prepare(
        `INSERT OR IGNORE INTO resguardos (id, assetId, asignadoA, fechaEmision, pdfPath, createdAt)
           SELECT id, assetId, asignadoA, fechaEmision, pdfPath, createdAt
           FROM bundled_seed.resguardos`
      ).run();
      database.prepare(
        `INSERT OR IGNORE INTO migraciones (nombre, ejecutada_en)
           SELECT nombre, ejecutada_en
           FROM bundled_seed.migraciones`
      ).run();
      database.prepare("INSERT OR IGNORE INTO migraciones (nombre) VALUES ('bundled_seed_import')").run();
    });
    transaction();
  } finally {
    database.prepare("DETACH DATABASE bundled_seed").run();
  }
}
function safeHandle(channel, handler) {
  ipcMain.handle(channel, async (event, input) => {
    try {
      return await handler(event, input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error inesperado";
      return { error: message };
    }
  });
}
function blankToNull(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
function registerAreaHandlers() {
  safeHandle("areas:list", (_event, input) => {
    const params = [];
    const where = [
      `TRIM(nombre) <> ''`,
      `UPPER(TRIM(nombre)) NOT IN ('NO NAME', 'NONAME', 'NO_NAME', 'N/A')`
    ];
    if (input?.unidad) {
      where.push("unidad = ?");
      params.push(input.unidad);
    }
    return getDatabase().prepare(
      `SELECT id, nombre, unidad, descripcion, activo, createdAt, updatedAt
         FROM areas
         WHERE ${where.join(" AND ")}
         ORDER BY unidad, nombre`
    ).all(...params);
  });
  safeHandle("areas:ensure", (_event, input) => {
    const nombre = cleanAreaName(input.nombre);
    const unidad = input.unidad === "Experiencias" ? "Experiencias" : "Camaleón";
    const db2 = getDatabase();
    const existing = db2.prepare(
      `SELECT id, nombre, unidad, descripcion, activo, createdAt, updatedAt
         FROM areas
         WHERE UPPER(TRIM(nombre)) = UPPER(TRIM(?))
           AND unidad = ?`
    ).get(nombre, unidad);
    if (existing) return existing;
    const id = randomUUID();
    db2.prepare("INSERT INTO areas (id, nombre, unidad, descripcion) VALUES (?, ?, ?, ?)").run(
      id,
      nombre,
      unidad,
      "Área creada desde autocompletado"
    );
    return db2.prepare("SELECT id, nombre, unidad, descripcion, activo, createdAt, updatedAt FROM areas WHERE id = ?").get(id);
  });
  safeHandle("db:getAreasUnicas", (_event, input) => {
    const unidad = input?.unidad === "Experiencias" ? "Experiencias" : "Camaleón";
    const rows = getDatabase().prepare(
      `SELECT DISTINCT TRIM(nombre) AS area
         FROM areas
         WHERE unidad = ?
           AND nombre IS NOT NULL
           AND TRIM(nombre) <> ''
           AND UPPER(TRIM(nombre)) NOT IN ('NO NAME', 'NONAME', 'NO_NAME', 'N/A')
         ORDER BY area ASC`
    ).all(unidad);
    return rows.map((row) => row.area);
  });
}
function cleanAreaName(value) {
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || ["NO NAME", "NONAME", "NO_NAME", "N/A"].includes(text.toUpperCase())) {
    return "SIN ÁREA";
  }
  return text;
}
const assetSelect = `
  SELECT assets.id, assets.internalId, assets.inventoryNumber, assets.nombre, assets.tipo,
         assets.marca, assets.modelo, assets.numeroSerie, assets.status, assets.unidad,
         assets.areaId, areas.nombre AS areaNombre, assets.asignadoA,
         assets.fechaAdquisicion, assets.notas, assets.createdAt, assets.updatedAt
  FROM assets
  LEFT JOIN areas ON areas.id = assets.areaId
`;
function registerAssetHandlers() {
  safeHandle("assets:list", (_event, input) => {
    const filters = input?.filters ?? {};
    const where = [];
    const params = [];
    if (filters.search?.trim()) {
      where.push(
        `(lower(assets.nombre) LIKE ? OR lower(assets.numeroSerie) LIKE ? OR lower(assets.internalId) LIKE ? OR lower(assets.inventoryNumber) LIKE ? OR lower(assets.asignadoA) LIKE ?)`
      );
      const search = `%${filters.search.trim().toLowerCase()}%`;
      params.push(search, search, search, search, search);
    }
    if (filters.tipo) {
      where.push("assets.tipo = ?");
      params.push(filters.tipo);
    }
    if (filters.areaId) {
      where.push("assets.areaId = ?");
      params.push(filters.areaId);
    }
    if (filters.status) {
      where.push("assets.status = ?");
      params.push(filters.status);
    }
    if (filters.unidad) {
      where.push("assets.unidad = ?");
      params.push(filters.unidad);
    }
    const sql = `${assetSelect} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY assets.createdAt DESC`;
    return getDatabase().prepare(sql).all(...params);
  });
  safeHandle("assets:get", (_event, input) => {
    return getDatabase().prepare(`${assetSelect} WHERE assets.id = ?`).get(input.id) ?? null;
  });
  safeHandle("assets:create", (_event, input) => {
    if (!input.nombre?.trim()) throw new Error("El nombre del activo es obligatorio");
    const id = randomUUID();
    getDatabase().prepare(
      `INSERT INTO assets (
          id, internalId, inventoryNumber, nombre, tipo, marca, modelo, numeroSerie,
          status, unidad, areaId, asignadoA, fechaAdquisicion, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      blankToNull(input.internalId),
      blankToNull(input.inventoryNumber),
      input.nombre.trim(),
      input.tipo,
      blankToNull(input.marca),
      blankToNull(input.modelo),
      blankToNull(input.numeroSerie),
      input.status ?? "activo",
      input.unidad ?? "Camaleón",
      blankToNull(input.areaId),
      blankToNull(input.asignadoA),
      blankToNull(input.fechaAdquisicion),
      blankToNull(input.notas)
    );
    return getAssetOrThrow(id);
  });
  safeHandle("assets:update", (_event, input) => {
    const fields = [];
    const params = [];
    const add = (field, column = field) => {
      if (Object.prototype.hasOwnProperty.call(input.data, field)) {
        fields.push(`${String(column)} = ?`);
        const value = input.data[field];
        params.push(typeof value === "string" ? blankToNull(value) : value ?? null);
      }
    };
    add("internalId");
    add("inventoryNumber");
    if (Object.prototype.hasOwnProperty.call(input.data, "nombre")) {
      if (!input.data.nombre?.trim()) throw new Error("El nombre del activo es obligatorio");
      fields.push("nombre = ?");
      params.push(input.data.nombre.trim());
    }
    add("tipo");
    add("marca");
    add("modelo");
    add("numeroSerie");
    add("status");
    add("unidad");
    add("areaId");
    add("asignadoA");
    add("fechaAdquisicion");
    add("notas");
    if (!fields.length) return getAssetOrThrow(input.id);
    params.push(input.id);
    getDatabase().prepare(`UPDATE assets SET ${fields.join(", ")} WHERE id = ?`).run(...params);
    return getAssetOrThrow(input.id);
  });
  safeHandle("assets:delete", (_event, input) => {
    const db2 = getDatabase();
    const transaction = db2.transaction(() => {
      db2.prepare("DELETE FROM resguardos WHERE assetId = ?").run(input.id);
      db2.prepare("DELETE FROM movimientos WHERE assetId = ?").run(input.id);
      db2.prepare("DELETE FROM assets WHERE id = ?").run(input.id);
    });
    transaction();
    return { success: true };
  });
  safeHandle("assets:assignedNames", () => {
    const rows = getDatabase().prepare(
      `SELECT DISTINCT TRIM(asignadoA) AS nombre
         FROM assets
         WHERE asignadoA IS NOT NULL
           AND TRIM(asignadoA) <> ''
         ORDER BY nombre ASC`
    ).all();
    return rows.map((row) => row.nombre);
  });
  safeHandle("assets:resguardo", async (_event, input) => {
    const asset = getAssetOrThrow(input.id);
    if (!asset.asignadoA) {
      throw new Error("El activo no tiene responsable asignado");
    }
    const resguardoId = randomUUID();
    const pdfPath = await createResguardoPdf(resguardoId, asset);
    getDatabase().prepare("INSERT INTO resguardos (id, assetId, asignadoA, pdfPath) VALUES (?, ?, ?, ?)").run(resguardoId, asset.id, asset.asignadoA, pdfPath);
    await shell.openPath(pdfPath);
    return { pdfPath };
  });
}
function getAssetOrThrow(id) {
  const asset = getDatabase().prepare(`${assetSelect} WHERE assets.id = ?`).get(id);
  if (!asset) throw new Error("Activo no encontrado");
  return asset;
}
async function createResguardoPdf(resguardoId, asset) {
  const document = await PDFDocument.create();
  const page = document.addPage(PageSizes.A4);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const slate = rgb(0.12, 0.16, 0.23);
  const muted = rgb(0.39, 0.45, 0.55);
  const emerald = rgb(0.02, 0.45, 0.27);
  const logo = await loadHeaderLogo(document);
  const now = /* @__PURE__ */ new Date();
  const fecha = now.toLocaleDateString("es-MX");
  const text = (value, x, y2, size = 10, useBold = false, color = slate) => {
    page.drawText(value, { x, y: y2, size, font: useBold ? bold : font, color });
  };
  const line = (x1, y1, x2, y2) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.8, color: muted });
  };
  if (logo) {
    const logoWidth = 126;
    const logoHeight = logo.height / logo.width * logoWidth;
    page.drawImage(logo, {
      x: 54,
      y: 720,
      width: logoWidth,
      height: logoHeight
    });
  } else {
    text("CAMAF - Camaleón Administración de Activos Fijos", 54, 735, 16, true, emerald);
    text("Mayakoba México", 54, 713, 11, false, muted);
  }
  text("RESGUARDO INTERNO DE EQUIPO DE CÓMPUTO", 54, 665, 16, true);
  text(`Fecha de emisión: ${fecha}`, 54, 640, 10, false, muted);
  text(`Folio: ${resguardoId}`, 360, 640, 10, false, muted);
  text("Datos del activo", 54, 600, 13, true);
  const rows = [
    ["Unidad", asset.unidad],
    ["ID interno", asset.internalId ?? "N/A"],
    ["No. de inventario", asset.inventoryNumber ?? "N/A"],
    ["Tipo", asset.tipo],
    ["Nombre", asset.nombre],
    ["Marca", asset.marca ?? "N/A"],
    ["Modelo", asset.modelo ?? "N/A"],
    ["No. Serie", asset.numeroSerie ?? "N/A"],
    ["Área", asset.areaNombre ?? "N/A"],
    ["Status", asset.status]
  ];
  let y = 572;
  for (const [label, value] of rows) {
    text(`${label}:`, 54, y, 10, true);
    text(value, 180, y, 10);
    y -= 20;
  }
  text("Datos del responsable", 54, y - 16, 13, true);
  y -= 44;
  text("Asignado a:", 54, y, 10, true);
  text(asset.asignadoA ?? "N/A", 180, y, 10);
  y -= 22;
  text("Área:", 54, y, 10, true);
  text(asset.areaNombre ?? "N/A", 180, y, 10);
  y -= 72;
  text("Firmas", 54, y, 13, true);
  y -= 74;
  line(78, y, 250, y);
  line(344, y, 516, y);
  text("Entregado por:", 112, y - 20, 10, true);
  text("Recibido por:", 384, y - 20, 10, true);
  text("Este documento acredita el resguardo interno del equipo descrito.", 54, 72, 9, false, muted);
  const dir = join(app.getPath("documents"), "CAMAF", "resguardos");
  mkdirSync(dir, { recursive: true });
  const safeInternalId = (asset.internalId ?? asset.id).replace(/[^a-z0-9_-]/gi, "-");
  const fileDate = now.toISOString().slice(0, 10);
  const pdfPath = join(dir, `resguardo-${safeInternalId}-${fileDate}.pdf`);
  writeFileSync(pdfPath, await document.save());
  return pdfPath;
}
async function loadHeaderLogo(document) {
  const logoPath = app.isPackaged ? join(process.resourcesPath, "brand", "logopdfmayakoba.png") : join(app.getAppPath(), "src", "assets", "brand", "logopdfmayakoba.png");
  if (!existsSync(logoPath)) return null;
  try {
    return await document.embedPng(readFileSync(logoPath));
  } catch {
    return null;
  }
}
const movimientoSelect = `
  SELECT movimientos.id, movimientos.assetId, assets.nombre AS assetNombre,
         assets.internalId AS assetInternalId, movimientos.asignadoA,
         movimientos.tipo, movimientos.descripcion, movimientos.fecha, movimientos.createdAt
  FROM movimientos
  LEFT JOIN assets ON assets.id = movimientos.assetId
`;
function registerMovimientoHandlers() {
  safeHandle("movimientos:list", (_event, input) => {
    const where = [];
    const params = [];
    if (input?.assetId) {
      where.push("movimientos.assetId = ?");
      params.push(input.assetId);
    }
    if (input?.tipo) {
      where.push("movimientos.tipo = ?");
      params.push(input.tipo);
    }
    if (input?.fecha) {
      where.push("date(movimientos.fecha) = date(?)");
      params.push(input.fecha);
    }
    return getDatabase().prepare(`${movimientoSelect} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY movimientos.fecha DESC`).all(...params);
  });
  safeHandle("movimientos:create", (_event, input) => {
    if (!input.assetId) throw new Error("El activo es obligatorio");
    const id = randomUUID();
    const db2 = getDatabase();
    const asignadoA = blankToNull(input.asignadoA);
    const tx = db2.transaction(() => {
      db2.prepare(
        `INSERT INTO movimientos (id, assetId, asignadoA, tipo, descripcion, fecha)
         VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`
      ).run(id, input.assetId, asignadoA, input.tipo, blankToNull(input.descripcion), blankToNull(input.fecha));
      if (input.tipo === "asignacion" || input.tipo === "reasignacion") {
        db2.prepare("UPDATE assets SET status = ?, asignadoA = ? WHERE id = ?").run("asignado", asignadoA, input.assetId);
      } else if (input.tipo === "devolucion") {
        db2.prepare("UPDATE assets SET status = ?, asignadoA = NULL WHERE id = ?").run("activo", input.assetId);
      } else if (input.tipo === "mantenimiento") {
        db2.prepare("UPDATE assets SET status = ? WHERE id = ?").run("mantenimiento", input.assetId);
      } else if (input.tipo === "baja") {
        db2.prepare("UPDATE assets SET status = ? WHERE id = ?").run("baja", input.assetId);
      }
    });
    tx();
    return getMovimientoOrThrow(id);
  });
}
function getMovimientoOrThrow(id) {
  const movimiento = getDatabase().prepare(`${movimientoSelect} WHERE movimientos.id = ?`).get(id);
  if (!movimiento) throw new Error("Movimiento no encontrado");
  return movimiento;
}
function registerIpcHandlers() {
  registerAreaHandlers();
  registerAssetHandlers();
  registerMovimientoHandlers();
}
let mainWindow = null;
registerIpcHandlers();
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "CAMAF - Administracion de Activos Fijos",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../../dist/index.html"));
  }
}
app.whenReady().then(() => {
  getDatabase();
  createWindow();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => {
  closeDatabase();
});
