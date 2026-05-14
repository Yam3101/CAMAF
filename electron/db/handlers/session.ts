import type { User } from '../../../src/types';

export type Session = {
  user: User;
  token: string;
};

let currentSession: Session | null = null;

export function setSession(session: Session): void {
  currentSession = session;
}

export function clearSession(): void {
  currentSession = null;
}

export function getSession(): Session | null {
  return currentSession;
}

export function requireSession(): Session {
  if (!currentSession) {
    throw new Error('Sesion no iniciada');
  }
  return currentSession;
}

export function requireRole(roles: User['rol'][]): Session {
  const session = requireSession();
  if (!roles.includes(session.user.rol)) {
    throw new Error('Permisos insuficientes');
  }
  return session;
}
