import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database';
import { requireRole, requireSession } from './session';
import { blankToNull, safeHandle } from './utils';
import type { Movimiento, MovimientoFilters, MovimientoInput } from '../../../src/types';

const movimientoSelect = `
  SELECT movimientos.id, movimientos.assetId, assets.nombre AS assetNombre,
         assets.internalId AS assetInternalId, movimientos.usuarioId,
         users.nombre AS usuarioNombre, movimientos.tipo, movimientos.descripcion,
         movimientos.fecha, movimientos.createdAt
  FROM movimientos
  LEFT JOIN assets ON assets.id = movimientos.assetId
  LEFT JOIN users ON users.id = movimientos.usuarioId
`;

export function registerMovimientoHandlers(): void {
  safeHandle<MovimientoFilters | undefined, Movimiento[]>('movimientos:list', (_event, input) => {
    requireSession();
    const where: string[] = [];
    const params: unknown[] = [];

    if (input?.assetId) {
      where.push('movimientos.assetId = ?');
      params.push(input.assetId);
    }
    if (input?.tipo) {
      where.push('movimientos.tipo = ?');
      params.push(input.tipo);
    }
    if (input?.fecha) {
      where.push('date(movimientos.fecha) = date(?)');
      params.push(input.fecha);
    }

    return getDatabase()
      .prepare(`${movimientoSelect} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY movimientos.fecha DESC`)
      .all(...params) as Movimiento[];
  });

  safeHandle<MovimientoInput, Movimiento>('movimientos:create', (_event, input) => {
    requireRole(['admin', 'supervisor']);
    if (!input.assetId) throw new Error('El activo es obligatorio');
    if (!input.usuarioId) throw new Error('El usuario es obligatorio');

    const id = randomUUID();
    const db = getDatabase();
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO movimientos (id, assetId, usuarioId, tipo, descripcion, fecha)
         VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`
      ).run(id, input.assetId, input.usuarioId, input.tipo, blankToNull(input.descripcion), blankToNull(input.fecha));

      if (input.tipo === 'asignacion' || input.tipo === 'reasignacion') {
        db.prepare('UPDATE assets SET status = ?, responsableId = ? WHERE id = ?').run('asignado', input.usuarioId, input.assetId);
      } else if (input.tipo === 'devolucion') {
        db.prepare('UPDATE assets SET status = ?, responsableId = NULL WHERE id = ?').run('activo', input.assetId);
      } else if (input.tipo === 'mantenimiento') {
        db.prepare('UPDATE assets SET status = ? WHERE id = ?').run('mantenimiento', input.assetId);
      } else if (input.tipo === 'baja') {
        db.prepare('UPDATE assets SET status = ? WHERE id = ?').run('baja', input.assetId);
      }
    });
    tx();

    return getMovimientoOrThrow(id);
  });
}

function getMovimientoOrThrow(id: string): Movimiento {
  const movimiento = getDatabase().prepare(`${movimientoSelect} WHERE movimientos.id = ?`).get(id) as Movimiento | undefined;
  if (!movimiento) throw new Error('Movimiento no encontrado');
  return movimiento;
}
