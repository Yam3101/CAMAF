import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Toast } from "../App";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Table, { type Column } from "../components/Table";
import type { Area, Role, User, UserInput, UserStatus } from "../types";
import { isIpcError } from "../types";
import "@/styles/users.css";
import "@/styles/forms.css";

const roles: Role[] = ["admin", "supervisor", "usuario"];
const statuses: UserStatus[] = ["activo", "inactivo"];

type UsersProps = {
	notify: (toast: Toast) => void;
};

const emptyForm: UserInput = {
	email: "",
	password: "",
	nombre: "",
	rol: "usuario",
	status: "activo",
	areaId: "",
};

export default function Users({ notify }: UsersProps) {
	const [users, setUsers] = useState<User[]>([]);
	const [areas, setAreas] = useState<Area[]>([]);
	const [editing, setEditing] = useState<User | null>(null);
	const [form, setForm] = useState<UserInput>(emptyForm);
	const [modalOpen, setModalOpen] = useState(false);

	async function load() {
		const [userResponse, areaResponse] = await Promise.all([
			window.camaf.users.list(),
			window.camaf.areas.list(),
		]);

		if (isIpcError(userResponse)) {
			notify({ type: "error", message: userResponse.error });
		} else {
			setUsers(userResponse);
		}

		if (isIpcError(areaResponse)) {
			notify({ type: "error", message: areaResponse.error });
		} else {
			setAreas(areaResponse);
		}
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
			password: "",
			nombre: row.nombre,
			rol: row.rol,
			status: row.status,
			areaId: row.areaId ?? "",
		});
		setModalOpen(true);
	};

	const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		const payload = editing && !form.password ? { ...form, password: undefined } : form;
		const response = editing
			? await window.camaf.users.update(editing.id, payload)
			: await window.camaf.users.create(payload);

		if (isIpcError(response)) {
			notify({ type: "error", message: response.error });
			return;
		}

		notify({ type: "success", message: editing ? "Usuario actualizado" : "Usuario creado" });
		setModalOpen(false);
		await load();
	};

	const remove = async (row: User): Promise<void> => {
		if (!window.confirm(`Eliminar ${row.nombre}?`)) return;
		const response = await window.camaf.users.delete(row.id);
		if (isIpcError(response)) {
			notify({ type: "error", message: response.error });
			return;
		}

		notify({ type: "success", message: "Usuario eliminado" });
		await load();
	};

	const columns: Column<User>[] = [
		{
			key: "nombre",
			header: "Nombre",
			render: (row) => <span className="table-cell-strong">{row.nombre}</span>,
		},
		{ key: "rol", header: "Rol", render: (row) => <Badge value={row.rol} /> },
		{ key: "area", header: "Área", render: (row) => row.areaNombre ?? "N/A" },
		{ key: "status", header: "Status", render: (row) => <Badge value={row.status} /> },
		{
			key: "actions",
			header: "Acciones",
			className: "table-cell-actions",
			render: (row) => (
				<div className="table-actions">
					<IconButton title="Editar" onClick={() => openEdit(row)} icon={<Pencil size={17} />} />
					<IconButton
						title="Eliminar"
						onClick={() => void remove(row)}
						icon={<Trash2 size={17} />}
						danger
					/>
				</div>
			),
		},
	];

	return (
		<div className="page-shell">
			<header className="page-header">
				<div>
					<p className="page-kicker">Administración</p>
					<h1 className="page-title">Usuarios</h1>
					<p className="page-description">Administración de cuentas, roles y áreas.</p>
				</div>
				<button type="button" onClick={openCreate} className="primary-button">
					<Plus size={18} />
					Nuevo usuario
				</button>
			</header>

			<Table
				rows={users}
				columns={columns}
				getRowKey={(row) => row.id}
				emptyText="No hay usuarios registrados"
			/>

			<Modal
				open={modalOpen}
				title={editing ? "Editar usuario" : "Nuevo usuario"}
				onClose={() => setModalOpen(false)}
			>
				<form onSubmit={submit} className="users-form">
					<Field label="Nombre" value={form.nombre} onChange={(value) => setForm({ ...form, nombre: value })} required />
					<Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
					<Field label={editing ? "Nuevo password" : "Password"} type="password" value={form.password ?? ""} onChange={(value) => setForm({ ...form, password: value })} required={!editing} />
					<FormSelect label="Rol" value={form.rol ?? "usuario"} onChange={(value) => setForm({ ...form, rol: value as Role })} options={roles} />
					<FormSelect label="Status" value={form.status ?? "activo"} onChange={(value) => setForm({ ...form, status: value as UserStatus })} options={statuses} />
					<FormSelect
						label="Área"
						value={form.areaId ?? ""}
						onChange={(value) => setForm({ ...form, areaId: value })}
						options={areas.map((area) => ({ value: area.id, label: area.nombre }))}
						emptyLabel="Sin área"
					/>
					<div className="form-actions">
						<button type="button" onClick={() => setModalOpen(false)} className="secondary-button">
							Cancelar
						</button>
						<button type="submit" className="primary-button">
							Guardar
						</button>
					</div>
				</form>
			</Modal>
		</div>
	);
}

function Field({
	label,
	value,
	onChange,
	type = "text",
	required = false,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	type?: string;
	required?: boolean;
}) {
	return (
		<label className="form-group">
			<span className="form-label">{label}</span>
			<input
				type={type}
				required={required}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="form-input"
			/>
		</label>
	);
}

function FormSelect({
	label,
	value,
	onChange,
	options,
	emptyLabel,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: Array<string | { value: string; label: string }>;
	emptyLabel?: string;
}) {
	return (
		<label className="form-group">
			<span className="form-label">{label}</span>
			<select
				className="form-select"
				value={value}
				onChange={(event) => onChange(event.target.value)}
			>
				{emptyLabel && <option value="">{emptyLabel}</option>}
				{options.map((option) => {
					const optionValue = typeof option === "string" ? option : option.value;
					const optionLabel = typeof option === "string" ? option : option.label;
					return (
						<option key={optionValue} value={optionValue}>
							{optionLabel}
						</option>
					);
				})}
			</select>
		</label>
	);
}

function IconButton({
	title,
	onClick,
	icon,
	danger = false,
}: {
	title: string;
	onClick: () => void;
	icon: ReactNode;
	danger?: boolean;
}) {
	return (
		<button
			type="button"
			title={title}
			onClick={onClick}
			className={`icon-button${danger ? " icon-button--danger" : ""}`}
		>
			{icon}
		</button>
	);
}
