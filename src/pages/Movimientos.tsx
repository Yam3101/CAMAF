import { type FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Toast } from "../App";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Table, { type Column } from "../components/Table";
import { useAuth } from "../hooks/useAuth";
import type { Asset, Movimiento, MovimientoInput, MovimientoTipo, User } from "../types";
import { isIpcError } from "../types";
import "@/styles/movimientos.css";
import "@/styles/forms.css";

const tipos: MovimientoTipo[] = [
	"asignacion",
	"reasignacion",
	"baja",
	"mantenimiento",
	"devolucion",
];

type MovimientosProps = {
	notify: (toast: Toast) => void;
};

const emptyForm: MovimientoInput = {
	assetId: "",
	usuarioId: "",
	tipo: "asignacion",
	descripcion: "",
	fecha: "",
};

export default function Movimientos({ notify }: MovimientosProps) {
	const { user } = useAuth();
	const canEdit = user?.rol === "admin" || user?.rol === "supervisor";
	const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
	const [assets, setAssets] = useState<Asset[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [assetFilter, setAssetFilter] = useState("");
	const [tipoFilter, setTipoFilter] = useState<MovimientoTipo | "">("");
	const [fechaFilter, setFechaFilter] = useState("");
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState<MovimientoInput>(emptyForm);

	async function load() {
		const [movResponse, assetResponse, userResponse] = await Promise.all([
			window.camaf.movimientos.list({
				assetId: assetFilter,
				tipo: tipoFilter,
				fecha: fechaFilter,
			}),
			window.camaf.assets.list(),
			user?.rol === "admin" ? window.camaf.users.list() : Promise.resolve(user ? [user] : []),
		]);

		if (isIpcError(movResponse)) {
			notify({ type: "error", message: movResponse.error });
		} else {
			setMovimientos(movResponse);
		}

		if (isIpcError(assetResponse)) {
			notify({ type: "error", message: assetResponse.error });
		} else {
			setAssets(assetResponse);
		}

		if (!isIpcError(userResponse)) setUsers(userResponse);
	}

	useEffect(() => {
		void load();
	}, [assetFilter, tipoFilter, fechaFilter]);

	const openCreate = (): void => {
		setForm({ ...emptyForm, usuarioId: user?.rol === "admin" ? "" : user?.id ?? "" });
		setModalOpen(true);
	};

	const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		const response = await window.camaf.movimientos.create(form);
		if (isIpcError(response)) {
			notify({ type: "error", message: response.error });
			return;
		}

		notify({ type: "success", message: "Movimiento registrado" });
		setModalOpen(false);
		await load();
	};

	const columns: Column<Movimiento>[] = [
		{
			key: "fecha",
			header: "Fecha",
			render: (row) => new Date(row.fecha).toLocaleString("es-MX"),
		},
		{
			key: "asset",
			header: "Activo",
			render: (row) => row.assetInternalId ?? row.assetNombre ?? row.assetId,
		},
		{ key: "tipo", header: "Tipo", render: (row) => <Badge value={row.tipo} /> },
		{
			key: "usuario",
			header: "Usuario",
			render: (row) => row.usuarioNombre ?? "N/A",
		},
		{
			key: "descripcion",
			header: "Descripción",
			render: (row) => row.descripcion ?? "N/A",
		},
	];

	return (
		<div className="page-shell">
			<header className="page-header">
				<div>
					<p className="page-kicker">Operación</p>
					<h1 className="page-title">Movimientos</h1>
					<p className="page-description">
						Historial global de asignaciones, mantenimientos y bajas.
					</p>
				</div>
				{canEdit && (
					<button type="button" onClick={openCreate} className="primary-button">
						<Plus size={18} />
						Nuevo movimiento
					</button>
				)}
			</header>

			<section className="movimientos-filters">
				<select
					value={assetFilter}
					onChange={(event) => setAssetFilter(event.target.value)}
					className="form-select"
					aria-label="Filtrar por activo"
				>
					<option value="">Activo</option>
					{assets.map((asset) => (
						<option key={asset.id} value={asset.id}>
							{asset.internalId ?? asset.nombre}
						</option>
					))}
				</select>
				<select
					value={tipoFilter}
					onChange={(event) => setTipoFilter(event.target.value as MovimientoTipo | "")}
					className="form-select"
					aria-label="Filtrar por tipo"
				>
					<option value="">Tipo</option>
					{tipos.map((tipo) => (
						<option key={tipo} value={tipo}>
							{tipo}
						</option>
					))}
				</select>
				<input
					type="date"
					value={fechaFilter}
					onChange={(event) => setFechaFilter(event.target.value)}
					className="form-input"
					aria-label="Filtrar por fecha"
				/>
			</section>

			<Table
				rows={movimientos}
				columns={columns}
				getRowKey={(row) => row.id}
				emptyText="No hay movimientos registrados"
			/>

			<Modal open={modalOpen} title="Nuevo movimiento" onClose={() => setModalOpen(false)}>
				<form onSubmit={submit} className="movimientos-form">
					<FormSelect
						label="Activo"
						value={form.assetId}
						onChange={(value) => setForm({ ...form, assetId: value })}
						options={assets.map((asset) => ({
							value: asset.id,
							label: asset.internalId ?? asset.nombre,
						}))}
						emptyLabel="Seleccionar"
						required
					/>
					<FormSelect
						label="Usuario"
						value={form.usuarioId}
						onChange={(value) => setForm({ ...form, usuarioId: value })}
						options={users.map((person) => ({ value: person.id, label: person.nombre }))}
						emptyLabel="Seleccionar"
						required
					/>
					<FormSelect
						label="Tipo"
						value={form.tipo}
						onChange={(value) => setForm({ ...form, tipo: value as MovimientoTipo })}
						options={tipos}
					/>
					<label className="form-group">
						<span className="form-label">Fecha</span>
						<input
							type="datetime-local"
							value={form.fecha ?? ""}
							onChange={(event) => setForm({ ...form, fecha: event.target.value })}
							className="form-input"
						/>
					</label>
					<label className="form-group form-span-full">
						<span className="form-label">Descripción</span>
						<textarea
							value={form.descripcion ?? ""}
							onChange={(event) => setForm({ ...form, descripcion: event.target.value })}
							className="form-textarea"
						/>
					</label>
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

function FormSelect({
	label,
	value,
	onChange,
	options,
	emptyLabel,
	required = false,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: Array<string | { value: string; label: string }>;
	emptyLabel?: string;
	required?: boolean;
}) {
	return (
		<label className="form-group">
			<span className="form-label">{label}</span>
			<select
				required={required}
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
