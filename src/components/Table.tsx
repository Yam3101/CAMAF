import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

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

export default function Table<T>({ rows, columns, getRowKey, emptyText = 'Sin registros' }: TableProps<T>) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const visible = useMemo(() => rows.slice((current - 1) * pageSize, current * pageSize), [rows, current]);

  return (
    <div className="overflow-hidden rounded border border-camaf-sage/20 bg-white/95 shadow-sm">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-camaf-mist/70 text-xs uppercase text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`px-4 py-3 font-semibold ${column.className ?? ''}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((row) => (
              <tr key={getRowKey(row)} className="hover:bg-camaf-cream/50">
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 align-middle text-slate-700 ${column.className ?? ''}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length && <div className="px-4 py-10 text-center text-sm text-slate-500">{emptyText}</div>}

      <footer className="flex items-center justify-between border-t border-camaf-sage/20 bg-white/80 px-4 py-3 text-sm text-slate-500">
        <span>
          {rows.length} registros · pagina {current} de {pages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={current === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="rounded border border-camaf-sage/30 px-3 py-1.5 hover:bg-camaf-mist disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={current === pages}
            onClick={() => setPage((value) => Math.min(pages, value + 1))}
            className="rounded border border-camaf-sage/30 px-3 py-1.5 hover:bg-camaf-mist disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </footer>
    </div>
  );
}
