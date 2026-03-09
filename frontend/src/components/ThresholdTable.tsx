"use client";

import { ThresholdConfig } from "@/types/batch";

export function generateDefaultThresholds(narm: number): ThresholdConfig[] {
  return [
    { name: "Threshold 1", values: Array(narm).fill(0.9) },
    { name: "Threshold 2", values: Array(narm).fill(0.95) },
  ];
}

interface Props {
  thresholds: ThresholdConfig[];
  onChange: (thresholds: ThresholdConfig[]) => void;
  narm: number;
}

export default function ThresholdTable({ thresholds, onChange, narm }: Props) {
  const updateName = (idx: number, name: string) => {
    const next = thresholds.map((t, i) =>
      i === idx ? { ...t, name } : t
    );
    onChange(next);
  };

  const updateValue = (idx: number, col: number, value: number) => {
    const next = thresholds.map((t, i) => {
      if (i !== idx) return t;
      const values = [...t.values];
      values[col] = value;
      return { ...t, values };
    });
    onChange(next);
  };

  const addThreshold = () => {
    const newRow: ThresholdConfig = {
      name: `Threshold ${thresholds.length + 1}`,
      values: Array(narm).fill(0.9),
    };
    onChange([...thresholds, newRow]);
  };

  const removeLast = () => {
    if (thresholds.length > 1) {
      onChange(thresholds.slice(0, -1));
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-2 py-1 text-left font-medium text-gray-600">
                Threshold Name
              </th>
              {Array.from({ length: narm }, (_, i) => (
                <th
                  key={i}
                  className="border border-gray-300 px-2 py-1 text-center font-medium text-gray-600"
                >
                  B{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {thresholds.map((t, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-1 py-0.5">
                  <input
                    type="text"
                    value={t.name}
                    onChange={(e) => updateName(rowIdx, e.target.value)}
                    className="w-full px-1 py-0.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </td>
                {Array.from({ length: narm }, (_, colIdx) => (
                  <td
                    key={colIdx}
                    className="border border-gray-300 px-1 py-0.5"
                  >
                    <input
                      type="number"
                      value={t.values[colIdx] ?? 0}
                      onChange={(e) =>
                        updateValue(
                          rowIdx,
                          colIdx,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min={0}
                      max={1}
                      step={0.01}
                      className="w-full px-1 py-0.5 text-xs border border-gray-200 rounded text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={addThreshold}
          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Threshold
        </button>
        <button
          type="button"
          onClick={removeLast}
          disabled={thresholds.length <= 1}
          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Remove Last
        </button>
      </div>
    </div>
  );
}
