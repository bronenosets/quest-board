"use client";

interface IconPickerProps {
  options: string[];
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ options, value, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-1.5 mb-3.5 max-h-40 overflow-y-auto p-1">
      {options.map(ic => (
        <button
          type="button"
          key={ic}
          onClick={() => onChange(ic)}
          className={`aspect-square rounded-[10px] text-2xl flex items-center justify-center transition-all border ${
            value === ic
              ? "bg-primary text-white border-primary"
              : "bg-card-soft border-border hover:bg-white hover:scale-105"
          }`}
          style={value === ic ? { boxShadow: "0 0 0 3px rgba(124,77,255,0.2)" } : undefined}
        >
          {ic}
        </button>
      ))}
    </div>
  );
}
