import { useEffect, useState } from "react";
import Layout from "./components/LayoutBeta";
import AssetDetail from "./pages/AssetDetail";
import Assets from "./pages/AssetsBeta";
import Dashboard from "./pages/Dashboard";
import Movimientos from "./pages/MovimientosBeta";

export type Toast = {
	type: "success" | "error";
	message: string;
};

type RouteState = {
	route: string;
	id?: string;
};

function readRoute(): RouteState {
	const hash = window.location.hash.replace(/^#\/?/, "");
	if (!hash) return { route: "dashboard" };
	const [route, id] = hash.split("/");
	return { route, id };
}

export default function AppBeta() {
	const [routeState, setRouteState] = useState<RouteState>(readRoute);
	const [toast, setToast] = useState<Toast | null>(null);

	const notify = (next: Toast): void => {
		setToast(next);
		window.setTimeout(() => setToast(null), 3600);
	};

	useEffect(() => {
		const onHashChange = () => setRouteState(readRoute());
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);

	const navigate = (route: string, id?: string): void => {
		window.location.hash = id ? `/${route}/${id}` : `/${route}`;
	};

	return (
		<>
			<Layout route={routeState.route} navigate={navigate}>
				{routeState.route === "dashboard" && (
					<Dashboard navigate={navigate} notify={notify} />
				)}
				{routeState.route === "assets" && (
					<Assets navigate={navigate} notify={notify} />
				)}
				{routeState.route === "asset-detail" && routeState.id && (
					<AssetDetail id={routeState.id} navigate={navigate} notify={notify} />
				)}
				{routeState.route === "movimientos" && <Movimientos notify={notify} />}
				{routeState.route === "users" && (
					<Dashboard navigate={navigate} notify={notify} />
				)}
			</Layout>

			{toast && (
				<div className={`app-toast app-toast--${toast.type}`}>
					{toast.message}
				</div>
			)}
		</>
	);
}
