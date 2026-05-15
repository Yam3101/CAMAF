import { useEffect, useMemo, useState } from "react";
import { Archive, ClipboardList, Monitor, Wrench } from "lucide-react";
import Badge from "../components/Badge";
import Table, { type Column } from "../components/Table";
import type { Toast } from "../App";
import type { Asset, Movimiento } from "../types";
import { isIpcError } from "../types";
import "@/styles/dashboard.css";

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
				window.camaf.movimientos.list(),
			]);

			if (isIpcError(assetResponse)) {
				notify({ type: "error", message: assetResponse.error });
			} else {
				setAssets(assetResponse);
			}

			if (isIpcError(movementResponse)) {
				notify({ type: "error", message: movementResponse.error });
			} else {
				setMovimientos(movementResponse.slice(0, 25));
			}
		}

		void load();
	}, []);

	const metrics = useMemo(
		() => [
			{ label: "Total de activos", value: assets.length, icon: Monitor },
			{
				label: "Activos asignados",
				value: assets.filter((asset) => asset.status === "asignado").length,
				icon: ClipboardList,
			},
			{
				label: "En mantenimiento",
				value: assets.filter((asset) => asset.status === "mantenimiento").length,
				icon: Wrench,
			},
			{
				label: "Dados de baja",
				value: assets.filter((asset) => asset.status === "baja").length,
				icon: Archive,
			},
		],
		[assets],
	);

	const columns: Column<Movimiento>[] = [
		{
			key: "fecha",
			header: "Fecha",
			render: (row) => new Date(row.fecha).toLocaleString("es-MX"),
		},
		{
			key: "asset",
			header: "Activo",
			render: (row) => (
				<button
					type="button"
					className="text-link-button"
					onClick={() => navigate("asset-detail", row.assetId)}
				>
					{row.assetInternalId ?? row.assetNombre ?? row.assetId}
				</button>
			),
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
					<p className="page-kicker">Inventario</p>
					<h1 className="page-title">Dashboard</h1>
					<p className="page-description">
						Resumen operativo del inventario de hardware del área Camaleón.
					</p>
				</div>
			</header>

			<section className="dashboard-metrics">
				{metrics.map((metric) => {
					const Icon = metric.icon;

					return (
						<article key={metric.label} className="metric-card">
							<div className="metric-card__top">
								<p className="metric-card__label">{metric.label}</p>
								<span className="metric-card__icon" aria-hidden="true">
									<Icon size={22} />
								</span>
							</div>
							<p className="metric-card__value">{metric.value}</p>
						</article>
					);
				})}
			</section>

			<section className="dashboard-table-section">
				<h2 className="section-title">Últimos movimientos</h2>
				<Table
					rows={movimientos}
					columns={columns}
					getRowKey={(row) => row.id}
					emptyText="No hay movimientos registrados"
				/>
			</section>
		</div>
	);
}
