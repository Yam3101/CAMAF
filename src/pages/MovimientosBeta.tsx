import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Toast } from "../AppBeta";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Table, { type Column } from "../components/Table";
import ComboBox from "../components/ui/ComboBox";
import SearchableSelect, { type SearchableSelectOption } from "../components/ui/SearchableSelect";
import type { Asset, Movimiento, MovimientoInput, MovimientoTipo } from "../types";
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
	asignadoA: "",
	tipo: "asignacion",
	descripcion: "",
	fecha: "",
};

export default function MovimientosBeta({ notify }: MovimientosProps) {
	const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
	const [assets, setAssets] = useState<Asset[]>([]);
	const [assignedNames, setAssignedNames] = useState<string[]>([]);
	const [assetFilter, setAssetFilter] = useState("");
	const [tipoFilter, setTipoFilter] = useState<MovimientoTipo | "">("");
	const [fechaFilter, setFechaFilter] = useState("");
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState<MovimientoInput>(emptyForm);

	async function load() {
		const [movResponse, assetResponse, assignedResponse] = await Promise.all([
			window.camaf.movimientos.list({
				assetId: assetFilter,
				tipo: tipoFilter,
				fecha: fechaFilter,
			}),
			window.camaf.assets.list(),
			window.camaf.assets.assignedNames(),
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

		if (!isIpcError(assignedResponse)) setAssignedNames(assignedResponse);
	}

	useEffect(() => {
		void load();
	}, [assetFilter, tipoFilter, fechaFilter]);

	const selectedAsset = useMemo(
		() => assets.find((asset) => asset.id === form.assetId),
		[assets, form.assetId],
	);

	const assetOptions = useMemo<SearchableSelectOption[]>(
		() =>
			assets.map((asset) => ({
				value: asset.id,
				label: asset.internalId ? `${asset.internalId} - ${asset.nombre}` : asset.nombre,
				searchText: [
					asset.nombre,
					asset.internalId,
					asset.inventoryNumber,
					asset.numeroSerie,
					asset.marca,
					asset.modelo,
				]
					.filter(Boolean)
					.join(" "),
			})),
		[assets],
	);

	const openCreate = (): void => {
		setForm(emptyForm);
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
			key: "asignadoA",
			header: "Asignado a",
			render: (row) => row.asignadoA ?? "N/A",
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
				<button type="button" onClick={openCreate} className="primary-button">
					<Plus size={18} />
					Nuevo movimiento
				</button>
			</header>

			<section className="movimientos-filters">
				<SearchableSelect
					value={assetFilter}
					onChange={setAssetFilter}
					options={assetOptions}
					emptyLabel="Activo"
					placeholder="Buscar activo..."
					ariaLabel="Filtrar por activo"
				/>
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
					<SearchableSelect
						label="Activo"
						value={form.assetId}
						onChange={(value) => {
							const nextAsset = assets.find((asset) => asset.id === value);
							setForm({ ...form, assetId: value, asignadoA: nextAsset?.asignadoA ?? form.asignadoA });
						}}
						options={assetOptions}
						emptyLabel="Seleccionar"
						placeholder="Buscar activo..."
						required
					/>
					<ComboBox
						label="Asignado a"
						items={assignedNames}
						value={form.asignadoA ?? selectedAsset?.asignadoA ?? ""}
						onChange={(value) => setForm({ ...form, asignadoA: value })}
						allowNew
						placeholder="Buscar o escribir responsable..."
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
