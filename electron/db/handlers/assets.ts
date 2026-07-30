import { shell } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { app } from 'electron';
import { PDFDocument, PageSizes, StandardFonts, rgb, type PDFImage } from 'pdf-lib';
import { getDatabase } from '../database';
import { requireRole, requireSession } from './session';
import { blankToNull, safeHandle } from './utils';
import type { Asset, AssetFilters, AssetInput, User } from '../../../src/types';

const assetSelect = `
  SELECT assets.id, assets.internalId, assets.inventoryNumber, assets.nombre, assets.tipo,
         assets.marca, assets.modelo, assets.numeroSerie, assets.status, assets.areaId,
         areas.nombre AS areaNombre, assets.responsableId, users.nombre AS responsableNombre,
         assets.fechaAdquisicion, assets.notas, assets.createdAt, assets.updatedAt
  FROM assets
  LEFT JOIN areas ON areas.id = assets.areaId
  LEFT JOIN users ON users.id = assets.responsableId
`;

export function registerAssetHandlers(): void {
  safeHandle<{ filters?: AssetFilters }, Asset[]>('assets:list', (_event, input) => {
    requireSession();
    const filters = input?.filters ?? {};
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.search?.trim()) {
      where.push(
        `(lower(assets.nombre) LIKE ? OR lower(assets.numeroSerie) LIKE ? OR lower(assets.internalId) LIKE ? OR lower(assets.inventoryNumber) LIKE ?)`
      );
      const search = `%${filters.search.trim().toLowerCase()}%`;
      params.push(search, search, search, search);
    }
    if (filters.tipo) {
      where.push('assets.tipo = ?');
      params.push(filters.tipo);
    }
    if (filters.areaId) {
      where.push('assets.areaId = ?');
      params.push(filters.areaId);
    }
    if (filters.status) {
      where.push('assets.status = ?');
      params.push(filters.status);
    }

    const sql = `${assetSelect} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY assets.createdAt DESC`;
    return getDatabase().prepare(sql).all(...params) as Asset[];
  });

  safeHandle<{ id: string }, Asset | null>('assets:get', (_event, input) => {
    requireSession();
    return (getDatabase().prepare(`${assetSelect} WHERE assets.id = ?`).get(input.id) as Asset | undefined) ?? null;
  });

  safeHandle<AssetInput, Asset>('assets:create', (_event, input) => {
    requireRole(['admin', 'supervisor']);
    if (!input.nombre?.trim()) throw new Error('El nombre del activo es obligatorio');

    const id = randomUUID();
    getDatabase()
      .prepare(
        `INSERT INTO assets (
          id, internalId, inventoryNumber, nombre, tipo, marca, modelo, numeroSerie,
          status, areaId, responsableId, fechaAdquisicion, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        blankToNull(input.internalId),
        blankToNull(input.inventoryNumber),
        input.nombre.trim(),
        input.tipo,
        blankToNull(input.marca),
        blankToNull(input.modelo),
        blankToNull(input.numeroSerie),
        input.status ?? 'activo',
        blankToNull(input.areaId),
        blankToNull(input.responsableId),
        blankToNull(input.fechaAdquisicion),
        blankToNull(input.notas)
      );

    return getAssetOrThrow(id);
  });

  safeHandle<{ id: string; data: Partial<AssetInput> }, Asset>('assets:update', (_event, input) => {
    requireRole(['admin', 'supervisor']);
    const fields: string[] = [];
    const params: unknown[] = [];

    const add = (field: keyof AssetInput, column = field): void => {
      if (Object.prototype.hasOwnProperty.call(input.data, field)) {
        fields.push(`${String(column)} = ?`);
        const value = input.data[field];
        params.push(typeof value === 'string' ? blankToNull(value) : value ?? null);
      }
    };

    add('internalId');
    add('inventoryNumber');
    if (Object.prototype.hasOwnProperty.call(input.data, 'nombre')) {
      if (!input.data.nombre?.trim()) throw new Error('El nombre del activo es obligatorio');
      fields.push('nombre = ?');
      params.push(input.data.nombre.trim());
    }
    add('tipo');
    add('marca');
    add('modelo');
    add('numeroSerie');
    add('status');
    add('areaId');
    add('responsableId');
    add('fechaAdquisicion');
    add('notas');

    if (!fields.length) return getAssetOrThrow(input.id);

    params.push(input.id);
    getDatabase().prepare(`UPDATE assets SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return getAssetOrThrow(input.id);
  });

  safeHandle<{ id: string }, { success: boolean }>('assets:delete', (_event, input) => {
    requireRole(['admin', 'supervisor']);
    const db = getDatabase();
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM resguardos WHERE assetId = ?').run(input.id);
      db.prepare('DELETE FROM movimientos WHERE assetId = ?').run(input.id);
      db.prepare('DELETE FROM assets WHERE id = ?').run(input.id);
    });
    transaction();
    return { success: true };
  });

  safeHandle<{ id: string }, { pdfPath: string }>('assets:resguardo', async (_event, input) => {
    requireRole(['admin', 'supervisor']);
    const asset = getAssetOrThrow(input.id);
    if (!asset.responsableId) {
      throw new Error('El activo no tiene responsable asignado');
    }

    const db = getDatabase();
    const responsible = db
      .prepare(
        `SELECT users.id, users.email, users.nombre, users.rol, users.status, users.areaId,
                users.createdAt, users.updatedAt, areas.nombre AS areaNombre
         FROM users
         LEFT JOIN areas ON areas.id = users.areaId
         WHERE users.id = ?`
      )
      .get(asset.responsableId) as User | undefined;

    if (!responsible) throw new Error('No se encontro el responsable del activo');

    const resguardoId = randomUUID();
    const pdfPath = await createResguardoPdf(resguardoId, asset, responsible);

    db.prepare('INSERT INTO resguardos (id, assetId, usuarioId, pdfPath) VALUES (?, ?, ?, ?)').run(
      resguardoId,
      asset.id,
      responsible.id,
      pdfPath
    );

    await shell.openPath(pdfPath);
    return { pdfPath };
  });
}

function getAssetOrThrow(id: string): Asset {
  const asset = getDatabase().prepare(`${assetSelect} WHERE assets.id = ?`).get(id) as Asset | undefined;
  if (!asset) throw new Error('Activo no encontrado');
  return asset;
}

async function createResguardoPdf(resguardoId: string, asset: Asset, responsible: User): Promise<string> {
  const document = await PDFDocument.create();
  const page = document.addPage(PageSizes.A4);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const slate = rgb(0.12, 0.16, 0.23);
  const muted = rgb(0.39, 0.45, 0.55);
  const emerald = rgb(0.02, 0.45, 0.27);
  const logo = await loadHeaderLogo(document);
  const now = new Date();
  const fecha = now.toLocaleDateString('es-MX');

  const text = (value: string, x: number, y: number, size = 10, useBold = false, color = slate): void => {
    page.drawText(value, { x, y, size, font: useBold ? bold : font, color });
  };
  const line = (x1: number, y1: number, x2: number, y2: number): void => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.8, color: muted });
  };

  if (logo) {
    const logoWidth = 126;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    page.drawImage(logo, {
      x: 54,
      y: 720,
      width: logoWidth,
      height: logoHeight
    });
  } else {
    text('CAMAF - Camaleon Administracion de Activos Fijos', 54, 735, 16, true, emerald);
    text('Mayakoba Mexico', 54, 713, 11, false, muted);
  }

  text('RESGUARDO INTERNO DE EQUIPO DE COMPUTO', 54, 665, 16, true);
  text(`Fecha de emision: ${fecha}`, 54, 640, 10, false, muted);
  text(`Folio: ${resguardoId}`, 360, 640, 10, false, muted);

  text('Datos del activo', 54, 600, 13, true);
  const rows: Array<[string, string]> = [
    ['ID interno', asset.internalId ?? 'N/A'],
    ['No. de inventario', asset.inventoryNumber ?? 'N/A'],
    ['Tipo', asset.tipo],
    ['Nombre', asset.nombre],
    ['Marca', asset.marca ?? 'N/A'],
    ['Modelo', asset.modelo ?? 'N/A'],
    ['No. Serie', asset.numeroSerie ?? 'N/A'],
    ['Area', asset.areaNombre ?? 'N/A'],
    ['Status', asset.status]
  ];

  let y = 572;
  for (const [label, value] of rows) {
    text(`${label}:`, 54, y, 10, true);
    text(value, 180, y, 10);
    y -= 22;
  }

  text('Datos del responsable', 54, y - 16, 13, true);
  y -= 44;
  text('Nombre completo:', 54, y, 10, true);
  text(responsible.nombre, 180, y, 10);
  y -= 22;
  text('Area:', 54, y, 10, true);
  text(responsible.areaNombre ?? 'N/A', 180, y, 10);

  y -= 72;
  text('Firmas', 54, y, 13, true);
  y -= 74;
  line(78, y, 250, y);
  line(344, y, 516, y);
  text('Entregado por:', 112, y - 20, 10, true);
  text('Recibido por:', 384, y - 20, 10, true);

  text('Este documento acredita el resguardo interno del equipo descrito.', 54, 72, 9, false, muted);

  const dir = join(app.getPath('documents'), 'CAMAF', 'resguardos');
  mkdirSync(dir, { recursive: true });
  const safeInternalId = (asset.internalId ?? asset.id).replace(/[^a-z0-9_-]/gi, '-');
  const fileDate = now.toISOString().slice(0, 10);
  const pdfPath = join(dir, `resguardo-${safeInternalId}-${fileDate}.pdf`);
  writeFileSync(pdfPath, await document.save());
  return pdfPath;
}

async function loadHeaderLogo(document: PDFDocument): Promise<PDFImage | null> {
  const logoPath = app.isPackaged
    ? join(process.resourcesPath, 'brand', 'logopdfmayakoba.png')
    : join(app.getAppPath(), 'src', 'assets', 'brand', 'logopdfmayakoba.png');

  if (!existsSync(logoPath)) return null;

  try {
    return await document.embedPng(readFileSync(logoPath));
  } catch {
    return null;
  }
}
