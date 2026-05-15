import type { ReactNode } from "react";
import { X } from "lucide-react";
import "@/styles/modal.css";

type ModalProps = {
	open: boolean;
	title: string;
	children: ReactNode;
	onClose: () => void;
};

export default function Modal({ open, title, children, onClose }: ModalProps) {
	if (!open) return null;

	return (
		<div className="modal-backdrop">
			<section className="modal-card">
				<header className="modal-header">
					<h2 className="modal-title">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="icon-button"
						title="Cerrar"
					>
						<X size={18} />
					</button>
				</header>
				<div className="modal-body">{children}</div>
			</section>
		</div>
	);
}
