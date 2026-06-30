import { useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import type { Toast } from "../AppBeta";
import Badge from "../components/Badge";
import Table, { type Column } from "../components/Table";
import type { Asset, Movimiento } from "../types";
import { isIpcError } from "../types";
import "@/styles/assets.css";

type AssetDetailProps = {
	id: string;
	navigate: (route: string, id?: string) => void;
	notify: (toast: Toast) => void;
};

export default function AssetDetail({ id, navigate, notify }: AssetDetailProps) {
	const [asset, setAsset] = useState<Asset | null>(null);
	const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

	useEffect(() => {
		async function load() {
			const [assetResponse, movementResponse] = await Promise.all([
				window.camaf.assets.get(id),
				window.camaf.movimientos.list({ assetId: id }),
			]);

			if (isIpcError(assetResponse)) {
				notify({ type: "error", message: assetResponse.error });
			} else {
				setAsset(assetResponse);
			}

			if (isIpcError(movementResponse)) {
				notify({ type: "error", message: movementResponse.error });
			} else {
				setMovimientos(movementResponse);
			}
		}

		void load();
	}, [id]);

	const generate = async (): Promise<void> => {
		const response = await window.camaf.assets.resguardo(id);
		if (isIpcError(response)) {
			notify({ type: "error", message: response.error });
		} else {
			notify({ type: "success", message: `Resguardo generado: ${response.pdfPath}` });
		}
	};

	const columns: Column<Movimiento>[] = [
		{
			key: "fecha",
			header: "Fecha",
			render: (row) => new Date(row.fecha).toLocaleString("es-MX"),
		},
		{ key: "tipo", header: "Tipo", render: (row) => <Badge value={row.tipo} /> },
		{
			key: "usuario",
			header: "Asignado a",
			render: (row) => row.asignadoA ?? "N/A",
		},
		{
			key: "descripcion",
			header: "Descripción",
			render: (row) => row.descripcion ?? "N/A",
		},
	];

	if (!asset) {
		return <div className="empty-state-card glass-panel">Activo no encontrado.</div>;
	}

	return (
		<div className="page-shell">
			<header className="page-header">
				<div>
					<button
						type="button"
						onClick={() => navigate("assets")}
						className="ghost-button"
					>
						<ArrowLeft size={17} />
						Volver a activos
					</button>
					<h1 className="page-title">{asset.nombre}</h1>
					<p className="page-description">
						{asset.internalId ?? asset.inventoryNumber ?? asset.id}
					</p>
				</div>
				<button type="button" onClick={() => void generate()} className="primary-button">
					<Download size={18} />
					Generar resguardo
				</button>
			</header>

			<section className="asset-detail-grid">
				<Info label="ID interno" value={asset.internalId} />
				<Info label="No. inventario" value={asset.inventoryNumber} />
				<Info label="Tipo" value={asset.tipo} />
				<Info label="Marca" value={asset.marca} />
				<Info label="Modelo" value={asset.modelo} />
				<Info label="No. Serie" value={asset.numeroSerie} />
				<Info label="Área" value={asset.areaNombre} />
				<Info label="Asignado a" value={asset.asignadoA} />
				<div className="asset-info-card">
					<p className="asset-info-card__label">Status</p>
					<p className="asset-info-card__value">
						<Badge value={asset.status} />
					</p>
				</div>
				<Info label="Fecha adquisición" value={asset.fechaAdquisicion} />
				<Info label="Creado" value={new Date(asset.createdAt).toLocaleString("es-MX")} />
				<Info label="Actualizado" value={new Date(asset.updatedAt).toLocaleString("es-MX")} />
			</section>

			<section className="asset-notes-card glass-panel">
				<p className="asset-info-card__label">Notas</p>
				<p className="asset-info-card__value">{asset.notas ?? "N/A"}</p>
			</section>

			<section className="asset-history-section">
				<h2 className="section-title">Historial de movimientos</h2>
				<Table
					rows={movimientos}
					columns={columns}
					getRowKey={(row) => row.id}
					emptyText="No hay movimientos para este activo"
				/>
			</section>
		</div>
	);
}

function Info({ label, value }: { label: string; value?: string | null }) {
	return (
		<div className="asset-info-card">
			<p className="asset-info-card__label">{label}</p>
			<p className="asset-info-card__value">{value || "N/A"}</p>
		</div>
	);
}
