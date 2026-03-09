"use client";
import { useState, useMemo } from "react";
import { BatchResultRow } from "@/types/batch";

function fmt(v: number | null | undefined, digits = 4): string {
  if (v === null || v === undefined) return "-";
  if (isNaN(v)) return "-";
  return v.toFixed(digits);
}

interface Props {
  results: BatchResultRow[];
  narm: number;
}

export default function ResultsTableTab({ results, narm }: Props) {
  const [scenarioFilter, setScenarioFilter] = useState("All");
  const [thresholdFilter, setThresholdFilter] = useState("All");

  const scenarios = useMemo(
    () => Array.from(new Set(results.map((r) => r.scenario))),
    [results]
  );
  const thresholds = useMemo(
    () => Array.from(new Set(results.map((r) => r.threshold))),
    [results]
  );

  const filtered = useMemo(() => {
    return results.filter(
      (r) =>
        (scenarioFilter === "All" || r.scenario === scenarioFilter) &&
        (thresholdFilter === "All" || r.threshold === thresholdFilter)
    );
  }, [results, scenarioFilter, thresholdFilter]);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-600">Scenario:</label>
          <select
            value={scenarioFilter}
            onChange={(e) => setScenarioFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="All">All</option>
            {scenarios.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-600">Threshold:</label>
          <select
            value={thresholdFilter}
            onChange={(e) => setThresholdFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="All">All</option>
            {thresholds.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1.5 text-left font-semibold">Scenario</th>
              <th className="border px-2 py-1.5 text-left font-semibold">Threshold</th>
              <th className="border px-2 py-1.5 text-right font-semibold">FWER</th>
              <th className="border px-2 py-1.5 text-right font-semibold">Disj. Power</th>
              <th className="border px-2 py-1.5 text-right font-semibold">Conj. Power</th>
              {Array.from({ length: narm }, (_, i) => (
                <th key={i} className="border px-2 py-1.5 text-right font-semibold">
                  B{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border px-2 py-1 font-medium">{r.scenario}</td>
                <td className="border px-2 py-1">{r.threshold}</td>
                <td className="border px-2 py-1 text-right">{fmt(r.fwer)}</td>
                <td className="border px-2 py-1 text-right">{fmt(r.disjPower)}</td>
                <td className="border px-2 py-1 text-right">{fmt(r.conjPower)}</td>
                {r.rejectRates.map((rate, j) => {
                  let bg = "";
                  if (rate < 0.1) bg = "bg-green-50";
                  else if (rate > 0.5) bg = "bg-red-50";
                  return (
                    <td key={j} className={`border px-2 py-1 text-right ${bg}`}>
                      {fmt(rate)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">No results match the current filters.</p>
      )}
    </div>
  );
}
