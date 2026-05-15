import type { ReactNode } from "react";
import { LogOut, UserCircle } from "lucide-react";
import Sidebar from "./Sidebar";
import { useAuth } from "../hooks/useAuth";
import "@/styles/layout.css";

type LayoutProps = {
	route: string;
	navigate: (route: string) => void;
	children: ReactNode;
};

export default function Layout({ route, navigate, children }: LayoutProps) {
	const { user, logout } = useAuth();

	return (
		<div className="dashboard-layout">
			<Sidebar route={route} navigate={navigate} />
			<div className="layout-content">
				<header className="layout-header">
					<div className="layout-user">
						<p className="layout-user__name">{user?.nombre}</p>
						<p className="layout-user__role">{user?.rol}</p>
					</div>
					<div className="layout-actions">
						<span className="layout-avatar" aria-hidden="true">
							<UserCircle size={24} />
						</span>
						<button
							type="button"
							onClick={() => void logout()}
							className="secondary-button"
						>
							<LogOut size={18} />
							Salir
						</button>
					</div>
				</header>
				<main className="layout-main">{children}</main>
			</div>
		</div>
	);
}
