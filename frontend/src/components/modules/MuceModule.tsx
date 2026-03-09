"use client";
import { useState } from "react";
import InputField from "../ui/InputField";
import CommonParams, { CommonState, defaultCommon } from "./CommonParams";
import { runMuce, ApiResponse } from "@/lib/api";

interface Props {
  onResult: (r: ApiResponse) => void;
}

export default function MuceModule({ onResult }: Props) {
  const [common, setCommon] = useState<CommonState>(defaultCommon());
  const [scale1, setScale1] = useState(2.5);
  const [scale3, setScale3] = useState(2.5);
  const [sigmaZ, setSigmaZ] = useState(1);
  const [sigmaXi, setSigmaXi] = useState(1);
  const [sigmaEta, setSigmaEta] = useState(1);
  const [mu1, setMu1] = useState(0);
  const [sigma1, setSigma1] = useState(1);
  const [mu2, setMu2] = useState(0);
  const [sigma2, setSigma2] = useState(1);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await runMuce({
        ...common, alpha: common.p0.map(() => 0.1), respRate: common.p0, nullScenario: false,
        scale1, scale3, sigmaZ, sigmaXi, sigmaEta,
        mu1, sigma1, mu2, sigma2,
      });
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
          MUCE Prior Parameters
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          theta ~ Cauchy(scale), Z ~ N(xi+eta, sigma.z), xi ~ N(mu1,sigma1), eta ~ N(mu2,sigma2)
        </p>
        <div className="grid grid-cols-3 gap-2">
          <InputField label="scale1 (H0)" value={scale1} onChange={setScale1} min={0.01} step={0.1} help="Cauchy scale for theta under H0" />
          <InputField label="scale3 (H1)" value={scale3} onChange={setScale3} min={0.01} step={0.1} help="Cauchy scale for theta under H1" />
          <InputField label="sigma.z" value={sigmaZ} onChange={setSigmaZ} min={0.01} step={0.1} help="SD for Z" />
          <InputField label="sigma.xi" value={sigmaXi} onChange={setSigmaXi} min={0.01} step={0.1} />
          <InputField label="sigma.eta" value={sigmaEta} onChange={setSigmaEta} min={0.01} step={0.1} />
          <InputField label="mu1" value={mu1} onChange={setMu1} step={0.1} help="Prior mean for xi0" />
          <InputField label="sigma1" value={sigma1} onChange={setSigma1} min={0.01} step={0.1} help="Prior SD for xi0" />
          <InputField label="mu2" value={mu2} onChange={setMu2} step={0.1} help="Prior mean for eta0" />
          <InputField label="sigma2" value={sigma2} onChange={setSigma2} min={0.01} step={0.1} help="Prior SD for eta0" />
        </div>
      </div>
      <button
        onClick={run}
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
      >
        {loading ? "Running MUCE Simulation..." : "Run MUCE Simulation"}
      </button>
    </div>
  );
}
