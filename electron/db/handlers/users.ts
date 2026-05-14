import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database';
import { getSession, requireRole } from './session';
import { blankToNull, safeHandle } from './utils';
import type { User, UserInput } from '../../../src/types';

const userSelect = `
  SELECT users.id, users.email, users.nombre, users.rol, users.status,
         users.areaId, areas.nombre AS areaNombre, users.createdAt, users.updatedAt
  FROM users
  LEFT JOIN areas ON areas.id = users.areaId
`;

export function registerUserHandlers(): void {
  safeHandle<void, User[]>('users:list', () => {
    requireRole(['admin']);
    return getDatabase().prepare(`${userSelect} ORDER BY users.nombre`).all() as User[];
  });

  safeHandle<UserInput, User>('users:create', (_event, input) => {
    requireRole(['admin']);
    if (!input.nombre?.trim()) throw new Error('El nombre es obligatorio');
    if (!input.email?.trim()) throw new Error('El email es obligatorio');
    if (!input.password?.trim()) throw new Error('El password es obligatorio');

    const id = randomUUID();
    getDatabase()
      .prepare(
        `INSERT INTO users (id, email, password, nombre, rol, status, areaId)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.email.trim().toLowerCase(),
        bcrypt.hashSync(input.password, 12),
        input.nombre.trim(),
        input.rol,
        input.status ?? 'activo',
        blankToNull(input.areaId)
      );

    return getUserOrThrow(id);
  });

  safeHandle<{ id: string; data: Partial<UserInput> }, User>('users:update', (_event, input) => {
    requireRole(['admin']);
    const fields: string[] = [];
    const params: unknown[] = [];

    if (Object.prototype.hasOwnProperty.call(input.data, 'email')) {
      if (!input.data.email?.trim()) throw new Error('El email es obligatorio');
      fields.push('email = ?');
      params.push(input.data.email.trim().toLowerCase());
    }
    if (Object.prototype.hasOwnProperty.call(input.data, 'password') && input.data.password?.trim()) {
      fields.push('password = ?');
      params.push(bcrypt.hashSync(input.data.password, 12));
    }
    if (Object.prototype.hasOwnProperty.call(input.data, 'nombre')) {
      if (!input.data.nombre?.trim()) throw new Error('El nombre es obligatorio');
      fields.push('nombre = ?');
      params.push(input.data.nombre.trim());
    }
    if (Object.prototype.hasOwnProperty.call(input.data, 'rol')) {
      fields.push('rol = ?');
      params.push(input.data.rol);
    }
    if (Object.prototype.hasOwnProperty.call(input.data, 'status')) {
      fields.push('status = ?');
      params.push(input.data.status);
    }
    if (Object.prototype.hasOwnProperty.call(input.data, 'areaId')) {
      fields.push('areaId = ?');
      params.push(blankToNull(input.data.areaId));
    }

    if (!fields.length) return getUserOrThrow(input.id);
    params.push(input.id);
    getDatabase().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return getUserOrThrow(input.id);
  });

  safeHandle<{ id: string }, { success: boolean }>('users:delete', (_event, input) => {
    requireRole(['admin']);
    if (getSession()?.user.id === input.id) {
      throw new Error('No puedes eliminar tu propia sesion');
    }
    getDatabase().prepare('DELETE FROM users WHERE id = ?').run(input.id);
    return { success: true };
  });
}

function getUserOrThrow(id: string): User {
  const user = getDatabase().prepare(`${userSelect} WHERE users.id = ?`).get(id) as User | undefined;
  if (!user) throw new Error('Usuario no encontrado');
  return user;
}
