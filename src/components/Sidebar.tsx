import { ArrowRightLeft, Home, Monitor, Users } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import "@/styles/sidebar.css";

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
					<div className="sidebar-brand__mark">C</div>
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
