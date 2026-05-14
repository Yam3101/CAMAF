import { FormEvent, useEffect, useState } from 'react';
import { HiOutlinePlus } from 'react-icons/hi2';
import type { Toast } from '../App';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Table, { type Column } from '../components/Table';
import { useAuth } from '../hooks/useAuth';
import type { Asset, Movimiento, MovimientoInput, MovimientoTipo, User } from '../types';
import { isIpcError } from '../types';

const tipos: MovimientoTipo[] = ['asignacion', 'reasignacion', 'baja', 'mantenimiento', 'devolucion'];

type MovimientosProps = {
  notify: (toast: Toast) => void;
};

const emptyForm: MovimientoInput = {
  assetId: '',
  usuarioId: '',
  tipo: 'asignacion',
  descripcion: '',
  fecha: ''
};

export default function Movimientos({ notify }: MovimientosProps) {
  const { user } = useAuth();
  const canEdit = user?.rol === 'admin' || user?.rol === 'supervisor';
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assetFilter, setAssetFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState<MovimientoTipo | ''>('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MovimientoInput>(emptyForm);

  async function load() {
    const [movResponse, assetResponse, userResponse] = await Promise.all([
      window.camaf.movimientos.list({ assetId: assetFilter, tipo: tipoFilter, fecha: fechaFilter }),
      window.camaf.assets.list(),
      user?.rol === 'admin' ? window.camaf.users.list() : Promise.resolve(user ? [user] : [])
    ]);
    if (isIpcError(movResponse)) notify({ type: 'error', message: movResponse.error });
    else setMovimientos(movResponse);
    if (isIpcError(assetResponse)) notify({ type: 'error', message: assetResponse.error });
    else setAssets(assetResponse);
    if (!isIpcError(userResponse)) setUsers(userResponse);
  }

  useEffect(() => {
    void load();
  }, [assetFilter, tipoFilter, fechaFilter]);

  const openCreate = (): void => {
    setForm({ ...emptyForm, usuarioId: user?.rol === 'admin' ? '' : user?.id ?? '' });
    setModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const response = await window.camaf.movimientos.create(form);
    if (isIpcError(response)) {
      notify({ type: 'error', message: response.error });
      return;
    }
    notify({ type: 'success', message: 'Movimiento registrado' });
    setModalOpen(false);
    await load();
  };

  const columns: Column<Movimiento>[] = [
    { key: 'fecha', header: 'Fecha', render: (row) => new Date(row.fecha).toLocaleString('es-MX') },
    { key: 'asset', header: 'Activo', render: (row) => row.assetInternalId ?? row.assetNombre ?? row.assetId },
    { key: 'tipo', header: 'Tipo', render: (row) => <Badge value={row.tipo} /> },
    { key: 'usuario', header: 'Usuario', render: (row) => row.usuarioNombre ?? 'N/A' },
    { key: 'descripcion', header: 'Descripcion', render: (row) => row.descripcion ?? 'N/A' }
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-camaf-ink">Movimientos</h1>
          <p className="mt-1 text-sm text-slate-500">Historial global de cambios sobre activos.</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded bg-camaf-ink px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <HiOutlinePlus className="h-5 w-5" />
            Nuevo movimiento
          </button>
        )}
      </header>

      <section className="flex flex-wrap gap-3">
        <select value={assetFilter} onChange={(event) => setAssetFilter(event.target.value)} className="h-10 rounded border border-slate-200 bg-white px-3 text-sm">
          <option value="">Activo</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>{asset.internalId ?? asset.nombre}</option>
          ))}
        </select>
        <select value={tipoFilter} onChange={(event) => setTipoFilter(event.target.value as MovimientoTipo | '')} className="h-10 rounded border border-slate-200 bg-white px-3 text-sm">
          <option value="">Tipo</option>
          {tipos.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
        </select>
        <input type="date" value={fechaFilter} onChange={(event) => setFechaFilter(event.target.value)} className="h-10 rounded border border-slate-200 bg-white px-3 text-sm" />
      </section>

      <Table rows={movimientos} columns={columns} getRowKey={(row) => row.id} emptyText="No hay movimientos registrados" />

      <Modal open={modalOpen} title="Nuevo movimiento" onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Activo</span>
            <select required value={form.assetId} onChange={(event) => setForm({ ...form, assetId: event.target.value })} className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm">
              <option value="">Seleccionar</option>
              {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.internalId ?? asset.nombre}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Usuario</span>
            <select required value={form.usuarioId} onChange={(event) => setForm({ ...form, usuarioId: event.target.value })} className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm">
              <option value="">Seleccionar</option>
              {users.map((person) => <option key={person.id} value={person.id}>{person.nombre}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tipo</span>
            <select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as MovimientoTipo })} className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm">
              {tipos.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Fecha</span>
            <input type="datetime-local" value={form.fecha ?? ''} onChange={(event) => setForm({ ...form, fecha: event.target.value })} className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Descripcion</span>
            <textarea value={form.descripcion ?? ''} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} className="mt-1 min-h-24 w-full rounded border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <button type="button" onClick={() => setModalOpen(false)} className="h-10 rounded border border-slate-200 px-4 text-sm">Cancelar</button>
            <button type="submit" className="h-10 rounded bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
