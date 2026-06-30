// CAMAF — ActivosModal — modal reutilizable para explorar activos por métrica.
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import Badge from "../Badge";
import type { Asset } from "../../types";
import "@/styles/forms.css";
import "@/styles/activosModal.css";

type ActivosModalProps = {
	open: boolean;
	title: string;
	assets: Asset[];
	onClose: () => void;
};

const pageSize = 10;

export default function ActivosModal({
	open,
	title,
	assets,
	onClose,
}: ActivosModalProps) {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);

	const filteredAssets = useMemo(() => {
		const normalized = search.trim().toLowerCase();
		if (!normalized) return assets;

		return assets.filter((asset) => {
			const haystack = [
				asset.numeroSerie,
				asset.internalId,
				asset.inventoryNumber,
				asset.nombre,
				asset.tipo,
				asset.areaNombre,
				asset.asignadoA,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			return haystack.includes(normalized);
		});
	}, [assets, search]);

	const pages = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
	const currentPage = Math.min(page, pages);
	const visibleAssets = filteredAssets.slice(
		(currentPage - 1) * pageSize,
		currentPage * pageSize,
	);

	if (!open) return null;

	return (
		<div className="activos-modal-backdrop" onMouseDown={onClose}>
			<section
				className="activos-modal-card"
				onMouseDown={(event) => event.stopPropagation()}
				aria-modal="true"
				role="dialog"
				aria-label={title}
			>
				<header className="activos-modal-header">
					<div>
						<p className="activos-modal-kicker">Activos</p>
						<h2 className="activos-modal-title">{title}</h2>
					</div>
					<button type="button" className="icon-button" onClick={onClose} title="Cerrar">
						<X size={18} />
					</button>
				</header>

				<div className="activos-modal-toolbar">
					<input
						className="form-input"
						value={search}
						onChange={(event) => {
							setSearch(event.target.value);
							setPage(1);
						}}
						placeholder="Buscar por nombre, serie, área o responsable"
					/>
					<span className="activos-modal-counter">
						Mostrando {visibleAssets.length} de {filteredAssets.length} activos
					</span>
				</div>

				<div className="activos-modal-table-wrap">
					<table className="activos-modal-table">
						<thead>
							<tr>
								<th>N° serie</th>
								<th>Nombre</th>
								<th>Categoría</th>
								<th>Estado</th>
								<th>Área/Ubicación</th>
								<th>Asignado a</th>
							</tr>
						</thead>
						<tbody>
							{visibleAssets.map((asset) => (
								<tr key={asset.id}>
									<td>{asset.numeroSerie ?? asset.internalId ?? "N/A"}</td>
									<td className="activos-modal-strong">{asset.nombre}</td>
									<td>{asset.tipo}</td>
									<td>
										<Badge value={asset.status} />
									</td>
									<td>{asset.areaNombre ?? "N/A"}</td>
									<td>{asset.asignadoA ?? "N/A"}</td>
								</tr>
							))}
						</tbody>
					</table>
					{!visibleAssets.length && (
						<div className="activos-modal-empty">No hay activos para mostrar.</div>
					)}
				</div>

				<footer className="activos-modal-footer">
					<span>
						Página {currentPage} de {pages}
					</span>
					<div className="activos-modal-pagination">
						<button
							type="button"
							className="secondary-button"
							disabled={currentPage === 1}
							onClick={() => setPage((value) => Math.max(1, value - 1))}
						>
							Anterior
						</button>
						<button
							type="button"
							className="secondary-button"
							disabled={currentPage === pages}
							onClick={() => setPage((value) => Math.min(pages, value + 1))}
						>
							Siguiente
						</button>
					</div>
				</footer>
			</section>
		</div>
	);
}
