"use client";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { BatchResultRow, ThresholdConfig } from "@/types/batch";

const MetricBarChart = dynamic(
  () => import("@/components/charts/MetricBarChart"),
  { ssr: false }
);

interface Props {
  results: BatchResultRow[];
  thresholds: ThresholdConfig[];
}

export default function GlobalMetricsTab({ results, thresholds }: Props) {
  const thresholdNames = useMemo(
    () => Array.from(new Set(results.map((r) => r.threshold))),
    [results]
  );
  const [selectedThreshold, setSelectedThreshold] = useState(
    thresholdNames[0] ?? ""
  );

  const filtered = useMemo(
    () => results.filter((r) => r.threshold === selectedThreshold),
    [results, selectedThreshold]
  );

  const fwerData = filtered
    .filter((r) => r.fwer !== null)
    .map((r) => ({ name: r.scenario, value: r.fwer! }));

  const disjData = filtered
    .filter((r) => r.disjPower !== null)
    .map((r) => ({ name: r.scenario, value: r.disjPower! }));

  const conjData = filtered
    .filter((r) => r.conjPower !== null)
    .map((r) => ({ name: r.scenario, value: r.conjPower! }));

  return (
    <div className="space-y-4">
      {/* Threshold filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600">Threshold:</label>
        <select
          value={selectedThreshold}
          onChange={(e) => setSelectedThreshold(e.target.value)}
          className="text-xs border border-gray-300 rounded px-2 py-1"
        >
          {thresholdNames.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Metric definitions */}
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
        <p><strong>FWER:</strong> Probability of at least one false positive among null baskets</p>
        <p><strong>Disjunctive Power:</strong> Probability of at least one true positive among alternative baskets</p>
        <p><strong>Conjunctive Power:</strong> Probability that all alternative baskets are correctly identified</p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          {fwerData.length > 0 ? (
            <MetricBarChart data={fwerData} color="#4E79A7" title="FWER" referenceLine={0.1} />
          ) : (
            <div className="text-xs text-gray-400 text-center py-8">
              <p className="font-semibold">FWER</p>
              <p>N/A (no null baskets)</p>
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          {disjData.length > 0 ? (
            <MetricBarChart data={disjData} color="#59A14F" title="Disjunctive Power" />
          ) : (
            <div className="text-xs text-gray-400 text-center py-8">
              <p className="font-semibold">Disjunctive Power</p>
              <p>N/A (no alternative baskets)</p>
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          {conjData.length > 0 ? (
            <MetricBarChart data={conjData} color="#F28E2B" title="Conjunctive Power" />
          ) : (
            <div className="text-xs text-gray-400 text-center py-8">
              <p className="font-semibold">Conjunctive Power</p>
              <p>N/A (no alternative baskets)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
