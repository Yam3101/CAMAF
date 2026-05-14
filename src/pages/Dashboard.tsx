import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArchiveBox,
  HiOutlineClipboardDocumentList,
  HiOutlineComputerDesktop,
  HiOutlineWrenchScrewdriver
} from 'react-icons/hi2';
import Badge from '../components/Badge';
import Table, { type Column } from '../components/Table';
import type { Toast } from '../App';
import type { Asset, Movimiento } from '../types';
import { isIpcError } from '../types';

type DashboardProps = {
  navigate: (route: string, id?: string) => void;
  notify: (toast: Toast) => void;
};

export default function Dashboard({ navigate, notify }: DashboardProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  useEffect(() => {
    async function load() {
      const [assetResponse, movementResponse] = await Promise.all([
        window.camaf.assets.list(),
        window.camaf.movimientos.list()
      ]);
      if (isIpcError(assetResponse)) notify({ type: 'error', message: assetResponse.error });
      else setAssets(assetResponse);
      if (isIpcError(movementResponse)) notify({ type: 'error', message: movementResponse.error });
      else setMovimientos(movementResponse.slice(0, 25));
    }
    void load();
  }, []);

  const metrics = useMemo(
    () => [
      { label: 'Total de activos', value: assets.length, icon: HiOutlineComputerDesktop },
      { label: 'Activos asignados', value: assets.filter((asset) => asset.status === 'asignado').length, icon: HiOutlineClipboardDocumentList },
      { label: 'En mantenimiento', value: assets.filter((asset) => asset.status === 'mantenimiento').length, icon: HiOutlineWrenchScrewdriver },
      { label: 'Dados de baja', value: assets.filter((asset) => asset.status === 'baja').length, icon: HiOutlineArchiveBox }
    ],
    [assets]
  );

  const columns: Column<Movimiento>[] = [
    { key: 'fecha', header: 'Fecha', render: (row) => new Date(row.fecha).toLocaleString('es-MX') },
    {
      key: 'asset',
      header: 'Activo',
      render: (row) => (
        <button className="font-medium text-emerald-700 hover:underline" onClick={() => navigate('asset-detail', row.assetId)}>
          {row.assetInternalId ?? row.assetNombre ?? row.assetId}
        </button>
      )
    },
    { key: 'tipo', header: 'Tipo', render: (row) => <Badge value={row.tipo} /> },
    { key: 'usuario', header: 'Usuario', render: (row) => row.usuarioNombre ?? 'N/A' },
    { key: 'descripcion', header: 'Descripcion', render: (row) => row.descripcion ?? 'N/A' }
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-camaf-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen operativo del inventario de hardware.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded border border-camaf-sage/20 bg-white/95 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                <Icon className="h-6 w-6 text-camaf-sage" />
              </div>
              <p className="mt-4 text-3xl font-semibold text-camaf-ink">{metric.value}</p>
            </article>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Ultimos movimientos</h2>
        <Table rows={movimientos} columns={columns} getRowKey={(row) => row.id} emptyText="No hay movimientos registrados" />
      </section>
    </div>
  );
}
