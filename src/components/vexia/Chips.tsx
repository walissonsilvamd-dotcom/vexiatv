export function Chips({
  options,
  value,
  onChange,
  navRow,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  navRow: number;
}) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto py-2">
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          active={value === opt}
          navRow={navRow}
          onClick={() => onChange(opt)}
        />
      ))}
    </div>
  );
}

export function Chip({
  label,
  active,
  onClick,
  navRow,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  navRow: number;
}) {
  return (
    <button
      type="button"
      data-nav-row={navRow}
      tabIndex={0}
      onClick={onClick}
      className={`vexia-focus shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide ${
        active
          ? "bg-vexia-purple text-vexia-text shadow-[0_0_20px_-4px_var(--vexia-purple)]"
          : "bg-vexia-card text-vexia-muted"
      }`}
    >
      {label}
    </button>
  );
}
