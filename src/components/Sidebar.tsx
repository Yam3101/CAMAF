import {
  HiOutlineArrowsRightLeft,
  HiOutlineComputerDesktop,
  HiOutlineHome,
  HiOutlineUsers
} from 'react-icons/hi2';
import { useAuth } from '../hooks/useAuth';

type SidebarProps = {
  route: string;
  navigate: (route: string) => void;
};

export default function Sidebar({ route, navigate }: SidebarProps) {
  const { user } = useAuth();
  const items = [
    { route: 'dashboard', label: 'Dashboard', icon: HiOutlineHome, visible: true },
    { route: 'assets', label: 'Activos', icon: HiOutlineComputerDesktop, visible: true },
    { route: 'movimientos', label: 'Movimientos', icon: HiOutlineArrowsRightLeft, visible: true },
    { route: 'users', label: 'Usuarios', icon: HiOutlineUsers, visible: user?.rol === 'admin' }
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-camaf-ink text-white shadow-2xl">
      <div className="border-b border-white/10 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded bg-camaf-mint text-sm font-black text-camaf-ink">C</div>
          <div>
            <div className="text-xl font-semibold tracking-normal">CAMAF</div>
            <div className="mt-0.5 text-xs text-camaf-mist">Activos Fijos Mayakoba</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon;
            const active = route === item.route || (item.route === 'assets' && route === 'asset-detail');
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => navigate(item.route)}
                className={`flex h-11 w-full items-center gap-3 rounded px-3 text-left text-sm transition ${
                  active ? 'bg-camaf-mint text-camaf-ink shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
      </nav>
    </aside>
  );
}
