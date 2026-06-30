import type { AssetStatus, MovimientoTipo, Unidad } from "../types";
import "@/styles/badge.css";

type BadgeProps = {
	value: AssetStatus | MovimientoTipo | Unidad | string;
};

export default function Badge({ value }: BadgeProps) {
	const key = String(value).toLowerCase().replace(/\s+/g, "-");

	return <span className={`status-badge status-badge--${key}`}>{value}</span>;
}
