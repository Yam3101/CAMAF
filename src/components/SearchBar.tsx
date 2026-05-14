import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchBar({ value, onChange, placeholder = 'Buscar' }: SearchBarProps) {
  return (
    <label className="relative block min-w-0 flex-1">
      <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded border border-camaf-sage/30 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-camaf-sage focus:ring-2 focus:ring-camaf-mint/40"
      />
    </label>
  );
}
