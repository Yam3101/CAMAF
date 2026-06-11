import { useEffect, useMemo, useRef, useState } from "react";
import { buscarSimilares, normalizar } from "@/lib/stringUtils";
import "@/styles/combo-box.css";

type ComboBoxProps = {
	items: string[];
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	allowNew?: boolean;
	label?: string;
};

type ComboOption = {
	key: string;
	value: string;
	label: string;
	kind: "suggestion" | "item" | "new";
};

export default function ComboBox({
	items,
	value,
	onChange,
	placeholder,
	allowNew = false,
	label,
}: ComboBoxProps) {
	const rootRef = useRef<HTMLLabelElement>(null);
	const [inputValue, setInputValue] = useState(value);
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);

	useEffect(() => {
		setInputValue(value);
	}, [value]);

	useEffect(() => {
		const onPointerDown = (event: MouseEvent): void => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", onPointerDown);
		return () => document.removeEventListener("mousedown", onPointerDown);
	}, []);

	const normalizedInput = normalizar(inputValue);
	const exactMatch = items.some((item) => normalizar(item) === normalizedInput);

	const options = useMemo<ComboOption[]>(() => {
		const filteredItems = items
			.filter((item) => normalizar(item).includes(normalizedInput))
			.slice(0, 8);
		const nextOptions: ComboOption[] = [];
		const suggestion = inputValue.trim()
			? buscarSimilares(inputValue, items).find(
					(item) => normalizar(item) !== normalizedInput,
				)
			: undefined;

		if (suggestion) {
			nextOptions.push({
				key: `suggestion-${suggestion}`,
				value: suggestion,
				label: `Quisiste decir: ${suggestion}`,
				kind: "suggestion",
			});
		}

		for (const item of filteredItems) {
			if (suggestion && normalizar(item) === normalizar(suggestion)) continue;
			nextOptions.push({
				key: `item-${item}`,
				value: item,
				label: item,
				kind: "item",
			});
		}

		if (allowNew && inputValue.trim() && !exactMatch) {
			nextOptions.push({
				key: `new-${inputValue.trim()}`,
				value: inputValue.trim(),
				label: `+ Agregar: "${inputValue.trim()}"`,
				kind: "new",
			});
		}

		return nextOptions;
	}, [allowNew, exactMatch, inputValue, items, normalizedInput]);

	useEffect(() => {
		setActiveIndex(0);
	}, [options.length]);

	const selectOption = (option: ComboOption): void => {
		setInputValue(option.value);
		onChange(option.value);
		setOpen(false);
	};

	return (
		<label className="combo-box form-group" ref={rootRef}>
			{label && <span className="form-label">{label}</span>}
			<input
				type="text"
				className="form-input combo-box__input"
				value={inputValue}
				placeholder={placeholder}
				onFocus={() => setOpen(true)}
				onChange={(event) => {
					setInputValue(event.target.value);
					onChange(event.target.value);
					setOpen(true);
				}}
				onKeyDown={(event) => {
					if (event.key === "ArrowDown") {
						event.preventDefault();
						setOpen(true);
						setActiveIndex((current) =>
							options.length ? (current + 1) % options.length : 0,
						);
					}
					if (event.key === "ArrowUp") {
						event.preventDefault();
						setOpen(true);
						setActiveIndex((current) =>
							options.length ? (current - 1 + options.length) % options.length : 0,
						);
					}
					if (event.key === "Enter" && open && options[activeIndex]) {
						event.preventDefault();
						selectOption(options[activeIndex]);
					}
					if (event.key === "Escape") {
						setOpen(false);
					}
				}}
				autoComplete="off"
			/>
			{open && (
				<div className="combo-box__menu" role="listbox">
					{options.length > 0 ? (
						options.map((option, index) => (
							<button
								key={option.key}
								type="button"
								className={[
									"combo-box__option",
									option.kind === "suggestion" ? "combo-box__option--suggestion" : "",
									option.kind === "new" ? "combo-box__option--new" : "",
									index === activeIndex ? "combo-box__option--active" : "",
								]
									.filter(Boolean)
									.join(" ")}
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => selectOption(option)}
								role="option"
								aria-selected={index === activeIndex}
							>
								{option.label}
							</button>
						))
					) : (
						<div className="combo-box__empty">Sin coincidencias</div>
					)}
				</div>
			)}
		</label>
	);
}
