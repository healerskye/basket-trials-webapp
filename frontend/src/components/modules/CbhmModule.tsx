"use client";
import { useState } from "react";
import InputField from "../ui/InputField";
import CommonParams, { CommonState, defaultCommon } from "./CommonParams";
import { runCbhm, ApiResponse } from "@/lib/api";

interface Props {
  onResult: (r: ApiResponse) => void;
}

export default function CbhmModule({ onResult }: Props) {
  const [common, setCommon] = useState<CommonState>(defaultCommon());
  const [mu0, setMu0] = useState(-2.09);
  const [sigma0, setSigma0] = useState(10);
  const [varMin, setVarMin] = useState(1);
  const [varMax, setVarMax] = useState(80);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await runCbhm({ ...common, mu0, sigma0, varMin, varMax });
      onResult(res);
    } catch (e) {
      onResult({ success: false, error: String(e) });
    }
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-4 overflow-auto">
      <CommonParams state={common} onChange={setCommon} />
      <div className="bg-purple-50 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-purple-800 mb-2 uppercase tracking-wide">
          CBHM Prior Parameters
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          Prior: mu ~ N(mu0, sigma0), sigma^2 = exp(a + b*T)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <InputField label="mu0" value={mu0} onChange={setMu0} step={0.01} help="Prior mean for mu" />
          <InputField label="sigma0 (variance)" value={sigma0} onChange={setSigma0} min={0.01} step={1} help="Prior variance for mu" />
          <InputField label="var_min" value={varMin} onChange={setVarMin} min={0.01} step={0.1} help="Small variance guess" />
          <InputField label="var_max" value={varMax} onChange={setVarMax} min={1} step={1} help="Large variance guess" />
        </div>
      </div>
      <button
        onClick={run}
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
      >
        {loading ? "Running CBHM Simulation..." : "Run CBHM Simulation"}
      </button>
    </div>
  );
}
