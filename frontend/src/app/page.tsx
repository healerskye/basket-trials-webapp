"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import TabNav, { TabId } from "@/components/TabNav";
import InputPanel, { defaultDesignParams } from "@/components/InputPanel";
import ResultPanel from "@/components/ResultPanel";
import { defaultCommon, CommonState } from "@/components/modules/CommonParams";
import { generateDefaultScenarios } from "@/components/ScenarioTable";
import { generateDefaultThresholds } from "@/components/ThresholdTable";
import { Scenario, ThresholdConfig, BatchApiResponse } from "@/types/batch";
import { runBatch } from "@/lib/api";

export default function Home() {
  const [tab, setTab] = useState<TabId>("bbhm");
  const [common, setCommon] = useState<CommonState>(defaultCommon());
  const [designParams, setDesignParams] = useState<Record<string, number>>(
    defaultDesignParams("bbhm")
  );
  const [scenarios, setScenarios] = useState<Scenario[]>(
    generateDefaultScenarios(4, Array(4).fill(0.15), Array(4).fill(0.35))
  );
  const [thresholds, setThresholds] = useState<ThresholdConfig[]>(
    generateDefaultThresholds(4)
  );
  const [batchResults, setBatchResults] = useState<BatchApiResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  // Reset design params when tab changes
  useEffect(() => {
    setDesignParams(defaultDesignParams(tab));
  }, [tab]);

  // Auto-regenerate scenarios/thresholds when narm/p0/p1 change
  useEffect(() => {
    const { narm, p0, p1 } = common;
    setScenarios((prev) => {
      // Resize existing scenarios to match narm
      return prev.map((s) => ({
        ...s,
        respRates:
          s.respRates.length === narm
            ? s.respRates
            : Array(narm)
                .fill(0.15)
                .map((d, i) => s.respRates[i] ?? d),
      }));
    });
    setThresholds((prev) => {
      return prev.map((t) => ({
        ...t,
        values:
          t.values.length === narm
            ? t.values
            : Array(narm)
                .fill(0.9)
                .map((d, i) => t.values[i] ?? d),
      }));
    });
  }, [common.narm]);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setBatchResults(null);
    try {
      const params: Record<string, unknown> = {
        seed: common.seed,
        simN: common.simN,
        narm: common.narm,
        p0: common.p0,
        p1: common.p1,
        samplesize: common.samplesize,
        speed: common.speed,
        futstop: common.futstop,
        futthr: common.futthr,
        effstop: common.effstop,
        effthr: common.effthr,
        scenarios: scenarios.map((s) => ({
          name: s.name,
          respRate: s.respRates,
        })),
        thresholds: thresholds.map((t) => ({
          name: t.name,
          values: t.values,
        })),
        designParams,
      };
      const res = await runBatch(tab, params);
      setBatchResults(res);
    } catch (e) {
      setBatchResults({ success: false, error: String(e) });
    }
    setLoading(false);
  }, [tab, common, scenarios, thresholds, designParams]);

  const useInterim = common.futstop === 1 || common.effstop === 1;

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <TabNav active={tab} onSelect={setTab} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: inputs */}
        <aside className="w-full max-w-sm lg:max-w-md xl:max-w-lg shrink-0 overflow-auto border-r border-gray-200 bg-white">
          <InputPanel
            tab={tab}
            common={common}
            onCommonChange={setCommon}
            designParams={designParams}
            onDesignParamsChange={setDesignParams}
            scenarios={scenarios}
            onScenariosChange={setScenarios}
            thresholds={thresholds}
            onThresholdsChange={setThresholds}
            onRun={handleRun}
            loading={loading}
          />
        </aside>
        {/* Right: results */}
        <main className="flex-1 min-w-0 overflow-hidden bg-gray-50">
          <ResultPanel
            response={batchResults}
            narm={common.narm}
            scenarios={scenarios}
            thresholds={thresholds}
            useInterim={useInterim}
          />
        </main>
      </div>
    </div>
  );
}
