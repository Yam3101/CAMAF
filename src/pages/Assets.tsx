import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import type { Toast } from "../App";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import SearchBar from "../components/SearchBar";
import Table, { type Column } from "../components/Table";
import ComboBox from "../components/ui/ComboBox";
import { useAuth } from "../hooks/useAuth";
import { generarPDFAlta, generarPDFBaja } from "../lib/pdfGenerator";
import { normalizar } from "../lib/stringUtils";
import type {
	Area,
	Asset,
	AssetInput,
	AssetStatus,
	AssetType,
	User,
} from "../types";
import { isIpcError } from "../types";
import "@/styles/assets.css";
import "@/styles/forms.css";

const assetTypes: AssetType[] = [
	"computadora",
	"all-in-one",
	"laptop",
	"monitor",
	"impresora",
	"tablet",
	"ups",
	"accesorio",
	"otro",
];
const assetStatuses: AssetStatus[] = ["activo", "asignado", "mantenimiento", "baja"];

type AssetsProps = {
	navigate: (route: string, id?: string) => void;
	notify: (toast: Toast) => void;
};

const emptyForm: AssetInput = {
	internalId: "",
	inventoryNumber: "",
	nombre: "",
	tipo: "computadora",
	marca: "",
	modelo: "",
	numeroSerie: "",
	status: "activo",
	areaId: "",
	responsableId: "",
	fechaAdquisicion: "",
	notas: "",
};

export default function Assets({ navigate, notify }: AssetsProps) {
	const { user } = useAuth();
	const canEdit = user?.rol === "admin" || user?.rol === "supervisor";
	const [assets, setAssets] = useState<Asset[]>([]);
	const [areas, setAreas] = useState<Area[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [search, setSearch] = useState("");
	const [tipo, setTipo] = useState<AssetType | "">("");
	const [areaId, setAreaId] = useState("");
	const [status, setStatus] = useState<AssetStatus | "">("");
	const [editing, setEditing] = useState<Asset | null>(null);
	const [form, setForm] = useState<AssetInput>(emptyForm);
	const [areaName, setAreaName] = useState("");
	const [responsableName, setResponsableName] = useState("");
	const [modalOpen, setModalOpen] = useState(false);
	const [pendingUser, setPendingUser] = useState<{
		nombre: string;
		areaId: string;
		areaNombre: string;
		payload: AssetInput;
	} | null>(null);
	const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
	const [bajaModalOpen, setBajaModalOpen] = useState(false);
	const [bajaMotivo, setBajaMotivo] = useState("");
	const [bajaUsuarioId, setBajaUsuarioId] = useState("");

	const filters = useMemo(
		() => ({ search, tipo, areaId, status }),
		[search, tipo, areaId, status],
	);

	const selectedAssets = useMemo(
		() => assets.filter((asset) => selectedAssetIds.includes(asset.id)),
		[assets, selectedAssetIds],
	);

	const allVisibleSelected =
		assets.length > 0 && assets.every((asset) => selectedAssetIds.includes(asset.id));

	async function load() {
		const [assetResponse, areaResponse, userResponse] = await Promise.all([
			window.camaf.assets.list(filters),
			window.camaf.areas.list(),
			canEdit ? window.camaf.users.list() : Promise.resolve([] as User[]),
		]);

		if (isIpcError(assetResponse)) {
			notify({ type: "error", message: assetResponse.error });
		} else {
			setAssets(assetResponse);
			setSelectedAssetIds((current) =>
				current.filter((id) => assetResponse.some((asset) => asset.id === id)),
			);
		}

		if (isIpcError(areaResponse)) {
			notify({ type: "error", message: areaResponse.error });
		} else {
			setAreas(areaResponse);
		}

		if (!isIpcError(userResponse)) setUsers(userResponse);
	}

	useEffect(() => {
		void load();
	}, [filters.search, filters.tipo, filters.areaId, filters.status]);

	const openCreate = (): void => {
		setEditing(null);
		setForm(emptyForm);
		setAreaName("");
		setResponsableName("");
		setModalOpen(true);
	};

	const openEdit = (asset: Asset): void => {
		setEditing(asset);
		setForm({
			internalId: asset.internalId ?? "",
			inventoryNumber: asset.inventoryNumber ?? "",
			nombre: asset.nombre,
			tipo: asset.tipo,
			marca: asset.marca ?? "",
			modelo: asset.modelo ?? "",
			numeroSerie: asset.numeroSerie ?? "",
			status: asset.status,
			areaId: asset.areaId ?? "",
			responsableId: asset.responsableId ?? "",
			fechaAdquisicion: asset.fechaAdquisicion ?? "",
			notas: asset.notas ?? "",
		});
		setAreaName(asset.areaNombre ?? "");
		setResponsableName(asset.responsableNombre ?? "");
		setModalOpen(true);
	};

	const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		const resolvedAreaId = await resolveAreaId(areaName);
		if (resolvedAreaId === null) return;

		const payload: AssetInput = { ...form, areaId: resolvedAreaId };
		const responsable = findUserByName(responsableName);
		if (responsableName.trim() && !responsable) {
			setPendingUser({
				nombre: responsableName.trim(),
				areaId: resolvedAreaId,
				areaNombre: areaName.trim() || "SIN ÁREA",
				payload,
			});
			return;
		}

		payload.responsableId = responsableName.trim() ? responsable?.id ?? "" : "";
		await saveAsset(payload);
	};

	const saveAsset = async (payload: AssetInput): Promise<void> => {
		const response = editing
			? await window.camaf.assets.update(editing.id, payload)
			: await window.camaf.assets.create(payload);

		if (isIpcError(response)) {
			notify({ type: "error", message: response.error });
			return;
		}

		notify({ type: "success", message: editing ? "Activo actualizado" : "Activo creado" });
		setModalOpen(false);
		await load();
	};

	const confirmCreateUserAndSave = async (): Promise<void> => {
		if (!pendingUser) return;
		const response = await window.camaf.users.ensureBasic({
			nombre: pendingUser.nombre,
			areaId: pendingUser.areaId,
		});

		if (isIpcError(response)) {
			notify({ type: "error", message: response.error });
			return;
		}

		setUsers((current) => {
			if (current.some((person) => person.id === response.id)) return current;
			return [...current, response].sort((a, b) => a.nombre.localeCompare(b.nombre));
		});
		setPendingUser(null);
		await saveAsset({ ...pendingUser.payload, responsableId: response.id });
	};

	const resolveAreaId = async (name: string): Promise<string | null> => {
		const trimmed = name.trim();
		if (!trimmed) return "";

		const existing = findAreaByName(trimmed);
		if (existing) return existing.id;

		const response = await window.camaf.areas.ensure(trimmed);
		if (isIpcError(response)) {
			notify({ type: "error", message: response.error });
			return null;
		}

		setAreas((current) => {
			if (current.some((area) => area.id === response.id)) return current;
			return [...current, response].sort((a, b) => a.nombre.localeCompare(b.nombre));
		});
		return response.id;
	};

	const findAreaByName = (name: string): Area | undefined =>
		areas.find((area) => normalizar(area.nombre) === normalizar(name));

	const findUserByName = (name: string): User | undefined =>
		users.find((person) => normalizar(person.nombre) === normalizar(name));

	const remove = async (asset: Asset): Promise<void> => {
		if (!window.confirm(`Eliminar ${asset.nombre}?`)) return;
		const response = await window.camaf.assets.delete(asset.id);
		if (isIpcError(response)) {
			notify({ type: "error", message: response.error });
			return;
		}

		notify({ type: "success", message: "Activo eliminado" });
		await load();
	};

	const resguardo = async (asset: Asset): Promise<void> => {
		const response = await window.camaf.assets.resguardo(asset.id);
		if (isIpcError(response)) {
			notify({ type: "error", message: response.error });
		} else {
			notify({ type: "success", message: `Resguardo generado: ${response.pdfPath}` });
		}
	};

	const toggleAssetSelection = (assetId: string): void => {
		setSelectedAssetIds((current) =>
			current.includes(assetId)
				? current.filter((id) => id !== assetId)
				: [...current, assetId],
		);
	};

	const toggleAllVisible = (): void => {
		if (allVisibleSelected) {
			setSelectedAssetIds([]);
			return;
		}
		setSelectedAssetIds(assets.map((asset) => asset.id));
	};

	const generateAlta = async (): Promise<void> => {
		if (!selectedAssets.length) return;
		await generarPDFAlta(selectedAssets);
		notify({ type: "success", message: "PDF de alta generado" });
	};

	const generateBaja = async (): Promise<void> => {
		if (!selectedAssets.length || !bajaMotivo.trim()) {
			notify({ type: "error", message: "Indica el motivo de la baja" });
			return;
		}

		const responsable = users.find((person) => person.id === bajaUsuarioId);
		await generarPDFBaja(selectedAssets, bajaMotivo.trim(), responsable);
		setBajaModalOpen(false);
		setBajaMotivo("");
		setBajaUsuarioId("");
		notify({ type: "success", message: "PDF de baja generado" });
	};

	const columns: Column<Asset>[] = [
		{
			key: "select",
			header: (
				<input
					type="checkbox"
					className="asset-checkbox"
					checked={allVisibleSelected}
					onChange={toggleAllVisible}
					aria-label="Seleccionar activos visibles"
				/>
			),
			className: "table-cell-select",
			render: (row) => (
				<input
					type="checkbox"
					className="asset-checkbox"
					checked={selectedAssetIds.includes(row.id)}
					onChange={() => toggleAssetSelection(row.id)}
					aria-label={`Seleccionar ${row.nombre}`}
				/>
			),
		},
		{ key: "internalId", header: "ID interno", render: (row) => row.internalId ?? "N/A" },
		{ key: "tipo", header: "Tipo", render: (row) => row.tipo },
		{
			key: "nombre",
			header: "Nombre",
			render: (row) => <span className="table-cell-strong">{row.nombre}</span>,
		},
		{
			key: "marca",
			header: "Marca/Modelo",
			render: (row) => [row.marca, row.modelo].filter(Boolean).join(" / ") || "N/A",
		},
		{ key: "serie", header: "No. Serie", render: (row) => row.numeroSerie ?? "N/A" },
		{ key: "area", header: "Área", render: (row) => row.areaNombre ?? "N/A" },
		{
			key: "responsable",
			header: "Responsable",
			render: (row) => row.responsableNombre ?? "N/A",
		},
		{ key: "status", header: "Status", render: (row) => <Badge value={row.status} /> },
		{
			key: "actions",
			header: "Acciones",
			className: "table-cell-actions",
			render: (row) => (
				<div className="table-actions">
					<IconButton title="Ver" onClick={() => navigate("asset-detail", row.id)} icon={<Eye size={17} />} />
					{canEdit && <IconButton title="Editar" onClick={() => openEdit(row)} icon={<Pencil size={17} />} />}
					{canEdit && (
						<IconButton
							title="Generar resguardo"
							onClick={() => void resguardo(row)}
							icon={<Download size={17} />}
						/>
					)}
					{canEdit && (
						<IconButton
							title="Eliminar"
							onClick={() => void remove(row)}
							icon={<Trash2 size={17} />}
							danger
						/>
					)}
				</div>
			),
		},
	];

	return (
		<div className="page-shell">
			<header className="page-header">
				<div>
					<p className="page-kicker">Inventario</p>
					<h1 className="page-title">Activos</h1>
					<p className="page-description">
						Inventario de hardware de oficina con filtros y resguardos.
					</p>
				</div>
				{canEdit && (
					<button type="button" onClick={openCreate} className="primary-button">
						<Plus size={18} />
						Nuevo activo
					</button>
				)}
			</header>

			<section className="assets-toolbar">
				<div className="filters-row">
					<SearchBar
						value={search}
						onChange={setSearch}
						placeholder="Buscar por nombre, serie o ID"
					/>
					<Select
						value={tipo}
						onChange={(value) => setTipo(value as AssetType | "")}
						options={assetTypes}
						label="Tipo"
					/>
					<Select
						value={areaId}
						onChange={setAreaId}
						options={areas.map((area) => ({ value: area.id, label: area.nombre }))}
						label="Área"
					/>
					<Select
						value={status}
						onChange={(value) => setStatus(value as AssetStatus | "")}
						options={assetStatuses}
						label="Status"
					/>
				</div>
			</section>

			<Table
				rows={assets}
				columns={columns}
				getRowKey={(row) => row.id}
				emptyText="No hay activos registrados"
			/>

			{selectedAssets.length > 0 && (
				<section className="assets-selection-bar">
					<span>{selectedAssets.length} activos seleccionados</span>
					<div className="assets-selection-actions">
						<button type="button" className="secondary-button" onClick={() => setSelectedAssetIds([])}>
							Limpiar selección
						</button>
						<button type="button" className="primary-button" onClick={() => void generateAlta()}>
							<FileText size={18} />
							Generar PDF Alta
						</button>
						<button type="button" className="secondary-button danger-button" onClick={() => setBajaModalOpen(true)}>
							<FileText size={18} />
							Generar PDF Baja
						</button>
					</div>
				</section>
			)}

			<Modal
				open={modalOpen}
				title={editing ? "Editar activo" : "Nuevo activo"}
				onClose={() => setModalOpen(false)}
			>
				<form onSubmit={submit} className="asset-form">
					<Field label="ID interno" value={form.internalId ?? ""} onChange={(value) => setForm({ ...form, internalId: value })} />
					<Field label="No. inventario" value={form.inventoryNumber ?? ""} onChange={(value) => setForm({ ...form, inventoryNumber: value })} />
					<Field label="Nombre" value={form.nombre} onChange={(value) => setForm({ ...form, nombre: value })} required />
					<FormSelect label="Tipo" value={form.tipo ?? "computadora"} onChange={(value) => setForm({ ...form, tipo: value as AssetType })} options={assetTypes} />
					<Field label="Marca" value={form.marca ?? ""} onChange={(value) => setForm({ ...form, marca: value })} />
					<Field label="Modelo" value={form.modelo ?? ""} onChange={(value) => setForm({ ...form, modelo: value })} />
					<Field label="No. Serie" value={form.numeroSerie ?? ""} onChange={(value) => setForm({ ...form, numeroSerie: value })} />
					<FormSelect label="Status" value={form.status ?? "activo"} onChange={(value) => setForm({ ...form, status: value as AssetStatus })} options={assetStatuses} />
					<ComboBox
						label="Área"
						items={areas.map((area) => area.nombre)}
						value={areaName}
						onChange={(value) => {
							setAreaName(value);
							setForm({ ...form, areaId: findAreaByName(value)?.id ?? "" });
						}}
						allowNew
						placeholder="Buscar o escribir área..."
					/>
					<ComboBox
						label="Responsable"
						items={users.map((person) => person.nombre)}
						value={responsableName}
						onChange={(value) => {
							setResponsableName(value);
							setForm({ ...form, responsableId: findUserByName(value)?.id ?? "" });
						}}
						allowNew
						placeholder="Buscar o agregar usuario..."
					/>
					<Field label="Fecha adquisición" type="date" value={form.fechaAdquisicion ?? ""} onChange={(value) => setForm({ ...form, fechaAdquisicion: value })} />
					<label className="form-group form-span-full">
						<span className="form-label">Notas</span>
						<textarea
							className="form-textarea"
							value={form.notas ?? ""}
							onChange={(event) => setForm({ ...form, notas: event.target.value })}
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

			<Modal
				open={Boolean(pendingUser)}
				title="Crear usuario"
				onClose={() => setPendingUser(null)}
			>
				<div className="form-grid">
					<p className="form-helper form-span-full">
						El usuario "{pendingUser?.nombre}" no existe en el sistema. Deseas
						crearlo con el área "{pendingUser?.areaNombre}"?
					</p>
					<div className="form-actions">
						<button type="button" onClick={() => setPendingUser(null)} className="secondary-button">
							Cancelar
						</button>
						<button type="button" className="primary-button" onClick={() => void confirmCreateUserAndSave()}>
							Crear y asignar
						</button>
					</div>
				</div>
			</Modal>

			<Modal
				open={bajaModalOpen}
				title="Generar PDF de baja"
				onClose={() => setBajaModalOpen(false)}
			>
				<form
					className="asset-form"
					onSubmit={(event) => {
						event.preventDefault();
						void generateBaja();
					}}
				>
					<label className="form-group form-span-full">
						<span className="form-label">Motivo de la baja</span>
						<textarea
							className="form-textarea"
							value={bajaMotivo}
							onChange={(event) => setBajaMotivo(event.target.value)}
							placeholder="Describe el motivo de la baja"
							required
						/>
					</label>
					<FormSelect
						label="Responsable"
						value={bajaUsuarioId}
						onChange={setBajaUsuarioId}
						options={users.map((person) => ({ value: person.id, label: person.nombre }))}
						emptyLabel="Sin responsable"
					/>
					<div className="form-actions">
						<button type="button" onClick={() => setBajaModalOpen(false)} className="secondary-button">
							Cancelar
						</button>
						<button type="submit" className="primary-button">
							Generar PDF
						</button>
					</div>
				</form>
			</Modal>
		</div>
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

function Select({
	value,
	onChange,
	options,
	label,
}: {
	value: string;
	onChange: (value: string) => void;
	options: Array<string | { value: string; label: string }>;
	label: string;
}) {
	return (
		<select
			value={value}
			onChange={(event) => onChange(event.target.value)}
			className="form-select"
			aria-label={label}
		>
			<option value="">{label}</option>
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
