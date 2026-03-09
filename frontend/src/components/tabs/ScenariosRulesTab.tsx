"use client";
import { Scenario, ThresholdConfig } from "@/types/batch";

interface Props {
  scenarios: Scenario[];
  thresholds: ThresholdConfig[];
  narm: number;
}

export default function ScenariosRulesTab({ scenarios, thresholds, narm }: Props) {
  return (
    <div className="space-y-4">
      {/* Decision Rule */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-blue-800 mb-1">Decision Rule</h4>
        <p className="text-sm font-mono text-blue-900">
          Reject H<sub>0k</sub> if P(p<sub>k</sub> &gt; q<sub>0k</sub> | Data) &gt; c<sub>k</sub>
        </p>
        <p className="text-xs text-blue-600 mt-1">
          where c<sub>k</sub> is the per-basket decision threshold
        </p>
      </div>

      {/* Scenarios */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-1">Scenarios</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left font-semibold">Scenario</th>
                {Array.from({ length: narm }, (_, i) => (
                  <th key={i} className="border px-2 py-1 text-center font-semibold">
                    B{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenarios.map((sc, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border px-2 py-1 font-medium">{sc.name}</td>
                  {sc.respRates.map((r, j) => (
                    <td key={j} className="border px-2 py-1 text-center">
                      {r.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thresholds */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-1">Decision Thresholds</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left font-semibold">Threshold</th>
                {Array.from({ length: narm }, (_, i) => (
                  <th key={i} className="border px-2 py-1 text-center font-semibold">
                    B{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {thresholds.map((tc, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border px-2 py-1 font-medium">{tc.name}</td>
                  {tc.values.map((v, j) => (
                    <td key={j} className="border px-2 py-1 text-center">
                      {v.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
