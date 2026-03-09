"use client";
import { ApiResponse, SimulationResult } from "@/lib/api";
import CodeBlock from "./ui/CodeBlock";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-bold text-gray-900 mt-0.5">
        {typeof value === "number" ? value.toFixed(4) : value}
      </div>
    </div>
  );
}

function ResultTable({ result }: { result: SimulationResult }) {
  const arms = result.armIndex || [];
  const hasInterim = result.interimCum1?.some((v) => v != null && !isNaN(v));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1.5 text-left font-semibold">Arm</th>
            <th className="border px-2 py-1.5 text-right font-semibold">p0</th>
            <th className="border px-2 py-1.5 text-right font-semibold">p1</th>
            <th className="border px-2 py-1.5 text-right font-semibold">True Rate</th>
            <th className="border px-2 py-1.5 text-right font-semibold">Threshold</th>
            <th className="border px-2 py-1.5 text-right font-semibold">Power</th>
            <th className="border px-2 py-1.5 text-right font-semibold">Bias</th>
            <th className="border px-2 py-1.5 text-right font-semibold">Bias SD</th>
            <th className="border px-2 py-1.5 text-right font-semibold">Avg N</th>
            <th className="border px-2 py-1.5 text-right font-semibold">SD N</th>
            {hasInterim && (
              <>
                <th className="border px-2 py-1.5 text-right font-semibold">P(Fut1)</th>
                <th className="border px-2 py-1.5 text-right font-semibold">P(Eff1)</th>
                <th className="border px-2 py-1.5 text-right font-semibold">P(Fut2)</th>
                <th className="border px-2 py-1.5 text-right font-semibold">P(Eff2)</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {arms.map((arm, i) => (
            <tr key={arm} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="border px-2 py-1 font-medium">{arm}</td>
              <td className="border px-2 py-1 text-right">{result.referenceRate?.[i]}</td>
              <td className="border px-2 py-1 text-right">{result.targetRate?.[i]}</td>
              <td className="border px-2 py-1 text-right">{result.trueRate?.[i]}</td>
              <td className="border px-2 py-1 text-right">{result.finalThreshold?.[i]?.toFixed(4)}</td>
              <td className="border px-2 py-1 text-right font-semibold">{result.powerPerArm?.[i]?.toFixed(4)}</td>
              <td className="border px-2 py-1 text-right">{result.bias?.[i]?.toFixed(4)}</td>
              <td className="border px-2 py-1 text-right">{result.biasSD?.[i]?.toFixed(4)}</td>
              <td className="border px-2 py-1 text-right">{result.avgPatients?.[i]?.toFixed(1)}</td>
              <td className="border px-2 py-1 text-right">{result.sdPatients?.[i]?.toFixed(1)}</td>
              {hasInterim && (
                <>
                  <td className="border px-2 py-1 text-right">{result.probFutility1?.[i]?.toFixed(4)}</td>
                  <td className="border px-2 py-1 text-right">{result.probEfficacy1?.[i]?.toFixed(4)}</td>
                  <td className="border px-2 py-1 text-right">{result.probFutility2?.[i]?.toFixed(4)}</td>
                  <td className="border px-2 py-1 text-right">{result.probEfficacy2?.[i]?.toFixed(4)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PowerChart({ result }: { result: SimulationResult }) {
  const data = result.armIndex.map((arm, i) => ({
    name: `Arm ${arm}`,
    Power: result.powerPerArm?.[i] ?? 0,
    "True Rate": result.trueRate?.[i] ?? 0,
    "Ref Rate": result.referenceRate?.[i] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Power" fill="#3b82f6" />
        <Bar dataKey="True Rate" fill="#10b981" />
        <Bar dataKey="Ref Rate" fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ResultPanel({ response }: { response: ApiResponse | null }) {
  if (!response) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-2">&#x1F4CA;</div>
          <p>Run a simulation to see results</p>
        </div>
      </div>
    );
  }

  if (!response.success) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-800">Error</h3>
          <p className="text-sm text-red-600 mt-1">{response.error}</p>
        </div>
      </div>
    );
  }

  const result = response.result!;

  return (
    <div className="p-4 space-y-4 overflow-auto">
      {/* Headline metrics */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="FWER" value={result.fwer} />
        <MetricCard label="FW-Power (any)" value={result.fwPower1} />
        <MetricCard label="FW-Power (all)" value={result.fwPower2} />
      </div>

      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">Power by Arm</h3>
        <PowerChart result={result} />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">Detailed Results</h3>
        <ResultTable result={result} />
      </div>

      {/* R Code */}
      {response.rCode && (
        <div>
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Reproducible R Code</h3>
          <CodeBlock code={response.rCode} />
        </div>
      )}
    </div>
  );
}
