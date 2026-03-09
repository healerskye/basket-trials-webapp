"use client";
import { useState } from "react";
import InputField from "../ui/InputField";
import CommonParams, { CommonState, defaultCommon } from "./CommonParams";
import { runExnex, ApiResponse } from "@/lib/api";

interface Props {
  onResult: (r: ApiResponse) => void;
}

export default function ExnexModule({ onResult }: Props) {
  const [common, setCommon] = useState<CommonState>(defaultCommon());
  const [mu0_1, setMu01] = useState(-2.09);
  const [sigma0_1, setSigma01] = useState(8.4);
  const [mu0_2, setMu02] = useState(-0.66);
  const [sigma0_2, setSigma02] = useState(2.42);
  const [scale1, setScale1] = useState(1);
  const [scale2, setScale2] = useState(1);
  const [nexM, setNexM] = useState(-1.59);
  const [nexV, setNexV] = useState(7.09);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await runExnex({
        ...common, mu0_1, sigma0_1, mu0_2, sigma0_2,
        scale1, scale2, nexM, nexV,
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
          EXNEX Prior Parameters
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          EX components: mu ~ N(mu0, sigma0), tau ~ HalfNormal(scale). NEX: N(m, v)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <InputField label="EX1: mu0" value={mu0_1} onChange={setMu01} step={0.01} help="EX component 1 mean" />
          <InputField label="EX1: sigma0" value={sigma0_1} onChange={setSigma01} min={0.01} step={0.1} help="EX component 1 variance" />
          <InputField label="EX2: mu0" value={mu0_2} onChange={setMu02} step={0.01} help="EX component 2 mean" />
          <InputField label="EX2: sigma0" value={sigma0_2} onChange={setSigma02} min={0.01} step={0.1} help="EX component 2 variance" />
          <InputField label="EX1: tau scale" value={scale1} onChange={setScale1} min={0.01} step={0.1} />
          <InputField label="EX2: tau scale" value={scale2} onChange={setScale2} min={0.01} step={0.1} />
          <InputField label="NEX: m" value={nexM} onChange={setNexM} step={0.01} help="NEX prior mean" />
          <InputField label="NEX: v" value={nexV} onChange={setNexV} min={0.01} step={0.1} help="NEX prior variance" />
        </div>
      </div>
      <button
        onClick={run}
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
      >
        {loading ? "Running EXNEX Simulation..." : "Run EXNEX Simulation"}
      </button>
    </div>
  );
}
