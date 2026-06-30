import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database';
import { safeHandle } from './utils';
import type { Area, Unidad } from '../../../src/types';

export function registerAreaHandlers(): void {
  safeHandle<{ unidad?: Unidad }, Area[]>('areas:list', (_event, input) => {
    const params: unknown[] = [];
    const where = [
      `TRIM(nombre) <> ''`,
      `UPPER(TRIM(nombre)) NOT IN ('NO NAME', 'NONAME', 'NO_NAME', 'N/A')`
    ];

    if (input?.unidad) {
      where.push('unidad = ?');
      params.push(input.unidad);
    }

    return getDatabase()
      .prepare(
        `SELECT id, nombre, unidad, descripcion, activo, createdAt, updatedAt
         FROM areas
         WHERE ${where.join(' AND ')}
         ORDER BY unidad, nombre`
      )
      .all(...params) as Area[];
  });

  safeHandle<{ nombre: string; unidad?: Unidad }, Area>('areas:ensure', (_event, input) => {
    const nombre = cleanAreaName(input.nombre);
    const unidad = input.unidad === 'Experiencias' ? 'Experiencias' : 'Camaleón';
    const db = getDatabase();
    const existing = db
      .prepare(
        `SELECT id, nombre, unidad, descripcion, activo, createdAt, updatedAt
         FROM areas
         WHERE UPPER(TRIM(nombre)) = UPPER(TRIM(?))
           AND unidad = ?`
      )
      .get(nombre, unidad) as Area | undefined;
    if (existing) return existing;

    const id = randomUUID();
    db.prepare('INSERT INTO areas (id, nombre, unidad, descripcion) VALUES (?, ?, ?, ?)').run(
      id,
      nombre,
      unidad,
      'Área creada desde autocompletado'
    );
    return db
      .prepare('SELECT id, nombre, unidad, descripcion, activo, createdAt, updatedAt FROM areas WHERE id = ?')
      .get(id) as Area;
  });

  safeHandle<{ unidad?: Unidad }, string[]>('db:getAreasUnicas', (_event, input) => {
    const unidad = input?.unidad === 'Experiencias' ? 'Experiencias' : 'Camaleón';
    const rows = getDatabase()
      .prepare(
        `SELECT DISTINCT TRIM(nombre) AS area
         FROM areas
         WHERE unidad = ?
           AND nombre IS NOT NULL
           AND TRIM(nombre) <> ''
           AND UPPER(TRIM(nombre)) NOT IN ('NO NAME', 'NONAME', 'NO_NAME', 'N/A')
         ORDER BY area ASC`
      )
      .all(unidad) as Array<{ area: string }>;
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
