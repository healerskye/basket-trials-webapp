"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { BatchResultRow } from "@/types/batch";

const InterimChart = dynamic(() => import("@/components/charts/InterimChart"), { ssr: false });

interface Props {
  results: BatchResultRow[];
  narm: number;
  useInterim: boolean;
}

function fmt(v: number | null | undefined, digits = 4): string {
  if (v === null || v === undefined) return "-";
  return v.toFixed(digits);
}

export default function InterimTab({ results, narm, useInterim }: Props) {
  const scenarios = useMemo(
    () => Array.from(new Set(results.map((r) => r.scenario))),
    [results]
  );
  const thresholds = useMemo(
    () => Array.from(new Set(results.map((r) => r.threshold))),
    [results]
  );

  const [selScenario, setSelScenario] = useState(scenarios[0] ?? "");
  const [selThreshold, setSelThreshold] = useState(thresholds[0] ?? "");

  const row = useMemo(
    () => results.find((r) => r.scenario === selScenario && r.threshold === selThreshold),
    [results, selScenario, selThreshold]
  );

  const K = narm;

  const chartData = useMemo(() => {
    if (!row) return [];
    return Array.from({ length: K }, (_, i) => ({
      name: `B${i + 1}`,
      futility: row.futilityRates[i] ?? 0,
      efficacy: row.efficacyRates[i] ?? 0,
    }));
  }, [row, K]);

  if (!useInterim) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Interim analysis is not enabled.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <label className="text-xs">
          Scenario:
          <select
            className="ml-1 border rounded px-1 py-0.5 text-xs"
            value={selScenario}
            onChange={(e) => setSelScenario(e.target.value)}
          >
            {scenarios.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Threshold:
          <select
            className="ml-1 border rounded px-1 py-0.5 text-xs"
            value={selThreshold}
            onChange={(e) => setSelThreshold(e.target.value)}
          >
            {thresholds.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Chart */}
      {row ? (
        <InterimChart data={chartData} />
      ) : (
        <p className="text-xs text-gray-500">No data for selected combination.</p>
      )}

      {/* Summary Table */}
      {row && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">Basket</th>
                <th className="border px-2 py-1 text-center">Futility Rate</th>
                <th className="border px-2 py-1 text-center">Efficacy Rate</th>
                <th className="border px-2 py-1 text-center">Avg Patients</th>
                <th className="border px-2 py-1 text-center">SD Patients</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: K }, (_, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border px-2 py-1 font-medium">B{i + 1}</td>
                  <td className="border px-2 py-1 text-center">{fmt(row.futilityRates[i])}</td>
                  <td className="border px-2 py-1 text-center">{fmt(row.efficacyRates[i])}</td>
                  <td className="border px-2 py-1 text-center">{fmt(row.avgPatients[i], 1)}</td>
                  <td className="border px-2 py-1 text-center">{fmt(row.sdPatients[i], 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
