"use client";

import { Scenario } from "@/types/batch";

export function generateDefaultScenarios(
  narm: number,
  p0: number[],
  p1: number[]
): Scenario[] {
  const mixed = p0.map((v, i) => (i < Math.ceil(narm / 2) ? p1[i] : v));
  return [
    { name: "Global Null", respRates: [...p0] },
    { name: "Global Alt", respRates: [...p1] },
    { name: "Mixed", respRates: mixed },
  ];
}

interface Props {
  scenarios: Scenario[];
  onChange: (scenarios: Scenario[]) => void;
  narm: number;
}

export default function ScenarioTable({ scenarios, onChange, narm }: Props) {
  const updateName = (idx: number, name: string) => {
    const next = scenarios.map((s, i) =>
      i === idx ? { ...s, name } : s
    );
    onChange(next);
  };

  const updateRate = (idx: number, col: number, value: number) => {
    const next = scenarios.map((s, i) => {
      if (i !== idx) return s;
      const rates = [...s.respRates];
      rates[col] = value;
      return { ...s, respRates: rates };
    });
    onChange(next);
  };

  const addScenario = () => {
    const newRow: Scenario = {
      name: `Scenario ${scenarios.length + 1}`,
      respRates: Array(narm).fill(0.15),
    };
    onChange([...scenarios, newRow]);
  };

  const removeLast = () => {
    if (scenarios.length > 1) {
      onChange(scenarios.slice(0, -1));
    }
  };

  const resetDefaults = () => {
    const p0 = Array(narm).fill(0.15);
    const p1 = Array(narm).fill(0.35);
    onChange(generateDefaultScenarios(narm, p0, p1));
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-2 py-1 text-left font-medium text-gray-600">
                Scenario Name
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
            {scenarios.map((s, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-1 py-0.5">
                  <input
                    type="text"
                    value={s.name}
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
                      value={s.respRates[colIdx] ?? 0}
                      onChange={(e) =>
                        updateRate(
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
          onClick={addScenario}
          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Scenario
        </button>
        <button
          type="button"
          onClick={removeLast}
          disabled={scenarios.length <= 1}
          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Remove Last
        </button>
        <button
          type="button"
          onClick={resetDefaults}
          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Reset Defaults
        </button>
      </div>
    </div>
  );
}
