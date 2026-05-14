import { getDatabase } from '../database';
import { requireSession } from './session';
import { safeHandle } from './utils';
import type { Area } from '../../../src/types';

export function registerAreaHandlers(): void {
  safeHandle<void, Area[]>('areas:list', () => {
    requireSession();
    return getDatabase()
      .prepare('SELECT id, nombre, descripcion, activo, createdAt, updatedAt FROM areas ORDER BY nombre')
      .all() as Area[];
  });
}
