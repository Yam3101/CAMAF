import { useEffect, useState } from 'react';
import { HiOutlineArrowLeft, HiOutlineDocumentArrowDown } from 'react-icons/hi2';
import type { Toast } from '../App';
import Badge from '../components/Badge';
import Table, { type Column } from '../components/Table';
import { useAuth } from '../hooks/useAuth';
import type { Asset, Movimiento } from '../types';
import { isIpcError } from '../types';

type AssetDetailProps = {
  id: string;
  navigate: (route: string, id?: string) => void;
  notify: (toast: Toast) => void;
};

export default function AssetDetail({ id, navigate, notify }: AssetDetailProps) {
  const { user } = useAuth();
  const canEdit = user?.rol === 'admin' || user?.rol === 'supervisor';
  const [asset, setAsset] = useState<Asset | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  useEffect(() => {
    async function load() {
      const [assetResponse, movementResponse] = await Promise.all([
        window.camaf.assets.get(id),
        window.camaf.movimientos.list({ assetId: id })
      ]);
      if (isIpcError(assetResponse)) notify({ type: 'error', message: assetResponse.error });
      else setAsset(assetResponse);
      if (isIpcError(movementResponse)) notify({ type: 'error', message: movementResponse.error });
      else setMovimientos(movementResponse);
    }
    void load();
  }, [id]);

  const generate = async (): Promise<void> => {
    const response = await window.camaf.assets.resguardo(id);
    if (isIpcError(response)) notify({ type: 'error', message: response.error });
    else notify({ type: 'success', message: `Resguardo generado: ${response.pdfPath}` });
  };

  const columns: Column<Movimiento>[] = [
    { key: 'fecha', header: 'Fecha', render: (row) => new Date(row.fecha).toLocaleString('es-MX') },
    { key: 'tipo', header: 'Tipo', render: (row) => <Badge value={row.tipo} /> },
    { key: 'usuario', header: 'Usuario', render: (row) => row.usuarioNombre ?? 'N/A' },
    { key: 'descripcion', header: 'Descripcion', render: (row) => row.descripcion ?? 'N/A' }
  ];

  if (!asset) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Activo no encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate('assets')}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <HiOutlineArrowLeft className="h-4 w-4" />
            Volver a activos
          </button>
          <h1 className="text-2xl font-semibold text-camaf-ink">{asset.nombre}</h1>
          <p className="mt-1 text-sm text-slate-500">{asset.internalId ?? asset.inventoryNumber ?? asset.id}</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => void generate()}
            className="inline-flex h-10 items-center gap-2 rounded bg-camaf-ink px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <HiOutlineDocumentArrowDown className="h-5 w-5" />
            Generar resguardo
          </button>
        )}
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Info label="ID interno" value={asset.internalId} />
        <Info label="No. inventario" value={asset.inventoryNumber} />
        <Info label="Tipo" value={asset.tipo} />
        <Info label="Marca" value={asset.marca} />
        <Info label="Modelo" value={asset.modelo} />
        <Info label="No. Serie" value={asset.numeroSerie} />
        <Info label="Area" value={asset.areaNombre} />
        <Info label="Responsable" value={asset.responsableNombre} />
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Status</p>
          <div className="mt-2"><Badge value={asset.status} /></div>
        </div>
        <Info label="Fecha adquisicion" value={asset.fechaAdquisicion} />
        <Info label="Creado" value={new Date(asset.createdAt).toLocaleString('es-MX')} />
        <Info label="Actualizado" value={new Date(asset.updatedAt).toLocaleString('es-MX')} />
      </section>

      <section className="rounded border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase text-slate-500">Notas</p>
        <p className="mt-2 text-sm text-slate-700">{asset.notas ?? 'N/A'}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Historial de movimientos</h2>
        <Table rows={movimientos} columns={columns} getRowKey={(row) => row.id} emptyText="No hay movimientos para este activo" />
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded border border-camaf-sage/20 bg-white/95 p-4 shadow-sm">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 min-h-5 text-sm font-medium text-slate-900">{value || 'N/A'}</p>
    </div>
  );
}
