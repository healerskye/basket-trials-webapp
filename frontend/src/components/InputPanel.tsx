"use client";
import { TabId } from "./TabNav";
import CommonParams, { CommonState } from "./modules/CommonParams";
import ScenarioTable from "./ScenarioTable";
import ThresholdTable from "./ThresholdTable";
import InputField from "./ui/InputField";
import { Scenario, ThresholdConfig } from "@/types/batch";

// ── Design-specific prior renderers ─────────────────────────────────────────

interface PriorProps {
  params: Record<string, number>;
  onChange: (params: Record<string, number>) => void;
}

function BbhmPriors({ params, onChange }: PriorProps) {
  const set = (k: string, v: number) => onChange({ ...params, [k]: v });
  return (
    <div className="bg-purple-50 rounded-lg p-3">
      <h3 className="text-xs font-semibold text-purple-800 mb-2 uppercase tracking-wide">
        BBHM Prior Parameters
      </h3>
      <p className="text-xs text-gray-500 mb-2">
        Prior: mu ~ N(mu0, sigma0), sigma^2 ~ IG(lambda1, lambda2)
      </p>
      <div className="grid grid-cols-2 gap-2">
        <InputField label="mu0" value={params.mu0 ?? -1.43} onChange={(v) => set("mu0", v)} step={0.01} help="Prior mean for mu" />
        <InputField label="sigma0 (variance)" value={params.sigma0 ?? 10} onChange={(v) => set("sigma0", v)} min={0.01} step={1} help="Prior variance for mu" />
        <InputField label="lambda1 (shape)" value={params.lambda1 ?? 0.0005} onChange={(v) => set("lambda1", v)} min={0.00001} step={0.0001} help="Inverse-Gamma shape" />
        <InputField label="lambda2 (scale)" value={params.lambda2 ?? 0.000005} onChange={(v) => set("lambda2", v)} min={0.000001} step={0.000001} help="Inverse-Gamma scale" />
      </div>
    </div>
  );
}

function CbhmPriors({ params, onChange }: PriorProps) {
  const set = (k: string, v: number) => onChange({ ...params, [k]: v });
  return (
    <div className="bg-purple-50 rounded-lg p-3">
      <h3 className="text-xs font-semibold text-purple-800 mb-2 uppercase tracking-wide">
        CBHM Prior Parameters
      </h3>
      <p className="text-xs text-gray-500 mb-2">
        Prior: mu ~ N(mu0, sigma0), sigma^2 = exp(a + b*T)
      </p>
      <div className="grid grid-cols-2 gap-2">
        <InputField label="mu0" value={params.mu0 ?? -2.09} onChange={(v) => set("mu0", v)} step={0.01} help="Prior mean for mu" />
        <InputField label="sigma0 (variance)" value={params.sigma0 ?? 10} onChange={(v) => set("sigma0", v)} min={0.01} step={1} help="Prior variance for mu" />
        <InputField label="var_min" value={params.var_min ?? 1} onChange={(v) => set("var_min", v)} min={0.01} step={0.1} help="Small variance guess" />
        <InputField label="var_max" value={params.var_max ?? 80} onChange={(v) => set("var_max", v)} min={1} step={1} help="Large variance guess" />
      </div>
    </div>
  );
}

function ExnexPriors({ params, onChange }: PriorProps) {
  const set = (k: string, v: number) => onChange({ ...params, [k]: v });
  return (
    <div className="bg-purple-50 rounded-lg p-3">
      <h3 className="text-xs font-semibold text-purple-800 mb-2 uppercase tracking-wide">
        EXNEX Prior Parameters
      </h3>
      <p className="text-xs text-gray-500 mb-2">
        EX components: mu ~ N(mu0, sigma0), tau ~ HalfNormal(scale). NEX: N(m, v)
      </p>
      <div className="grid grid-cols-2 gap-2">
        <InputField label="EX1: mu0" value={params.mu0_1 ?? -2.09} onChange={(v) => set("mu0_1", v)} step={0.01} help="EX component 1 mean" />
        <InputField label="EX1: sigma0" value={params.sigma0_1 ?? 8.4} onChange={(v) => set("sigma0_1", v)} min={0.01} step={0.1} help="EX component 1 variance" />
        <InputField label="EX2: mu0" value={params.mu0_2 ?? -0.66} onChange={(v) => set("mu0_2", v)} step={0.01} help="EX component 2 mean" />
        <InputField label="EX2: sigma0" value={params.sigma0_2 ?? 2.42} onChange={(v) => set("sigma0_2", v)} min={0.01} step={0.1} help="EX component 2 variance" />
        <InputField label="EX1: tau scale" value={params.scale1 ?? 1} onChange={(v) => set("scale1", v)} min={0.01} step={0.1} />
        <InputField label="EX2: tau scale" value={params.scale2 ?? 1} onChange={(v) => set("scale2", v)} min={0.01} step={0.1} />
        <InputField label="NEX: m" value={params.nexM ?? -1.59} onChange={(v) => set("nexM", v)} step={0.01} help="NEX prior mean" />
        <InputField label="NEX: v" value={params.nexV ?? 7.09} onChange={(v) => set("nexV", v)} min={0.01} step={0.1} help="NEX prior variance" />
      </div>
    </div>
  );
}

function MucePriors({ params, onChange }: PriorProps) {
  const set = (k: string, v: number) => onChange({ ...params, [k]: v });
  return (
    <div className="bg-purple-50 rounded-lg p-3">
      <h3 className="text-xs font-semibold text-purple-800 mb-2 uppercase tracking-wide">
        MUCE Prior Parameters
      </h3>
      <p className="text-xs text-gray-500 mb-2">
        theta ~ Cauchy(scale), Z ~ N(xi+eta, sigma.z), xi ~ N(mu1,sigma1), eta ~ N(mu2,sigma2)
      </p>
      <div className="grid grid-cols-3 gap-2">
        <InputField label="scale1 (H0)" value={params.scale1 ?? 2.5} onChange={(v) => set("scale1", v)} min={0.01} step={0.1} help="Cauchy scale for theta under H0" />
        <InputField label="scale3 (H1)" value={params.scale3 ?? 2.5} onChange={(v) => set("scale3", v)} min={0.01} step={0.1} help="Cauchy scale for theta under H1" />
        <InputField label="sigma.z" value={params["sigma.z"] ?? 1} onChange={(v) => set("sigma.z", v)} min={0.01} step={0.1} help="SD for Z" />
        <InputField label="sigma.xi" value={params["sigma.xi"] ?? 1} onChange={(v) => set("sigma.xi", v)} min={0.01} step={0.1} />
        <InputField label="sigma.eta" value={params["sigma.eta"] ?? 1} onChange={(v) => set("sigma.eta", v)} min={0.01} step={0.1} />
        <InputField label="mu1" value={params.mu1 ?? 0} onChange={(v) => set("mu1", v)} step={0.1} help="Prior mean for xi0" />
        <InputField label="sigma1" value={params.sigma1 ?? 1} onChange={(v) => set("sigma1", v)} min={0.01} step={0.1} help="Prior SD for xi0" />
        <InputField label="mu2" value={params.mu2 ?? 0} onChange={(v) => set("mu2", v)} step={0.1} help="Prior mean for eta0" />
        <InputField label="sigma2" value={params.sigma2 ?? 1} onChange={(v) => set("sigma2", v)} min={0.01} step={0.1} help="Prior SD for eta0" />
      </div>
    </div>
  );
}

// ── Default design params ───────────────────────────────────────────────────

export function defaultDesignParams(tab: TabId): Record<string, number> {
  switch (tab) {
    case "bbhm":
      return { mu0: -1.43, sigma0: 10, lambda1: 0.0005, lambda2: 0.000005 };
    case "cbhm":
      return { mu0: -2.09, sigma0: 10, var_min: 1, var_max: 80 };
    case "exnex":
      return { mu0_1: -2.09, sigma0_1: 8.4, mu0_2: -0.66, sigma0_2: 2.42, scale1: 1, scale2: 1, nexM: -1.59, nexV: 7.09 };
    case "muce":
      return { scale1: 2.5, scale3: 2.5, "sigma.z": 1, "sigma.xi": 1, "sigma.eta": 1, mu1: 0, sigma1: 1, mu2: 0, sigma2: 1 };
  }
}

// ── Main InputPanel ─────────────────────────────────────────────────────────

interface Props {
  tab: TabId;
  common: CommonState;
  onCommonChange: (s: CommonState) => void;
  designParams: Record<string, number>;
  onDesignParamsChange: (p: Record<string, number>) => void;
  scenarios: Scenario[];
  onScenariosChange: (s: Scenario[]) => void;
  thresholds: ThresholdConfig[];
  onThresholdsChange: (t: ThresholdConfig[]) => void;
  onRun: () => void;
  loading: boolean;
}

export default function InputPanel({
  tab,
  common,
  onCommonChange,
  designParams,
  onDesignParamsChange,
  scenarios,
  onScenariosChange,
  thresholds,
  onThresholdsChange,
  onRun,
  loading,
}: Props) {
  const PriorComponent = {
    bbhm: BbhmPriors,
    cbhm: CbhmPriors,
    exnex: ExnexPriors,
    muce: MucePriors,
  }[tab];

  return (
    <div className="p-4 space-y-4 overflow-auto">
      <CommonParams state={common} onChange={onCommonChange} />
      <PriorComponent params={designParams} onChange={onDesignParamsChange} />
      <ScenarioTable scenarios={scenarios} onChange={onScenariosChange} narm={common.narm} />
      <ThresholdTable thresholds={thresholds} onChange={onThresholdsChange} narm={common.narm} />
      <button
        onClick={onRun}
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
      >
        {loading ? "Running Batch Simulation..." : `Run ${tab.toUpperCase()} Batch Simulation`}
      </button>
    </div>
  );
}
