import type { ReactNode } from "react";
import Sidebar from "./SidebarBeta";
import "@/styles/layout.css";

type LayoutProps = {
	route: string;
	navigate: (route: string) => void;
	children: ReactNode;
};

export default function LayoutBeta({ route, navigate, children }: LayoutProps) {
	return (
		<div className="dashboard-layout">
			<Sidebar route={route} navigate={navigate} />
			<div className="layout-content">
				<header className="layout-header">
					<div className="layout-user">
						<p className="layout-user__name">Sistema CAMAF</p>
						<p className="layout-user__role">Activos Fijos Mayakoba</p>
					</div>
				</header>
				<main className="layout-main">{children}</main>
			</div>
		</div>
	);
}
