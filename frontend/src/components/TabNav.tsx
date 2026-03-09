"use client";

export type TabId = "bbhm" | "cbhm" | "exnex" | "muce";

const tabs: { id: TabId; label: string; description: string }[] = [
  { id: "bbhm", label: "BBHM", description: "Bayesian Hierarchical Model" },
  { id: "cbhm", label: "CBHM", description: "Calibrated BHM" },
  { id: "exnex", label: "EXNEX", description: "EX-NEX Model" },
  { id: "muce", label: "MUCE", description: "Multi-Component Exchangeability" },
];

interface TabNavProps {
  active: TabId;
  onSelect: (id: TabId) => void;
}

export default function TabNav({ active, onSelect }: TabNavProps) {
  return (
    <div className="flex border-b border-gray-200 bg-white px-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            active === t.id
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
          title={t.description}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
