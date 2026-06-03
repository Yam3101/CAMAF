import { useEffect, useMemo, useState } from "react";
import { Archive, ClipboardList, Monitor, Wrench } from "lucide-react";
import Badge from "../components/Badge";
import ActivosModal from "../components/ui/ActivosModal";
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
	const [activeMetric, setActiveMetric] = useState<string | null>(null);

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
			{
				key: "total",
				label: "Total de activos",
				value: assets.length,
				icon: Monitor,
			},
			{
				key: "asignado",
				label: "Activos asignados",
				value: assets.filter((asset) => asset.status === "asignado").length,
				icon: ClipboardList,
			},
			{
				key: "mantenimiento",
				label: "En mantenimiento",
				value: assets.filter((asset) => asset.status === "mantenimiento").length,
				icon: Wrench,
			},
			{
				key: "baja",
				label: "Dados de baja",
				value: assets.filter((asset) => asset.status === "baja").length,
				icon: Archive,
			},
		],
		[assets],
	);

	const modalAssets = useMemo(() => {
		if (!activeMetric || activeMetric === "total") return assets;
		return assets.filter((asset) => asset.status === activeMetric);
	}, [activeMetric, assets]);

	const modalTitle =
		metrics.find((metric) => metric.key === activeMetric)?.label ?? "Total de activos";

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
						<button
							key={metric.label}
							type="button"
							className="metric-card metric-card--interactive"
							onClick={() => setActiveMetric(metric.key)}
						>
							<div className="metric-card__top">
								<p className="metric-card__label">{metric.label}</p>
								<span className="metric-card__icon" aria-hidden="true">
									<Icon size={22} />
								</span>
							</div>
							<p className="metric-card__value">{metric.value}</p>
						</button>
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

			<ActivosModal
				open={Boolean(activeMetric)}
				title={modalTitle}
				assets={modalAssets}
				onClose={() => setActiveMetric(null)}
			/>
		</div>
	);
}
