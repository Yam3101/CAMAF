import type { AssetStatus, MovimientoTipo, Role, UserStatus } from '../types';

type BadgeProps = {
  value: AssetStatus | UserStatus | Role | MovimientoTipo | string;
};

const colors: Record<string, string> = {
  activo: 'bg-camaf-mist text-camaf-ink ring-camaf-sage/30',
  asignado: 'bg-camaf-mint/30 text-camaf-ink ring-camaf-sage/40',
  mantenimiento: 'bg-amber-50 text-amber-700 ring-amber-200',
  baja: 'bg-red-50 text-red-700 ring-red-200',
  inactivo: 'bg-slate-100 text-slate-600 ring-slate-200',
  admin: 'bg-slate-800 text-white ring-slate-800',
  supervisor: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  usuario: 'bg-slate-50 text-slate-700 ring-slate-200',
  asignacion: 'bg-sky-50 text-sky-700 ring-sky-200',
  reasignacion: 'bg-violet-50 text-violet-700 ring-violet-200',
  devolucion: 'bg-emerald-50 text-emerald-700 ring-emerald-200'
};

export default function Badge({ value }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ring-1 ring-inset ${colors[value] ?? colors.activo}`}>
      {value}
    </span>
  );
}
