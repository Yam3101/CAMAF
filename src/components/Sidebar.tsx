import { ArrowRightLeft, Home, Monitor, Users } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import "@/styles/sidebar.css";

// CAMAF — Logo dinámico: muestra imagen si existe, fallback a "C".
const brandLogos = import.meta.glob("../assets/brand/*.{png,svg,jpg,jpeg}", {
	eager: true,
	import: "default",
	query: "?url",
}) as Record<string, string>;

const logoPriority = [
	"logoChicoBlanco.png",
	"LogoChicoColor.png",
	"LogoHorizontalBlanco.png",
	"Logohorizontal.png",
	"logo-mayakoba.png",
];

const logoMayakoba =
	logoPriority
		.map(
			(name) =>
				Object.entries(brandLogos).find(([path]) => path.endsWith(`/${name}`))?.[1],
		)
		.find(Boolean) ?? Object.values(brandLogos)[0];

type SidebarProps = {
	route: string;
	navigate: (route: string) => void;
};

export default function Sidebar({ route, navigate }: SidebarProps) {
	const { user } = useAuth();
	const items = [
		{ route: "dashboard", label: "Dashboard", icon: Home, visible: true },
		{ route: "assets", label: "Activos", icon: Monitor, visible: true },
		{
			route: "movimientos",
			label: "Movimientos",
			icon: ArrowRightLeft,
			visible: true,
		},
		{ route: "users", label: "Usuarios", icon: Users, visible: user?.rol === "admin" },
	];

	return (
		<aside className="sidebar">
			<div className="sidebar-brand">
				<div className="sidebar-brand__inner">
					<div
						className={`sidebar-logo-container${
							logoMayakoba ? "" : " sidebar-logo-container--fallback"
						}`}
					>
						{logoMayakoba ? (
							<img
								src={logoMayakoba}
								alt="Logo Mayakoba"
								className="sidebar-logo-img"
							/>
						) : (
							<span className="sidebar-logo-fallback">C</span>
						)}
					</div>
					<div>
						<p className="sidebar-brand__name">CAMAF</p>
						<p className="sidebar-brand__caption">Activos Fijos Mayakoba</p>
					</div>
				</div>
			</div>

			<nav className="sidebar-nav">
				{items
					.filter((item) => item.visible)
					.map((item) => {
						const Icon = item.icon;
						const active =
							route === item.route ||
							(item.route === "assets" && route === "asset-detail");

						return (
							<button
								key={item.route}
								type="button"
								onClick={() => navigate(item.route)}
								className={`sidebar-item${active ? " sidebar-item--active" : ""}`}
							>
								<Icon size={20} />
								<span className="sidebar-item__label">{item.label}</span>
							</button>
						);
					})}
			</nav>
		</aside>
	);
}
