import { FormEvent, type ReactNode, useEffect, useState } from 'react';
import { HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import type { Toast } from '../App';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Table, { type Column } from '../components/Table';
import type { Area, Role, User, UserInput, UserStatus } from '../types';
import { isIpcError } from '../types';

const roles: Role[] = ['admin', 'supervisor', 'usuario'];
const statuses: UserStatus[] = ['activo', 'inactivo'];

type UsersProps = {
  notify: (toast: Toast) => void;
};

const emptyForm: UserInput = {
  email: '',
  password: '',
  nombre: '',
  rol: 'usuario',
  status: 'activo',
  areaId: ''
};

export default function Users({ notify }: UsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserInput>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    const [userResponse, areaResponse] = await Promise.all([window.camaf.users.list(), window.camaf.areas.list()]);
    if (isIpcError(userResponse)) notify({ type: 'error', message: userResponse.error });
    else setUsers(userResponse);
    if (isIpcError(areaResponse)) notify({ type: 'error', message: areaResponse.error });
    else setAreas(areaResponse);
  }

  useEffect(() => {
    void load();
  }, []);

  const openCreate = (): void => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: User): void => {
    setEditing(row);
    setForm({
      email: row.email,
      password: '',
      nombre: row.nombre,
      rol: row.rol,
      status: row.status,
      areaId: row.areaId ?? ''
    });
    setModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const payload = editing && !form.password ? { ...form, password: undefined } : form;
    const response = editing ? await window.camaf.users.update(editing.id, payload) : await window.camaf.users.create(payload);
    if (isIpcError(response)) {
      notify({ type: 'error', message: response.error });
      return;
    }
    notify({ type: 'success', message: editing ? 'Usuario actualizado' : 'Usuario creado' });
    setModalOpen(false);
    await load();
  };

  const remove = async (row: User): Promise<void> => {
    if (!window.confirm(`Eliminar ${row.nombre}?`)) return;
    const response = await window.camaf.users.delete(row.id);
    if (isIpcError(response)) notify({ type: 'error', message: response.error });
    else {
      notify({ type: 'success', message: 'Usuario eliminado' });
      await load();
    }
  };

  const columns: Column<User>[] = [
    { key: 'nombre', header: 'Nombre', render: (row) => <span className="font-medium text-slate-900">{row.nombre}</span> },
    { key: 'email', header: 'Email', render: (row) => row.email },
    { key: 'rol', header: 'Rol', render: (row) => <Badge value={row.rol} /> },
    { key: 'area', header: 'Area', render: (row) => row.areaNombre ?? 'N/A' },
    { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <div className="flex gap-1">
          <IconButton title="Editar" onClick={() => openEdit(row)} icon={<HiOutlinePencilSquare />} />
          <IconButton title="Eliminar" onClick={() => void remove(row)} icon={<HiOutlineTrash />} danger />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-camaf-ink">Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500">Administracion de cuentas y roles.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-10 items-center gap-2 rounded bg-camaf-ink px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <HiOutlinePlus className="h-5 w-5" />
          Nuevo usuario
        </button>
      </header>

      <Table rows={users} columns={columns} getRowKey={(row) => row.id} emptyText="No hay usuarios registrados" />

      <Modal open={modalOpen} title={editing ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre" value={form.nombre} onChange={(value) => setForm({ ...form, nombre: value })} required />
          <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
          <Field label={editing ? 'Nuevo password' : 'Password'} type="password" value={form.password ?? ''} onChange={(value) => setForm({ ...form, password: value })} required={!editing} />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Rol</span>
            <select className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm" value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value as Role })}>
              {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UserStatus })}>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Area</span>
            <select className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm" value={form.areaId ?? ''} onChange={(event) => setForm({ ...form, areaId: event.target.value })}>
              <option value="">Sin area</option>
              {areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
            </select>
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

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
    </label>
  );
}

function IconButton({ title, onClick, icon, danger = false }: { title: string; onClick: () => void; icon: ReactNode; danger?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} className={`inline-flex h-8 w-8 items-center justify-center rounded border ${danger ? 'border-red-100 text-red-500 hover:bg-red-50' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
      <span className="text-lg">{icon}</span>
    </button>
  );
}
