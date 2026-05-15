import { Search } from "lucide-react";
import "@/styles/forms.css";

type SearchBarProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
};

export default function SearchBar({
	value,
	onChange,
	placeholder = "Buscar",
}: SearchBarProps) {
	return (
		<label className="search-field">
			<Search className="search-field__icon" size={18} />
			<input
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				className="form-input"
			/>
		</label>
	);
}
