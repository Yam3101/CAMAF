import { useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout';
import { AuthContext } from './hooks/useAuth';
import AssetDetail from './pages/AssetDetail';
import Assets from './pages/Assets';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Movimientos from './pages/Movimientos';
import Users from './pages/Users';
import type { User } from './types';
import { isIpcError } from './types';

export type Toast = {
  type: 'success' | 'error';
  message: string;
};

type RouteState = {
  route: string;
  id?: string;
};

function readRoute(): RouteState {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) return { route: 'dashboard' };
  const [route, id] = hash.split('/');
  return { route, id };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeState, setRouteState] = useState<RouteState>(readRoute);
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = (next: Toast): void => {
    setToast(next);
    window.setTimeout(() => setToast(null), 3600);
  };

  useEffect(() => {
    const onHashChange = () => setRouteState(readRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    async function boot() {
      try {
        if (!window.camaf?.auth) {
          notify({ type: 'error', message: 'No se cargo el puente seguro de Electron' });
          return;
        }

        const response = await Promise.race([
          window.camaf.auth.me(),
          new Promise<{ error: string }>((resolve) =>
            window.setTimeout(() => resolve({ error: 'Tiempo de espera agotado al consultar la sesion' }), 5000)
          )
        ]);

        if (response && !isIpcError(response)) setUser(response.user);
        if (isIpcError(response)) notify({ type: 'error', message: response.error });
      } catch (error) {
        notify({
          type: 'error',
          message: error instanceof Error ? error.message : 'No se pudo iniciar CAMAF'
        });
      } finally {
        setLoading(false);
      }
    }
    void boot();
  }, []);

  const auth = useMemo(
    () => ({
      user,
      loading,
      login: async (email: string, password: string) => {
        const response = await window.camaf.auth.login({ email, password });
        if (isIpcError(response)) throw new Error(response.error);
        setUser(response.user);
        window.location.hash = '/dashboard';
      },
      logout: async () => {
        await window.camaf.auth.logout();
        setUser(null);
        window.location.hash = '/dashboard';
      }
    }),
    [user, loading]
  );

  const navigate = (route: string, id?: string): void => {
    window.location.hash = id ? `/${route}/${id}` : `/${route}`;
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-600">Cargando CAMAF...</div>;
  }

  return (
    <AuthContext.Provider value={auth}>
      {!user ? (
        <Login />
      ) : (
        <Layout route={routeState.route} navigate={navigate}>
          {routeState.route === 'dashboard' && <Dashboard navigate={navigate} notify={notify} />}
          {routeState.route === 'assets' && <Assets navigate={navigate} notify={notify} />}
          {routeState.route === 'asset-detail' && routeState.id && (
            <AssetDetail id={routeState.id} navigate={navigate} notify={notify} />
          )}
          {routeState.route === 'movimientos' && <Movimientos notify={notify} />}
          {routeState.route === 'users' && user.rol === 'admin' && <Users notify={notify} />}
          {routeState.route === 'users' && user.rol !== 'admin' && (
            <Dashboard navigate={navigate} notify={notify} />
          )}
        </Layout>
      )}

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] rounded px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-camaf-ink text-camaf-mint' : 'bg-red-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </AuthContext.Provider>
  );
}
