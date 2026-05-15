import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import "@/styles/table.css";

export type Column<T> = {
	key: string;
	header: string;
	render: (row: T) => ReactNode;
	className?: string;
};

type TableProps<T> = {
	rows: T[];
	columns: Column<T>[];
	getRowKey: (row: T) => string;
	emptyText?: string;
};

const pageSize = 25;

export default function Table<T>({
	rows,
	columns,
	getRowKey,
	emptyText = "Sin registros",
}: TableProps<T>) {
	const [page, setPage] = useState(1);
	const pages = Math.max(1, Math.ceil(rows.length / pageSize));
	const current = Math.min(page, pages);
	const visible = useMemo(
		() => rows.slice((current - 1) * pageSize, current * pageSize),
		[rows, current],
	);

	return (
		<div className="table-container">
			<div className="table-scroll">
				<table className="data-table">
					<thead className="data-table__head">
						<tr>
							{columns.map((column) => (
								<th key={column.key} className={column.className}>
									{column.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="data-table__body">
						{visible.map((row) => (
							<tr key={getRowKey(row)}>
								{columns.map((column) => (
									<td key={column.key} className={column.className}>
										{column.render(row)}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{!rows.length && <div className="data-table__empty">{emptyText}</div>}

			<footer className="table-footer">
				<span>
					{rows.length} registros · página {current} de {pages}
				</span>
				<div className="table-pagination">
					<button
						type="button"
						disabled={current === 1}
						onClick={() => setPage((value) => Math.max(1, value - 1))}
						className="secondary-button"
					>
						Anterior
					</button>
					<button
						type="button"
						disabled={current === pages}
						onClick={() => setPage((value) => Math.min(pages, value + 1))}
						className="secondary-button"
					>
						Siguiente
					</button>
				</div>
			</footer>
		</div>
	);
}
