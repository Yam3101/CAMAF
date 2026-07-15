import { Check, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizar } from "@/lib/stringUtils";
import "@/styles/searchable-select.css";

export type SearchableSelectOption = {
	value: string;
	label: string;
	searchText?: string;
};

type SearchableSelectProps = {
	options: SearchableSelectOption[];
	value: string;
	onChange: (value: string) => void;
	label?: string;
	emptyLabel?: string;
	placeholder?: string;
	required?: boolean;
	ariaLabel?: string;
};

export default function SearchableSelect({
	options,
	value,
	onChange,
	label,
	emptyLabel = "Seleccionar",
	placeholder = "Buscar...",
	required = false,
	ariaLabel,
}: SearchableSelectProps) {
	const rootRef = useRef<HTMLLabelElement>(null);
	const [inputValue, setInputValue] = useState("");
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);

	const selectedOption = useMemo(
		() => options.find((option) => option.value === value),
		[options, value],
	);

	useEffect(() => {
		setInputValue(selectedOption?.label ?? "");
	}, [selectedOption]);

	useEffect(() => {
		const onPointerDown = (event: MouseEvent): void => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
				setInputValue(selectedOption?.label ?? "");
			}
		};

		document.addEventListener("mousedown", onPointerDown);
		return () => document.removeEventListener("mousedown", onPointerDown);
	}, [selectedOption]);

	const filteredOptions = useMemo(() => {
		const normalizedInput = normalizar(inputValue);
		if (!normalizedInput) return options;

		return options.filter((option) =>
			normalizar(`${option.label} ${option.searchText ?? ""}`).includes(normalizedInput),
		);
	}, [inputValue, options]);

	const menuOptions = required
		? filteredOptions
		: [{ value: "", label: emptyLabel }, ...filteredOptions];

	useEffect(() => {
		setActiveIndex(0);
	}, [menuOptions.length]);

	const selectOption = (option: SearchableSelectOption): void => {
		onChange(option.value);
		setInputValue(option.value ? option.label : "");
		setOpen(false);
	};

	const clearSelection = (): void => {
		onChange("");
		setInputValue("");
		setOpen(true);
	};

	return (
		<label className="searchable-select form-group" ref={rootRef}>
			{label && <span className="form-label">{label}</span>}
			<div className="searchable-select__control">
				<Search className="searchable-select__icon" size={18} />
				<input
					type="text"
					className="form-input searchable-select__input"
					value={inputValue}
					placeholder={selectedOption ? placeholder : emptyLabel}
					aria-label={ariaLabel ?? label ?? placeholder}
					aria-expanded={open}
					aria-autocomplete="list"
					role="combobox"
					onFocus={() => setOpen(true)}
					onChange={(event) => {
						setInputValue(event.target.value);
						setOpen(true);
					}}
					onKeyDown={(event) => {
						if (event.key === "ArrowDown") {
							event.preventDefault();
							setOpen(true);
							setActiveIndex((current) =>
								menuOptions.length ? (current + 1) % menuOptions.length : 0,
							);
						}
						if (event.key === "ArrowUp") {
							event.preventDefault();
							setOpen(true);
							setActiveIndex((current) =>
								menuOptions.length ? (current - 1 + menuOptions.length) % menuOptions.length : 0,
							);
						}
						if (event.key === "Enter" && open && menuOptions[activeIndex]) {
							event.preventDefault();
							selectOption(menuOptions[activeIndex]);
						}
						if (event.key === "Escape") {
							setOpen(false);
							setInputValue(selectedOption?.label ?? "");
						}
					}}
					autoComplete="off"
				/>
				{value && (
					<button
						type="button"
						className="searchable-select__clear"
						onClick={clearSelection}
						aria-label="Limpiar activo"
					>
						<X size={16} />
					</button>
				)}
			</div>
			{open && (
				<div className="searchable-select__menu" role="listbox">
					{menuOptions.length > 0 ? (
						menuOptions.map((option, index) => (
							<button
								key={option.value || "empty"}
								type="button"
								className={[
									"searchable-select__option",
									index === activeIndex ? "searchable-select__option--active" : "",
									option.value === value ? "searchable-select__option--selected" : "",
									!option.value ? "searchable-select__option--empty" : "",
								]
									.filter(Boolean)
									.join(" ")}
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => selectOption(option)}
								role="option"
								aria-selected={option.value === value}
							>
								<span>{option.label}</span>
								{option.value === value && <Check size={16} />}
							</button>
						))
					) : (
						<div className="searchable-select__empty">Sin coincidencias</div>
					)}
				</div>
			)}
		</label>
	);
}
