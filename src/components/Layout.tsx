import type { ReactNode } from 'react';
import { HiOutlineArrowRightOnRectangle, HiOutlineUserCircle } from 'react-icons/hi2';
import Sidebar from './Sidebar';
import { useAuth } from '../hooks/useAuth';

type LayoutProps = {
  route: string;
  navigate: (route: string) => void;
  children: ReactNode;
};

export default function Layout({ route, navigate, children }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <Sidebar route={route} navigate={navigate} />
      <div className="min-h-screen pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-camaf-sage/20 bg-white/85 px-6 shadow-sm backdrop-blur">
          <div>
            <p className="text-sm font-medium text-slate-900">{user?.nombre}</p>
            <p className="text-xs text-slate-500">{user?.rol}</p>
          </div>
          <div className="flex items-center gap-3">
            <HiOutlineUserCircle className="h-8 w-8 text-slate-400" />
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex h-10 items-center gap-2 rounded bg-camaf-ink px-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              <HiOutlineArrowRightOnRectangle className="h-5 w-5" />
              Salir
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-6 py-7">{children}</main>
      </div>
    </div>
  );
}
