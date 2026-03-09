"use client";
import { useState } from "react";
import Header from "@/components/Header";
import TabNav, { TabId } from "@/components/TabNav";
import BbhmModule from "@/components/modules/BbhmModule";
import CbhmModule from "@/components/modules/CbhmModule";
import ExnexModule from "@/components/modules/ExnexModule";
import MuceModule from "@/components/modules/MuceModule";
import ResultPanel from "@/components/ResultPanel";
import { ApiResponse } from "@/lib/api";

export default function Home() {
  const [tab, setTab] = useState<TabId>("bbhm");
  const [results, setResults] = useState<Partial<Record<TabId, ApiResponse>>>({});

  const handleResult = (r: ApiResponse) => {
    setResults((prev) => ({ ...prev, [tab]: r }));
  };

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <TabNav active={tab} onSelect={setTab} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: inputs */}
        <aside className="w-full max-w-sm lg:max-w-md xl:max-w-lg shrink-0 overflow-auto border-r border-gray-200 bg-white">
          {tab === "bbhm" && <BbhmModule onResult={handleResult} />}
          {tab === "cbhm" && <CbhmModule onResult={handleResult} />}
          {tab === "exnex" && <ExnexModule onResult={handleResult} />}
          {tab === "muce" && <MuceModule onResult={handleResult} />}
        </aside>
        {/* Right: results */}
        <main className="flex-1 min-w-0 overflow-auto bg-gray-50">
          <ResultPanel response={results[tab] ?? null} />
        </main>
      </div>
    </div>
  );
}
