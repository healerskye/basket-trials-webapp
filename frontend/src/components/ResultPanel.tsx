"use client";
import { useState } from "react";
import { BatchApiResponse, Scenario, ThresholdConfig } from "@/types/batch";
import ResultTabNav, { ResultTabId } from "./ResultTabNav";
import ScenariosRulesTab from "./tabs/ScenariosRulesTab";
import ResultsTableTab from "./tabs/ResultsTableTab";
import GlobalMetricsTab from "./tabs/GlobalMetricsTab";
import PerBasketTab from "./tabs/PerBasketTab";
import InterimTab from "./tabs/InterimTab";

interface Props {
  response: BatchApiResponse | null;
  narm: number;
  scenarios: Scenario[];
  thresholds: ThresholdConfig[];
  useInterim: boolean;
}

export default function ResultPanel({
  response,
  narm,
  scenarios,
  thresholds,
  useInterim,
}: Props) {
  const [activeTab, setActiveTab] = useState<ResultTabId>("scenarios");

  if (!response) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <div className="text-center">
          <p className="text-4xl mb-2">&#x1F4CA;</p>
          <p>Run a batch simulation to see results</p>
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

  const results = response.results ?? [];

  return (
    <div className="flex flex-col h-full">
      <ResultTabNav active={activeTab} onSelect={setActiveTab} />
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "scenarios" && (
          <ScenariosRulesTab
            scenarios={scenarios}
            thresholds={thresholds}
            narm={narm}
          />
        )}
        {activeTab === "results" && (
          <ResultsTableTab results={results} narm={narm} />
        )}
        {activeTab === "global" && (
          <GlobalMetricsTab results={results} thresholds={thresholds} />
        )}
        {activeTab === "perbasket" && (
          <PerBasketTab results={results} narm={narm} />
        )}
        {activeTab === "interim" && (
          <InterimTab results={results} narm={narm} useInterim={useInterim} />
        )}
      </div>
    </div>
  );
}
