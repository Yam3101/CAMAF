import { useState, type ChangeEvent, type FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import "@/styles/login.css";

export default function Login() {
	const { login } = useAuth();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (
		event: FormEvent<HTMLFormElement>,
	): Promise<void> => {
		event.preventDefault();
		setError(null);

		if (!email.trim() || !password.trim()) {
			setError("Completa todos los campos.");
			return;
		}

		setSubmitting(true);

		try {
			await login(email, password);
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className="login-page">
			<section className="login-card">
				<div className="login-header">
					<div className="login-logo">
						<LockKeyhole size={34} />
					</div>

					<h1 className="login-title">CAMAF</h1>
					<p className="login-subtitle">
						Control y administración de activos fijos
					</p>
				</div>

				<form className="login-form" onSubmit={handleSubmit}>
					<div className="form-group">
						<label className="form-label" htmlFor="email">
							Correo electrónico
						</label>
						<input
							id="email"
							type="email"
							placeholder="correo@empresa.com"
							className="form-input"
							value={email}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setEmail(event.target.value)
							}
						/>
					</div>

					<div className="form-group">
						<label className="form-label" htmlFor="password">
							Contraseña
						</label>
						<div className="password-wrapper">
							<input
								id="password"
								type={showPassword ? "text" : "password"}
								placeholder="••••••••"
								className="form-input"
								value={password}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									setPassword(event.target.value)
								}
							/>
							<button
								type="button"
								className="password-toggle"
								onClick={() => setShowPassword(!showPassword)}
								aria-label={
									showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
								}
							>
								{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
							</button>
						</div>
					</div>

					{error && <div className="error-box">{error}</div>}

					<button type="submit" className="login-button" disabled={submitting}>
						{submitting ? "Ingresando..." : "Iniciar sesión"}
					</button>
				</form>

				<div className="login-footer">CAMAF Mayakoba</div>
			</section>
		</main>
	);
}
