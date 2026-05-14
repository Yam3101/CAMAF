import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database';
import { clearSession, getSession, setSession } from './session';
import { safeHandle } from './utils';
import type { LoginInput, User } from '../../../src/types';

type UserRow = User & { password: string };

export function registerAuthHandlers(): void {
  safeHandle<LoginInput, { user: User; token: string }>('auth:login', (_event, input) => {
    const db = getDatabase();
    const row = db
      .prepare(
        `SELECT users.id, users.email, users.password, users.nombre, users.rol, users.status,
                users.areaId, users.createdAt, users.updatedAt, areas.nombre AS areaNombre
         FROM users
         LEFT JOIN areas ON areas.id = users.areaId
         WHERE lower(users.email) = lower(?)`
      )
      .get(input.email.trim()) as UserRow | undefined;

    if (!row || row.status !== 'activo' || !bcrypt.compareSync(input.password, row.password)) {
      throw new Error('Email o password incorrectos');
    }

    const { password: _password, ...user } = row;
    const token = randomUUID();
    setSession({ user, token });
    return { user, token };
  });

  safeHandle<void, { success: boolean }>('auth:logout', () => {
    clearSession();
    return { success: true };
  });

  safeHandle<void, { user: User } | null>('auth:me', () => {
    const session = getSession();
    return session ? { user: session.user } : null;
  });
}
