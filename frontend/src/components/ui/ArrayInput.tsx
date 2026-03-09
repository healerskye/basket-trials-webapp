"use client";

interface ArrayInputProps {
  label: string;
  values: number[];
  onChange: (v: number[]) => void;
  step?: number;
  min?: number;
  max?: number;
  help?: string;
}

export default function ArrayInput({
  label, values, onChange, step = 0.01, min, max, help
}: ArrayInputProps) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {help && (
          <span className="ml-1 text-gray-400 cursor-help" title={help}>?</span>
        )}
      </label>
      <div className="flex gap-1 flex-wrap">
        {values.map((v, i) => (
          <input
            key={i}
            type="number"
            value={v}
            onChange={(e) => {
              const next = [...values];
              next[i] = parseFloat(e.target.value) || 0;
              onChange(next);
            }}
            step={step}
            min={min}
            max={max}
            className="w-16 px-1 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
          />
        ))}
      </div>
    </div>
  );
}
