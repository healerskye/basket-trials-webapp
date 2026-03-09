"use client";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { BatchResultRow } from "@/types/batch";

const PerBasketChart = dynamic(
  () => import("@/components/charts/PerBasketChart"),
  { ssr: false }
);

function fmt(v: number | null | undefined, digits = 4): string {
  if (v === null || v === undefined) return "-";
  if (isNaN(v)) return "-";
  return v.toFixed(digits);
}

interface Props {
  results: BatchResultRow[];
  narm: number;
}

export default function PerBasketTab({ results, narm }: Props) {
  const scenarios = useMemo(
    () => Array.from(new Set(results.map((r) => r.scenario))),
    [results]
  );
  const thresholds = useMemo(
    () => Array.from(new Set(results.map((r) => r.threshold))),
    [results]
  );

  const [scenario, setScenario] = useState(scenarios[0] ?? "");
  const [threshold, setThreshold] = useState(thresholds[0] ?? "");

  const row = useMemo(
    () => results.find((r) => r.scenario === scenario && r.threshold === threshold),
    [results, scenario, threshold]
  );

  const chartData = useMemo(() => {
    if (!row) return [];
    return Array.from({ length: narm }, (_, i) => {
      const basketNum = i + 1;
      const isNull = row.nullBaskets.includes(basketNum);
      const isAlt = row.altBaskets.includes(basketNum);
      return {
        name: `B${basketNum}`,
        type1Error: isNull ? row.rejectRates[i] : null,
        power: isAlt ? row.rejectRates[i] : null,
      };
    });
  }, [row, narm]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-600">Scenario:</label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            {scenarios.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-600">Threshold:</label>
          <select
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            {thresholds.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {row ? (
        <>
          {/* Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-700 mb-1">
              Type I Error (null baskets) vs Power (alt baskets)
            </h4>
            <PerBasketChart data={chartData} />
          </div>

          {/* Summary Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 font-semibold">Basket</th>
                  <th className="border px-2 py-1 text-right font-semibold">True Rate</th>
                  <th className="border px-2 py-1 text-right font-semibold">Reject Rate</th>
                  <th className="border px-2 py-1 text-right font-semibold">Type</th>
                  <th className="border px-2 py-1 text-right font-semibold">Avg N</th>
                  <th className="border px-2 py-1 text-right font-semibold">SD N</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: narm }, (_, i) => {
                  const basketNum = i + 1;
                  const isNull = row.nullBaskets.includes(basketNum);
                  return (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border px-2 py-1 font-medium">B{basketNum}</td>
                      <td className="border px-2 py-1 text-right">{fmt(row.pTrue[i], 2)}</td>
                      <td className="border px-2 py-1 text-right font-semibold">{fmt(row.rejectRates[i])}</td>
                      <td className={`border px-2 py-1 text-right ${isNull ? "text-red-600" : "text-green-600"}`}>
                        {isNull ? "Null" : "Alt"}
                      </td>
                      <td className="border px-2 py-1 text-right">{fmt(row.avgPatients[i], 1)}</td>
                      <td className="border px-2 py-1 text-right">{fmt(row.sdPatients[i], 1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-400 text-center py-8">Select a scenario and threshold.</p>
      )}
    </div>
  );
}
