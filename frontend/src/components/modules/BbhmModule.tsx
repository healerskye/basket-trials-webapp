"use client";
import { useState } from "react";
import InputField from "../ui/InputField";
import CommonParams, { CommonState, defaultCommon } from "./CommonParams";
import { runBbhm, ApiResponse } from "@/lib/api";

interface Props {
  onResult: (r: ApiResponse) => void;
}

export default function BbhmModule({ onResult }: Props) {
  const [common, setCommon] = useState<CommonState>(defaultCommon());
  const [mu0, setMu0] = useState(-1.43);
  const [sigma0, setSigma0] = useState(10);
  const [lambda1, setLambda1] = useState(0.0005);
  const [lambda2, setLambda2] = useState(0.000005);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await runBbhm({ ...common, alpha: common.p0.map(() => 0.1), respRate: common.p0, nullScenario: false, mu0, sigma0, lambda1, lambda2 });
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
          BBHM Prior Parameters
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          Prior: mu ~ N(mu0, sigma0), sigma^2 ~ IG(lambda1, lambda2)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <InputField label="mu0" value={mu0} onChange={setMu0} step={0.01} help="Prior mean for mu" />
          <InputField label="sigma0 (variance)" value={sigma0} onChange={setSigma0} min={0.01} step={1} help="Prior variance for mu" />
          <InputField label="lambda1 (shape)" value={lambda1} onChange={setLambda1} min={0.00001} step={0.0001} help="Inverse-Gamma shape" />
          <InputField label="lambda2 (scale)" value={lambda2} onChange={setLambda2} min={0.000001} step={0.000001} help="Inverse-Gamma scale" />
        </div>
      </div>
      <button
        onClick={run}
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
      >
        {loading ? "Running BBHM Simulation..." : "Run BBHM Simulation"}
      </button>
    </div>
  );
}
