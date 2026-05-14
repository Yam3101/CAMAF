import { FormEvent, useState } from "react";
import { HiOutlineLockClosed } from "react-icons/hi2";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
	const { login } = useAuth();
	const [email, setEmail] = useState("admin@camaf.local");
	const [password, setPassword] = useState("Admin123!");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		setError(null);
		if (!email.trim() || !password.trim()) {
			setError("Email y password son obligatorios");
			return;
		}
		setSubmitting(true);
		try {
			await login(email, password);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "No se pudo iniciar sesion",
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className="grid min-h-screen place-items-center px-4">
			<section className="w-full max-w-md rounded border border-camaf-sage/20 bg-white/90 p-8 shadow-2xl backdrop-blur">
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded bg-camaf-ink text-camaf-mint">
						<HiOutlineLockClosed className="h-7 w-7" />
					</div>
					<h1 className="text-3xl font-semibold text-camaf-ink">CAMAF</h1>
					<p className="mt-2 text-sm text-slate-500">
						Camaleon Administracion de Activos Fijos
					</p>
				</div>

				<form className="space-y-4" onSubmit={submit}>
					<label className="block">
						<span className="text-sm font-medium text-slate-700">Email</span>
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="mt-1 h-11 w-full rounded border border-camaf-sage/30 px-3 text-sm outline-none focus:border-camaf-sage focus:ring-2 focus:ring-camaf-mint/40"
						/>
					</label>
					<label className="block">
						<span className="text-sm font-medium text-slate-700">Password</span>
						<input
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="mt-1 h-11 w-full rounded border border-camaf-sage/30 px-3 text-sm outline-none focus:border-camaf-sage focus:ring-2 focus:ring-camaf-mint/40"
						/>
					</label>
					{error && (
						<p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
							{error}
						</p>
					)}
					<button
						type="submit"
						disabled={submitting}
						className="h-11 w-full rounded bg-camaf-ink text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{submitting ? "Entrando..." : "Entrar"}
					</button>
				</form>
			</section>
		</main>
	);
}
