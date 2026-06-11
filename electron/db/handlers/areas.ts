import { getDatabase } from '../database';
import { requireSession } from './session';
import { safeHandle } from './utils';
import type { Area } from '../../../src/types';
import { randomUUID } from 'node:crypto';

export function registerAreaHandlers(): void {
  safeHandle<void, Area[]>('areas:list', () => {
    requireSession();
    return getDatabase()
      .prepare(
        `SELECT id, nombre, descripcion, activo, createdAt, updatedAt
         FROM areas
         WHERE TRIM(nombre) <> ''
           AND UPPER(TRIM(nombre)) NOT IN ('NO NAME', 'NONAME', 'NO_NAME', 'N/A')
         ORDER BY nombre`
      )
      .all() as Area[];
  });

  safeHandle<{ nombre: string }, Area>('areas:ensure', (_event, input) => {
    requireSession();
    const nombre = cleanAreaName(input.nombre);
    const db = getDatabase();
    const existing = db
      .prepare(
        `SELECT id, nombre, descripcion, activo, createdAt, updatedAt
         FROM areas
         WHERE UPPER(TRIM(nombre)) = UPPER(TRIM(?))`
      )
      .get(nombre) as Area | undefined;
    if (existing) return existing;

    const id = randomUUID();
    db.prepare('INSERT INTO areas (id, nombre, descripcion) VALUES (?, ?, ?)').run(
      id,
      nombre,
      'Area creada desde autocompletado'
    );
    return db
      .prepare('SELECT id, nombre, descripcion, activo, createdAt, updatedAt FROM areas WHERE id = ?')
      .get(id) as Area;
  });

  safeHandle<void, string[]>('db:getAreasUnicas', () => {
    requireSession();
    const rows = getDatabase()
      .prepare(
        `SELECT DISTINCT TRIM(nombre) AS area
         FROM areas
         WHERE nombre IS NOT NULL
           AND TRIM(nombre) <> ''
           AND UPPER(TRIM(nombre)) NOT IN ('NO NAME', 'NONAME', 'NO_NAME', 'N/A')
         ORDER BY area ASC`
      )
      .all() as Array<{ area: string }>;
    return rows.map((row) => row.area);
  });
}

function cleanAreaName(value: string): string {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text || ['NO NAME', 'NONAME', 'NO_NAME', 'N/A'].includes(text.toUpperCase())) {
    return 'SIN ÁREA';
  }
  return text;
}
