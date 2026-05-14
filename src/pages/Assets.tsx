// biome-ignore lint/style/useImportType: <explanation>
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineDocumentArrowDown,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash
} from 'react-icons/hi2';
import type { Toast } from '../App';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Table, { type Column } from '../components/Table';
import { useAuth } from '../hooks/useAuth';
import type { Area, Asset, AssetInput, AssetStatus, AssetType, User } from '../types';
import { isIpcError } from '../types';

const assetTypes: AssetType[] = ['computadora', 'all-in-one', 'laptop', 'monitor', 'impresora', 'tablet', 'ups', 'accesorio', 'otro'];
const assetStatuses: AssetStatus[] = ['activo', 'asignado', 'mantenimiento', 'baja'];

type AssetsProps = {
  navigate: (route: string, id?: string) => void;
  notify: (toast: Toast) => void;
};

const emptyForm: AssetInput = {
  internalId: '',
  inventoryNumber: '',
  nombre: '',
  tipo: 'computadora',
  marca: '',
  modelo: '',
  numeroSerie: '',
  status: 'activo',
  areaId: '',
  responsableId: '',
  fechaAdquisicion: '',
  notas: ''
};

export default function Assets({ navigate, notify }: AssetsProps) {
  const { user } = useAuth();
  const canEdit = user?.rol === 'admin' || user?.rol === 'supervisor';
  const [assets, setAssets] = useState<Asset[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<AssetType | ''>('');
  const [areaId, setAreaId] = useState('');
  const [status, setStatus] = useState<AssetStatus | ''>('');
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssetInput>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);

  const filters = useMemo(() => ({ search, tipo, areaId, status }), [search, tipo, areaId, status]);

  async function load() {
    const [assetResponse, areaResponse, userResponse] = await Promise.all([
      window.camaf.assets.list(filters),
      window.camaf.areas.list(),
      user?.rol === 'admin' ? window.camaf.users.list() : Promise.resolve([] as User[])
    ]);
    if (isIpcError(assetResponse)) notify({ type: 'error', message: assetResponse.error });
    else setAssets(assetResponse);
    if (isIpcError(areaResponse)) notify({ type: 'error', message: areaResponse.error });
    else setAreas(areaResponse);
    if (!isIpcError(userResponse)) setUsers(userResponse);
  }

  useEffect(() => {
    void load();
  }, [filters.search, filters.tipo, filters.areaId, filters.status]);

  const openCreate = (): void => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (asset: Asset): void => {
    setEditing(asset);
    setForm({
      internalId: asset.internalId ?? '',
      inventoryNumber: asset.inventoryNumber ?? '',
      nombre: asset.nombre,
      tipo: asset.tipo,
      marca: asset.marca ?? '',
      modelo: asset.modelo ?? '',
      numeroSerie: asset.numeroSerie ?? '',
      status: asset.status,
      areaId: asset.areaId ?? '',
      responsableId: asset.responsableId ?? '',
      fechaAdquisicion: asset.fechaAdquisicion ?? '',
      notas: asset.notas ?? ''
    });
    setModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const response = editing ? await window.camaf.assets.update(editing.id, form) : await window.camaf.assets.create(form);
    if (isIpcError(response)) {
      notify({ type: 'error', message: response.error });
      return;
    }
    notify({ type: 'success', message: editing ? 'Activo actualizado' : 'Activo creado' });
    setModalOpen(false);
    await load();
  };

  const remove = async (asset: Asset): Promise<void> => {
    if (!window.confirm(`Eliminar ${asset.nombre}?`)) return;
    const response = await window.camaf.assets.delete(asset.id);
    if (isIpcError(response)) notify({ type: 'error', message: response.error });
    else {
      notify({ type: 'success', message: 'Activo eliminado' });
      await load();
    }
  };

  const resguardo = async (asset: Asset): Promise<void> => {
    const response = await window.camaf.assets.resguardo(asset.id);
    if (isIpcError(response)) notify({ type: 'error', message: response.error });
    else notify({ type: 'success', message: `Resguardo generado: ${response.pdfPath}` });
  };

  const columns: Column<Asset>[] = [
    { key: 'internalId', header: 'ID interno', render: (row) => row.internalId ?? 'N/A' },
    { key: 'tipo', header: 'Tipo', render: (row) => row.tipo },
    { key: 'nombre', header: 'Nombre', render: (row) => <span className="font-medium text-slate-900">{row.nombre}</span> },
    { key: 'marca', header: 'Marca/Modelo', render: (row) => [row.marca, row.modelo].filter(Boolean).join(' / ') || 'N/A' },
    { key: 'serie', header: 'No. Serie', render: (row) => row.numeroSerie ?? 'N/A' },
    { key: 'area', header: 'Area', render: (row) => row.areaNombre ?? 'N/A' },
    { key: 'responsable', header: 'Responsable', render: (row) => row.responsableNombre ?? 'N/A' },
    { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> },
    {
      key: 'actions',
      header: 'Acciones',
      className: 'w-48',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <IconButton title="Ver" onClick={() => navigate('asset-detail', row.id)} icon={<HiOutlineEye />} />
          {canEdit && <IconButton title="Editar" onClick={() => openEdit(row)} icon={<HiOutlinePencilSquare />} />}
          {canEdit && <IconButton title="Generar resguardo" onClick={() => void resguardo(row)} icon={<HiOutlineDocumentArrowDown />} />}
          {canEdit && <IconButton title="Eliminar" onClick={() => void remove(row)} icon={<HiOutlineTrash />} danger />}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-camaf-ink">Activos</h1>
          <p className="mt-1 text-sm text-slate-500">Inventario de hardware de oficina.</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded bg-camaf-ink px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <HiOutlinePlus className="h-5 w-5" />
            Nuevo activo
          </button>
        )}
      </header>

      <section className="flex flex-wrap gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, serie o ID" />
        <Select value={tipo} onChange={(value) => setTipo(value as AssetType | '')} options={assetTypes} label="Tipo" />
        <Select value={areaId} onChange={setAreaId} options={areas.map((area) => ({ value: area.id, label: area.nombre }))} label="Area" />
        <Select value={status} onChange={(value) => setStatus(value as AssetStatus | '')} options={assetStatuses} label="Status" />
      </section>

      <Table rows={assets} columns={columns} getRowKey={(row) => row.id} emptyText="No hay activos registrados" />

      <Modal open={modalOpen} title={editing ? 'Editar activo' : 'Nuevo activo'} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <Field label="ID interno" value={form.internalId ?? ''} onChange={(value) => setForm({ ...form, internalId: value })} />
          <Field label="No. inventario" value={form.inventoryNumber ?? ''} onChange={(value) => setForm({ ...form, inventoryNumber: value })} />
          <Field label="Nombre" value={form.nombre} onChange={(value) => setForm({ ...form, nombre: value })} required />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tipo</span>
            <select className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm" value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as AssetType })}>
              {assetTypes.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <Field label="Marca" value={form.marca ?? ''} onChange={(value) => setForm({ ...form, marca: value })} />
          <Field label="Modelo" value={form.modelo ?? ''} onChange={(value) => setForm({ ...form, modelo: value })} />
          <Field label="No. Serie" value={form.numeroSerie ?? ''} onChange={(value) => setForm({ ...form, numeroSerie: value })} />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AssetStatus })}>
              {assetStatuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Area</span>
            <select className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm" value={form.areaId ?? ''} onChange={(event) => setForm({ ...form, areaId: event.target.value })}>
              <option value="">Sin area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>{area.nombre}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Responsable</span>
            <select className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm" value={form.responsableId ?? ''} onChange={(event) => setForm({ ...form, responsableId: event.target.value })}>
              <option value="">Sin responsable</option>
              {users.map((person) => (
                <option key={person.id} value={person.id}>{person.nombre}</option>
              ))}
            </select>
          </label>
          <Field label="Fecha adquisicion" type="date" value={form.fechaAdquisicion ?? ''} onChange={(value) => setForm({ ...form, fechaAdquisicion: value })} />
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Notas</span>
            <textarea className="mt-1 min-h-24 w-full rounded border border-slate-200 px-3 py-2 text-sm" value={form.notas ?? ''} onChange={(event) => setForm({ ...form, notas: event.target.value })} />
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

function IconButton({ title, onClick, icon, danger = false }: { title: string; onClick: () => void; icon: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded border ${
        danger ? 'border-red-100 text-red-500 hover:bg-red-50' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span className="text-lg">{icon}</span>
    </button>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function Select({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: Array<string | { value: string; label: string }>; label: string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded border border-camaf-sage/30 bg-white px-3 text-sm text-slate-700 outline-none focus:border-camaf-sage focus:ring-2 focus:ring-camaf-mint/40">
      <option value="">{label}</option>
      {options.map((option) => {
        const value = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        return (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        );
      })}
    </select>
  );
}
