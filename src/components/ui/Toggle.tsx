interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  ariaLabel?: string;
}

export function Toggle({ checked, onChange, label, ariaLabel }: ToggleProps) {
  return (
    <label className="flex items-center gap-4 cursor-pointer min-h-[80px]">
      {label && <span className="text-body-md font-medium text-body-text flex-1">{label}</span>}
      <button
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        onClick={() => onChange(!checked)}
        className={`relative w-16 h-9 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 ${
          checked ? 'bg-emerald-green' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? 'translate-x-7' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}
